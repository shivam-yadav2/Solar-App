import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Download, PieChart, TrendingDown, TrendingUp } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/query';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { shareCsv } from '../../src/lib/export';
import { Badge, Button, Chips, EmptyState, ErrorState, GroupedItem, GUTTER, IconTile, InfoRow, ListScreen, ListSkeleton, Row, SearchBar, Section, Sheet, T, formatMoneyCompact, radius, elevation, space, useOverlay, useTheme } from '../../src/ds';

type Sort = 'profit' | 'margin' | 'contract' | 'name';

export default function ProfitScreen() {
  const router = useRouter(); const p = useTheme(); const { toast } = useOverlay();
  const query = useApi(['profit', 'customers'], api.getCustomerProfitability);
  const [text, setText] = useState(''); const [sort, setSort] = useState<Sort>('profit'); const [selected, setSelected] = useState<any | null>(null);
  const rows = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return [...(query.data?.customers || [])].filter((item) => !needle || `${item.customerName} ${item.customerCustomId}`.toLowerCase().includes(needle)).sort((a, b) => {
      if (sort === 'name') return String(a.customerName).localeCompare(String(b.customerName));
      if (sort === 'margin') return Number(b.margin) - Number(a.margin);
      if (sort === 'contract') return Number(b.contractValue) - Number(a.contractValue);
      return Number(b.actualProfit) - Number(a.actualProfit);
    });
  }, [query.data, text, sort]);
  const summary = query.data?.summary || {};
  const exportData = async () => {
    try { await shareCsv('SolarOS_Customer_Profitability', rows.flatMap((customer) => (customer.projects?.length ? customer.projects : [{}]).map((project: any) => ({ Customer: customer.customerName, CustomerID: customer.customerCustomId, Project: project.projectName || '', Contract: project.contractValue ?? customer.contractValue, SiteCost: project.totalSiteCost ?? customer.totalSiteCost, Profit: project.actualProfit ?? customer.actualProfit, MarginPercent: project.margin ?? customer.margin })))); } catch (e: any) { toast(e.message || 'Export failed', 'error'); }
  };
  return <>
    <ListScreen<any>
      title="Profit & margins" subtitle="Realized profitability by customer and project" back large={false}
      header={<>
        <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, gap: space.m }, elevation(p, 1)]}>
          <View><T variant="footnote" color="secondary">REALIZED NET PROFIT</T><T variant="largeTitle" num style={{ color: Number(summary.realizedNetProfit) >= 0 ? p.green : p.red }}>{formatMoneyCompact(summary.realizedNetProfit || 0)}</T><T variant="footnote" color="secondary">{summary.customerCount || 0} customers · {summary.projectCount || 0} sites · {Number(summary.blendedMargin || summary.margin || 0).toFixed(1)}% blended margin</T></View>
          <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><T variant="caption" color="secondary">CONTRACTS</T><T variant="headline" num>{formatMoneyCompact(summary.totalContractValue || 0)}</T></View><View style={{ flex: 1 }}><T variant="caption" color="secondary">SITE COST</T><T variant="headline" num color="red">{formatMoneyCompact(summary.totalSiteExpenses || 0)}</T></View></View>
        </View>
        <SearchBar value={text} onChange={setText} placeholder="Customer name or ID" />
        <Chips value={sort} onChange={(value) => setSort(value as Sort)} options={[{ value: 'profit', label: 'Net profit' }, { value: 'margin', label: 'Margin' }, { value: 'contract', label: 'Contract' }, { value: 'name', label: 'Name' }]} />
        <Button title="Export customer & project margins" kind="gray" icon={<Download size={17} color={p.label} />} onPress={() => void exportData()} full />
        {query.loading ? <ListSkeleton /> : query.error ? <ErrorState message={query.error} onRetry={query.refresh} /> : null}
      </>}
      data={query.loading || query.error ? [] : rows}
      keyExtractor={(item) => item.customerId}
      refreshing={query.refreshing}
      onRefresh={query.refresh}
      ListEmptyComponent={!query.loading && !query.error ? <EmptyState icon={<PieChart size={44} color={p.tertiary} />} title={text ? 'No matching customers' : 'No margin data yet'} message="Approved site expenses and procurement costs appear here." /> : null}
      renderItem={({ item, index }) => <GroupedItem index={index} count={rows.length} inset={58}>
        <Row icon={<IconTile icon={Number(item.actualProfit) >= 0 ? <TrendingUp size={17} color={p.green} /> : <TrendingDown size={17} color={p.red} />} tone={Number(item.actualProfit) >= 0 ? 'green' : 'red'} />}
          title={item.customerName}
          subtitle={`${item.customerCustomId} · ${item.projectCount} sites · ${formatNumber(item.totalCapacityKw)} kWp · Cost ${formatINR(item.totalSiteCost)}`}
          accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num weight="600" color={Number(item.actualProfit) >= 0 ? 'green' : 'red'}>{formatINR(item.actualProfit)}</T><Badge text={`${Number(item.margin).toFixed(1)}%`} tone={Number(item.margin) >= 25 ? 'green' : 'orange'} /></View>}
          onPress={() => setSelected(item)} />
      </GroupedItem>}
    />
    <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.customerName || 'Customer margin'} full>
      {selected ? <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: space.xl, gap: space.m }}>
        <Section header="Customer total">
          <InfoRow label="Contract value" value={formatINR(selected.contractValue)} /><InfoRow label="Site cost" value={formatINR(selected.totalSiteCost)} /><InfoRow label="Actual profit" value={<T variant="headline" num color={Number(selected.actualProfit) >= 0 ? 'green' : 'red'}>{formatINR(selected.actualProfit)}</T>} /><InfoRow label="Margin" value={`${Number(selected.margin).toFixed(1)}%`} />
        </Section>
        <Section header="Project contribution">
          {(selected.projects || []).map((project: any) => <Row key={project.id} title={project.projectName} subtitle={[project.customId, `${formatNumber(project.capacityKw)} kWp`, `Cost ${formatINR(project.totalSiteCost)}`].filter(Boolean).join(' · ')} accessory={<View style={{ alignItems: 'flex-end' }}><T variant="subhead" num weight="600" color={Number(project.actualProfit) >= 0 ? 'green' : 'red'}>{formatINR(project.actualProfit)}</T><T variant="caption" color="secondary">{Number(project.margin || 0).toFixed(1)}%</T></View>} onPress={() => { setSelected(null); router.push({ pathname: '/project/[id]', params: { id: project.id, tab: 'financials' } }); }} />)}
        </Section>
      </ScrollView> : null}
    </Sheet>
  </>;
}
