import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ChevronDown, ChevronUp, LifeBuoy, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { care } from '../../src/lib/apis/care';
import { useAuth } from '../../src/context/AuthContext';
import { Card, ErrorState, IconTile, ListSkeleton, Row, Screen, SearchBar, Section, Segmented, space, T, Tap, useTheme, radius, type, haptic } from '../../src/ds';

type Turn = { role: 'user' | 'assistant'; content: string; id?: string; feedback?: boolean; error?: boolean };
const SUGGESTIONS = {
  staff: ['Expense "Needs another approver" kyun aa raha hai?', 'Duplicate project kaise delete karun?', 'DISCOM steps kaise update karte hain?', 'Customer ko payment reminder kaise bhejun?'],
  customer: ['Net-metering ke steps kaise complete honge?', 'Mera warranty card kahan milega?', 'Service request kaise raise karun?'],
};

/** Help: the SolarOS guide (same text the web Help uses) and, when switched on, an AI that answers from it. */
export default function HelpScreen() {
  const router = useRouter();
  const p = useTheme();
  const { user } = useAuth();
  const audience = user?.role === 'CUSTOMER' ? 'customer' : 'staff';
  const guide = useQuery({ queryKey: ['help', 'guide', audience], queryFn: care.guide, staleTime: 30 * 60_000 });
  const status = useQuery({ queryKey: ['help', 'ai'], queryFn: care.assistantStatus, staleTime: 5 * 60_000 });
  const ai = !!status.data?.ai;
  const [view, setView] = useState<'ask' | 'guide'>('guide');
  useEffect(() => { if (ai) setView('ask'); }, [ai]);

  return (
    <Screen title="Help" subtitle={ai ? 'Ask a question or read the guide' : 'How SolarOS works'} back>
      {ai ? <Segmented value={view} onChange={setView} options={[{ value: 'ask', label: 'Ask' }, { value: 'guide', label: 'Guide' }]} /> : null}
      {view === 'ask' && ai ? <Ask audience={audience} /> : <Guide sections={guide.data?.sections} loading={guide.isPending} error={guide.error?.message} onRetry={() => void guide.refetch()} />}
      {view === 'guide' && audience === 'staff' ? (
        <Section header="Need personal help">
          <Row icon={<IconTile tone="blue" icon={<LifeBuoy size={17} color={p.blue} />} />} title="Contact SolarOS support" subtitle="Create a ticket and continue the conversation in the app" onPress={() => router.push('/support')} />
        </Section>
      ) : null}
    </Screen>
  );
}

function Guide({ sections, loading, error, onRetry }: { sections?: { id: string; title: string; body: string }[]; loading: boolean; error?: string; onRetry: () => void }) {
  const p = useTheme();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const visible = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!sections) return [];
    if (!words.length) return sections;
    return sections.map((s) => ({ s, score: words.reduce((n, w) => n + (s.title.toLowerCase().includes(w) ? 3 : 0) + (s.body.toLowerCase().includes(w) ? 1 : 0), 0) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.s);
  }, [sections, q]);
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <ListSkeleton rows={6} avatar={false} />;
  return (
    <>
      <SearchBar value={q} onChange={setQ} placeholder="Search help (refund, DISCOM, approval…)" />
      <View style={{ gap: space.m }}>
        {visible.map((s) => {
          const expanded = open === s.id || q.trim().length > 1;
          return (
            <Card key={s.id} padded={false}>
              <Tap onPress={() => setOpen(open === s.id ? '' : s.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: space.l, gap: space.m }} accessibilityRole="button" accessibilityState={{ expanded }}>
                <T variant="headline" style={{ flex: 1 }}>{s.title}</T>
                {expanded ? <ChevronUp size={18} color={p.secondary} /> : <ChevronDown size={18} color={p.secondary} />}
              </Tap>
              {expanded ? (
                <View style={{ paddingHorizontal: space.l, paddingBottom: space.l, gap: space.s }}>
                  {s.body.split('\n').filter((l) => l.trim()).map((line, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: space.s, paddingLeft: /^\s{2,}- /.test(line) ? space.l : 0 }}>
                      <T variant="subhead" color="secondary">•</T>
                      <T variant="subhead" color="secondary" style={{ flex: 1 }}>{line.replace(/^\s*- /, '')}</T>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
      {!visible.length ? <T variant="body" color="secondary" align="center">Nothing matches “{q}”.</T> : null}
    </>
  );
}

function Ask({ audience }: { audience: 'staff' | 'customer' }) {
  const p = useTheme();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history = turns.filter((t) => !t.error).map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: 'user', content: question }]);
    setDraft('');
    setBusy(true);
    try {
      const r = await care.ask(question, history, 'app');
      setTurns((t) => [...t, { role: 'assistant', content: r.answer, id: r.id }]);
      haptic.light();
    } catch (e: any) {
      setTurns((t) => [...t, { role: 'assistant', content: e.message || 'Could not get an answer. Try the Guide.', error: true }]);
    } finally {
      setBusy(false);
    }
  };
  const rate = (i: number, helpful: boolean) => {
    const t = turns[i];
    if (!t.id || t.feedback !== undefined) return;
    setTurns((all) => all.map((x, j) => (j === i ? { ...x, feedback: helpful } : x)));
    care.feedback(t.id, helpful).catch(() => {});
  };
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: space.m }} accessibilityLiveRegion="polite">
        {!turns.length ? (
          <View style={{ gap: space.s }}>
            <T variant="subhead" color="secondary">SolarOS kaise kaam karta hai, kuch bhi poochiye — Hindi, Hinglish ya English mein.</T>
            {SUGGESTIONS[audience].map((s) => (
              <Tap key={s} onPress={() => void ask(s)} style={{ padding: space.m, borderRadius: radius.m, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.separator }}>
                <T variant="subhead">{s}</T>
              </Tap>
            ))}
          </View>
        ) : null}
        {turns.map((t, i) => (
          <View key={i} style={{ alignItems: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={{ maxWidth: '92%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: t.role === 'user' ? p.accent : t.error ? p.redSoft : p.surface }}>
              <T variant="body" style={{ color: t.role === 'user' ? p.onAccent : t.error ? p.red : p.label }}>{t.content}</T>
              {t.role === 'assistant' && t.id ? (
                <View style={{ flexDirection: 'row', gap: space.s, marginTop: 6 }}>
                  {t.feedback === undefined ? (
                    <>
                      <Tap onPress={() => rate(i, true)} accessibilityLabel="Helpful" style={{ padding: 6 }}><ThumbsUp size={16} color={p.secondary} /></Tap>
                      <Tap onPress={() => rate(i, false)} accessibilityLabel="Not helpful" style={{ padding: 6 }}><ThumbsDown size={16} color={p.secondary} /></Tap>
                    </>
                  ) : <T variant="caption" color="secondary">Thanks for the feedback</T>}
                </View>
              ) : null}
            </View>
          </View>
        ))}
        {busy ? <T variant="subhead" color="secondary">Soch raha hoon…</T> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.s }}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Apna sawaal likhiye…" placeholderTextColor={p.tertiary} multiline maxLength={1500} accessibilityLabel="Your question"
          style={[type.body, { flex: 1, maxHeight: 120, color: p.label, backgroundColor: p.surface, borderRadius: 20, borderWidth: 0.5, borderColor: p.separator, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 }]} />
        <Tap onPress={() => void ask(draft)} disabled={busy || !draft.trim()} accessibilityLabel="Send" scaleTo={0.9}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: draft.trim() ? p.accent : p.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowUp size={20} color={draft.trim() ? p.onAccent : p.secondary} strokeWidth={2.8} />
        </Tap>
      </View>
      <T variant="caption" color="secondary">AI answers can be wrong — check the Guide for important steps.</T>
    </View>
  );
}
