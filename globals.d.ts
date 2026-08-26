// Metro/NativeWind resolves the CSS entry at bundle time; TypeScript needs a
// declaration so the side-effect import in app/_layout.tsx typechecks.
declare module '*.css';
