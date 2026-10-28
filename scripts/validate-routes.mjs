import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'app');
const sourceRoots = [appRoot, join(root, 'src', 'components'), join(root, 'src', 'features')];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function routeRegex(file) {
  let path = relative(appRoot, file).split(sep).join('/').replace(/\.(?:tsx?|jsx?)$/, '');
  const parts = path.split('/').filter((part) => part && !/^\(.+\)$/.test(part));
  if (parts.at(-1) === '_layout') return null;
  if (parts.at(-1) === 'index') parts.pop();

  const pattern = parts.map((part) => {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return '.*';
    if (/^\[\.\.\..+\]$/.test(part)) return '.+';
    if (/^\[.+\]$/.test(part)) return '[^/]+';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');

  return new RegExp(`^/${pattern}$`);
}

const routes = walk(appRoot)
  .filter((file) => sourceExtensions.has(extname(file)))
  .map(routeRegex)
  .filter(Boolean);

const referencePatterns = [
  /\b(?:router\.(?:push|replace)|go)\(\s*['"`]([^'"`]+)['"`]/g,
  /\b(?:path|pathname|href)\s*:\s*['"`]([^'"`]+)['"`]/g,
];

const unresolved = new Map();

for (const file of sourceRoots.flatMap(walk).filter((item) => sourceExtensions.has(extname(item)))) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of referencePatterns) {
    for (const match of source.matchAll(pattern)) {
      const raw = match[1];
      if (!raw.startsWith('/') || raw.startsWith('/api/')) continue;
      const path = (raw.split(/[?#]/, 1)[0].replace(/\/\([^/]+\)/g, '').replace(/\/$/, '') || '/');
      if (routes.some((route) => route.test(path))) continue;
      const locations = unresolved.get(path) ?? [];
      locations.push(relative(root, file).split(sep).join('/'));
      unresolved.set(path, locations);
    }
  }
}

if (unresolved.size) {
  console.error('Unresolved Expo Router destinations:');
  for (const [path, files] of [...unresolved].sort(([a], [b]) => a.localeCompare(b))) {
    console.error(`  ${path} <- ${[...new Set(files)].join(', ')}`);
  }
  process.exit(1);
}

console.log(`Validated ${routes.length} Expo routes; all static navigation destinations resolve.`);
