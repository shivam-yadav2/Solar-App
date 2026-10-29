import React from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calculator, FileText, FolderOpen, IndianRupee, MessageSquareHeart, ShieldCheck, Wrench, Zap } from 'lucide-react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/query';
import { useAuth } from '../../context/AuthContext';
import { absoluteUrl } from '../../lib/apis/account';
import { formatDate, formatINR, greeting } from '../../lib/formatters';
import { Badge, Card, ErrorState, HeroCard, IconTile, ListSkeleton, Row, Screen, Section, space, T, useTheme, radius, elevation } from '../../ds';
import { ContactBar, HeaderActions, QuickActions } from '../../components/kit';
import { WorkspaceNotices } from '../../components/gates';
import { DISCOM_STAGES, projectSteps, Timeline } from '../../components/timeline';
import type { DiscomLiaisonStage, SolarProject } from '../../types';

/** Customer portal home: where my system is, what I've paid, help. */
export function CustomerHome() {
  const router = useRouter();
  const p = useTheme();
  const { customer, tenant, user } = useAuth();
  const go = (path: string) => router.push(path as never);
  const q = useApi(['customers', 'mine', customer?.id], () => api.getCustomer(customer!.id), { enabled: !!customer?.id });
  const projects: SolarProject[] = q.data?.projects || [];
  const main = projects.find((x) => !/Completed|Cancelled/.test(x.status)) || projects[0];
  const total = projects.reduce((s, x) => s + Number(x.finalDealAmount || x.dealAmount || 0), 0);
  const paid = projects.reduce((s, x) => s + Number(x.totalReceived || 0), 0);
  const name = (customer?.name || user?.username || '').split(' ')[0];
  const b = tenant?.branding;

  return (
    <Screen title="Home" subtitle={`${greeting()}${name ? `, ${name}` : ''}`} right={<HeaderActions />} refreshing={q.refreshing} onRefresh={q.refresh}>
      <WorkspaceNotices />
      {tenant ? (
        <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, gap: space.m }, elevation(p, 1)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            {b?.logoUrl ? <Image source={{ uri: absoluteUrl(b.logoUrl) }} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff' }} resizeMode="contain" /> : <IconTile icon={<Zap size={20} color={p.accentText} />} size={44} />}
            <View style={{ flex: 1 }}>
              <T variant="headline" numberOfLines={1}>{tenant.name}</T>
              <T variant="footnote" color="secondary" numberOfLines={1}>{b?.companyTagline || 'Your solar installer'}</T>
            </View>
          </View>
          <ContactBar phone={b?.supportPhone} email={b?.supportEmail} whatsappText={`Hello ${tenant.name}, this is ${customer?.name || ''} (${customer?.customId || ''}).`} />
        </View>
      ) : null}

      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          {main ? (
            <Card style={{ gap: space.m }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.m }}>
                <View style={{ flex: 1 }}>
                  <T variant="footnote" color="secondary">Your system</T>
                  <T variant="title2" numberOfLines={2}>{main.capacityKw} kW · {main.projectName}</T>
                </View>
                <Badge text={main.status} />
              </View>
              <Timeline steps={projectSteps(main.status)} />
              <T variant="footnote" color="accent" onPress={() => go(`/project/${main.id}`)}>Project details ›</T>
            </Card>
          ) : (
            <Card><T variant="subhead" color="secondary">Your project will appear here once it's booked.</T></Card>
          )}

          {total > 0 ? (
            <HeroCard
              label="Balance due"
              value={Math.max(0, total - paid)}
              money
              badge={`${Math.round((total > 0 ? paid / total : 0) * 100)}% paid`}
              badgeTone={paid >= total ? 'green' : 'accent'}
              actions={[
                { label: 'Payments', icon: IndianRupee, onPress: () => go('/(tabs)/payments') },
                { label: 'Invoices', icon: FileText, onPress: () => go('/invoices') },
                { label: 'EMI', icon: Calculator, onPress: () => go('/emi') },
              ]}
            />
          ) : null}

          {main ? <DiscomCard projectId={main.id} /> : null}

          <QuickActions items={[
            { label: 'Get help', icon: Wrench, tone: 'red', onPress: () => go('/ticket-form') },
            { label: 'Warranty', icon: ShieldCheck, tone: 'green', onPress: () => go('/warranties') },
            { label: 'Documents', icon: FolderOpen, tone: 'blue', onPress: () => go('/documents') },
          ]} />

          {(q.data?.payments || []).length ? (
            <Section header="Recent payments" right={<T variant="footnote" color="accent" onPress={() => go('/(tabs)/payments')}>See all</T>}>
              {(q.data.payments as any[]).slice(0, 3).map((pay) => (
                <Row key={pay.id} title={formatINR(pay.amount)} subtitle={`${formatDate(pay.paymentDate)} · ${pay.paymentMethod || pay.method || ''}`} accessory={<Badge text={pay.status || 'Received'} />} />
              ))}
            </Section>
          ) : null}

          <Section>
            <Row icon={<IconTile icon={<MessageSquareHeart size={17} color={p.purple} />} tone="purple" />} title="Rate your installation" subtitle="Tell us how we did" onPress={() => go('/feedback')} />
            <Row icon={<IconTile icon={<FileText size={17} color={p.blue} />} tone="blue" />} title="Documents" subtitle="Agreements, approvals, photos" onPress={() => go('/documents')} />
          </Section>
        </>
      )}
    </Screen>
  );
}

/** DISCOM / net-metering approvals for the customer's project. */
function DiscomCard({ projectId }: { projectId: string }) {
  const q = useQuery({ queryKey: ['discom', projectId], queryFn: () => api.getDiscomStages(projectId) });
  const stages: DiscomLiaisonStage[] = q.data?.stages || [];
  if (!stages.length) return null;
  const byName = new Map(stages.map((s) => [s.stageName, s]));
  const firstOpen = DISCOM_STAGES.findIndex((n) => byName.get(n)?.status !== 'Approved');
  return (
    <Card style={{ gap: space.m }}>
      <View>
        <T variant="headline">Net-metering & subsidy</T>
        <T variant="footnote" color="secondary">Electricity board approvals for your connection.</T>
      </View>
      <Timeline steps={DISCOM_STAGES.map((n, i) => {
        const s = byName.get(n);
        return {
          title: n,
          subtitle: s?.approvalDate ? `Approved ${formatDate(s.approvalDate)}` : s?.submissionDate ? `Submitted ${formatDate(s.submissionDate)}` : s?.remarks,
          state: s?.status === 'Approved' ? 'done' : s?.status === 'Rejected' ? 'blocked' : i === firstOpen ? 'current' : 'todo',
        };
      })} />
    </Card>
  );
}
