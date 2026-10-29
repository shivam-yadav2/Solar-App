import React, { useState } from 'react';
import { Search, UserRound, Wrench } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/query';
import { Badge, EmptyState, ErrorState, IconTile, ListSkeleton, Row, Screen, SearchBar, Section, useTheme } from '../../src/ds';

export default function PlatformSearchScreen() {
  const p = useTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const res = useApi(['saas', 'search', q], () => api.searchPlatform(q), { enabled: q.length > 1 });
  const users: any[] = res.data?.users || [];
  const tickets: any[] = res.data?.complaints || [];
  return (
    <Screen title="Search" large={false} back>
      <SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Email, name or ticket number" autoFocus />
      {q.length < 2 ? <EmptyState icon={<Search size={44} color={p.tertiary} />} title="Search every company" message="Find users and service tickets across all workspaces." />
        : res.loading ? <ListSkeleton rows={4} /> : res.error ? <ErrorState message={res.error} onRetry={res.refresh} />
        : users.length + tickets.length === 0 ? <EmptyState title="No results" message={`Nothing found for “${q}”.`} /> : (
          <>
            {users.length ? (
              <Section header={`Users · ${users.length}`}>
                {users.map((u) => <Row key={u.id} icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={u.username} subtitle={`${u.email} · ${u.tenantName || u.tenantSlug || 'Platform'}`} accessory={u.isActive === false ? <Badge text="Inactive" tone="gray" /> : undefined} />)}
              </Section>
            ) : null}
            {tickets.length ? (
              <Section header={`Service tickets · ${tickets.length}`}>
                {tickets.map((t) => <Row key={t.id} icon={<IconTile icon={<Wrench size={17} color={p.orange} />} tone="orange" />} title={t.subject} subtitle={`${t.customId} · ${t.tenantName || t.tenantSlug || 'Unknown company'}`} accessory={<Badge text={t.status || 'Ticket'} />} />)}
              </Section>
            ) : null}
          </>
        )}
    </Screen>
  );
}
