import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { HardHat, LogIn, LogOut, Plus, UsersRound } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { field } from '../../src/lib/apis/ops';
import { useApi, usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { loadProjects } from '../../src/lib/pickers';
import { formatDate } from '../../src/lib/formatters';
import {
  Avatar, Badge, Button, EmptyState, ErrorState, FormSection, GroupedItem, GUTTER, IconButton, IconTile, ListScreen, ListSkeleton, Row, Segmented, SelectField, Sheet, space, T, ToggleField,
  useOverlay, useTheme, haptic, radius, elevation,
} from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

type Mode = 'today' | 'reports';
const today = () => new Date().toISOString().slice(0, 10);
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

export default function FieldOperations() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const [mode, setMode] = useState<Mode>('today');
  const [punch, setPunch] = useState<any | null>(null);
  const emps = useApi(['payroll', 'employees', 'active'], () => api.getEmployees({ limit: '500', status: 'Active' }), { enabled: mode === 'today' });
  const att = useApi(['attendance', today().slice(0, 7)], () => api.getAttendance(today().slice(0, 7)), { enabled: mode === 'today' });
  const reports = usePaged<any>(['dpr', 'all'], async (page, limit) => { const r = await field.reports({ page, limit }); return toPage(r.reports, r, page); }, 30, { enabled: mode === 'reports' });
  const todays = new Map((att.data?.records || []).filter((r) => r.date?.slice(0, 10) === today()).map((r) => [r.employeeId, r]));
  const employees: any[] = emps.data?.employees || [];
  const present = employees.filter((e) => todays.has(e.id)).length;
  const manage = can('attendance.manage');

  const header = (
    <>
      <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'today', label: 'Attendance today' }, { value: 'reports', label: 'Site reports' }]} />
      {mode === 'today' && employees.length ? (
        <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
          <View style={{ flex: 1 }}><T variant="footnote" color="secondary">On duty</T><T variant="title2" num color="green">{present}</T></View>
          <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Not punched in</T><T variant="title2" num color={employees.length - present ? 'orange' : 'label'}>{employees.length - present}</T></View>
        </View>
      ) : null}
      {(mode === 'today' ? emps.loading || att.loading : reports.loading) ? <ListSkeleton /> : (mode === 'today' ? emps.error || att.error : reports.error) ? <ErrorState message={(mode === 'today' ? emps.error || att.error : reports.error) || ''} onRetry={() => (mode === 'today' ? emps.refresh() : reports.refresh())} /> : null}
    </>
  );

  return (
    <>
      {mode === 'today' ? (
        <ListScreen<any>
          title="Field work" back large={false} header={header}
          right={manage ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New site report" onPress={() => router.push('/field-operation-form')} /> : undefined}
          data={emps.loading ? [] : employees} keyExtractor={(e) => e.id}
          refreshing={emps.refreshing || att.refreshing} onRefresh={() => { void emps.refresh(); void att.refresh(); }}
          ListEmptyComponent={!emps.loading ? <EmptyState icon={<UsersRound size={44} color={p.tertiary} />} title="No employees" message="Add your installers and site staff in Payroll to track attendance." action={can('payroll.manage') ? { title: 'Add employee', onPress: () => router.push('/employee-form') } : undefined} /> : null}
          renderItem={({ item: e, index }) => {
            const r = todays.get(e.id);
            return (
              <GroupedItem index={index} count={employees.length} inset={68}>
                <Row icon={<Avatar name={e.name} />} title={e.name}
                  subtitle={r ? `In ${time(r.punchInTime)}${r.punchOutTime ? ` · out ${time(r.punchOutTime)} · ${r.workingHours}h` : ''}${r.punchInLatitude ? ' · 📍' : ''}` : e.designation || e.role || 'Not punched in'}
                  accessory={!manage ? (r ? <Badge text={r.status} /> : undefined) : !r ? <Button title="In" size="s" kind="tinted" icon={<LogIn size={14} color={p.accentText} />} onPress={() => setPunch({ employee: e })} /> : !r.punchOutTime ? <Button title="Out" size="s" kind="gray" icon={<LogOut size={14} color={p.label} />} onPress={() => setPunch({ employee: e, record: r })} /> : <Badge text="Done" tone="green" />}
                  chevron={false} />
              </GroupedItem>
            );
          }}
        />
      ) : (
        <ListScreen<any>
          title="Field work" back large={false} header={header}
          right={manage ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New site report" onPress={() => router.push('/field-operation-form')} /> : undefined}
          data={reports.loading ? [] : reports.items} keyExtractor={(r) => r.id}
          refreshing={reports.refreshing} onRefresh={reports.refresh} onEndReached={reports.loadMore}
          ListEmptyComponent={!reports.loading ? <EmptyState icon={<HardHat size={44} color={p.tertiary} />} title="No site reports yet" message="Installers can send a daily report with photos from the site." action={manage ? { title: 'New site report', onPress: () => router.push('/field-operation-form') } : undefined} /> : null}
          ListFooterComponent={<LoadMoreFooter loading={reports.loadingMore} hasMore={reports.hasMore} count={reports.items.length} total={reports.total} noun="reports" />}
          renderItem={({ item: r, index }) => {
            const avg = Math.round((Number(r.structureMountingProgressPct) + Number(r.panelInstallationProgressPct) + Number(r.wiringInverterProgressPct)) / 3);
            return (
              <GroupedItem index={index} count={reports.items.length} inset={58}>
                <Row icon={<IconTile icon={<HardHat size={17} color={p.teal} />} tone="teal" />} title={r.projectName || 'Project'}
                  subtitle={`${formatDate(r.reportDate)} · ${avg}% · ${r.laborCountOnSite} on site${(r.sitePhotos || []).length ? ` · ${r.sitePhotos.length} photos` : ''}`}
                  accessory={r.blockersOrDelays ? <Badge text="Blocked" tone="red" /> : undefined}
                  onPress={() => router.push({ pathname: '/dpr/[id]', params: { id: r.id } })} />
              </GroupedItem>
            );
          }}
        />
      )}
      <PunchSheet value={punch} onClose={() => setPunch(null)} onDone={() => { setPunch(null); void att.refresh(); }} />
    </>
  );
}

function PunchSheet({ value, onClose, onDone }: { value: { employee: any; record?: any } | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useOverlay();
  const [project, setProject] = useState<{ value: string; label: string } | null>(null);
  const [gps, setGps] = useState(true);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setProject(null); }, [value]);
  if (!value) return null;
  const out = !!value.record;
  const go = async () => {
    setBusy(true);
    try {
      if (out) {
        const hours = Math.max(0, Math.round(((Date.now() - new Date(value.record.punchInTime).getTime()) / 36e5) * 10) / 10);
        await api.punchOut(value.record.id, { punchOutTime: new Date().toISOString(), workingHours: hours });
        toast(`${value.employee.name} out · ${hours} h`);
      } else {
        let coords: { latitude: number; longitude: number } | null = null;
        if (gps) {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.granted) coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null))?.coords || null;
        }
        await api.punchIn({ employeeId: value.employee.id, status: 'Present', assignedProjectId: project?.value, punchInLatitude: coords?.latitude, punchInLongitude: coords?.longitude });
        toast(`${value.employee.name} punched in${coords ? ' with location' : ''}`);
      }
      haptic.success();
      onDone();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible onClose={onClose} title={`${out ? 'Punch out' : 'Punch in'} · ${value.employee.name}`} footer={<Button title={out ? 'Punch out now' : 'Punch in now'} loading={busy} onPress={go} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER }}>
        {out ? <T variant="subhead" color="secondary">In since {time(value.record.punchInTime)}.</T> : (
          <FormSection>
            <SelectField label="Site / project" value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" allowClear onChange={(o) => setProject(o)} placeholder="Optional" />
            <ToggleField label="Record location" hint="Saves where the punch-in happened" value={gps} onChange={setGps} />
          </FormSection>
        )}
      </View>
    </Sheet>
  );
}

