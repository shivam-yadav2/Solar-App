import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api, ApiError } from '../../src/lib/api';
import { loadProjects } from '../../src/lib/pickers';
import { Button, DateField, FormSection, Screen, SelectField, space, T, Tap, TextField, ToggleField, haptic, num, todayISO, useOverlay, useTheme, radius } from '../../src/ds';
import { PhotosField, Attached } from '../../src/components/AttachField';
import { store } from '../../src/lib/storage';
import { queueDpr } from '../../src/lib/offlineDpr';

const STEPS = [0, 25, 50, 75, 100];

/** Percentage picker: five taps instead of typing numbers on site. */
const Pct: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
  const p = useTheme();
  return (
    <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T variant="footnote" color="secondary">{label}</T><T variant="footnote" num weight="600">{value}%</T></View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {STEPS.map((s) => (
          <Tap key={s} onPress={() => { haptic.tap(); onChange(s); }} scaleTo={0.94} style={{ flex: 1, height: 34, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center', backgroundColor: value >= s && s > 0 ? p.accent : value === 0 && s === 0 ? p.fillStrong : p.fill }}>
            <T variant="footnote" weight="600" style={{ color: value >= s && s > 0 ? p.onAccent : p.label }}>{s}</T>
          </Tap>
        ))}
      </View>
    </View>
  );
};

export default function SiteReportForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { toast } = useOverlay();
  const [project, setProject] = useState<{ value: string; label: string } | null>(params.projectId ? { value: params.projectId, label: '' } : null);
  const [date, setDate] = useState(todayISO());
  const [pct, setPct] = useState({ structure: 0, panels: 0, wiring: 0 });
  const [labour, setLabour] = useState('');
  const [work, setWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [weather, setWeather] = useState('');
  const [photos, setPhotos] = useState<Attached[]>([]);
  const [gps, setGps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const draftKey = `draft:dpr:${params.projectId || 'new'}`;

  useEffect(() => {
    store.get(draftKey).then((raw) => {
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.project) setProject(d.project);
        if (d.date) setDate(d.date);
        if (d.pct) setPct(d.pct);
        setLabour(d.labour || ''); setWork(d.work || ''); setBlockers(d.blockers || ''); setWeather(d.weather || '');
        if (Array.isArray(d.photos)) setPhotos(d.photos);
        if (typeof d.gps === 'boolean') setGps(d.gps);
        toast('Saved site-report draft restored', 'info');
      } catch { void store.del(draftKey); }
    }).finally(() => setHydrated(true));
  // The draft key is fixed for this mounted form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || saving) return;
    const timer = setTimeout(() => {
      const hasWork = !!project || !!work || !!blockers || !!photos.length || !!labour;
      if (hasWork) void store.set(draftKey, JSON.stringify({ project, date, pct, labour, work, blockers, weather, photos, gps, savedAt: new Date().toISOString() }));
    }, 450);
    return () => clearTimeout(timer);
  }, [hydrated, saving, draftKey, project, date, pct, labour, work, blockers, weather, photos, gps]);

  useEffect(() => {
    if (!params.projectId) return;
    api.getProject(params.projectId).then((r) => setProject({ value: r.project.id, label: r.project.projectName })).catch(() => {});
    api.getDpr(params.projectId).then((r) => { const last = r.reports?.[0]; if (last) setPct({ structure: last.structureMountingProgressPct, panels: last.panelInstallationProgressPct, wiring: last.wiringInverterProgressPct }); }).catch(() => {});
  }, [params.projectId]);

  const save = async () => {
    if (!project) { toast('Choose the project', 'error'); haptic.error(); return; }
    if (!work.trim()) { toast('Write what was done today', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (gps) {
        const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
        if (perm?.granted) coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null))?.coords || null;
      }
      const payload = {
        reportDate: date, structureMountingProgressPct: pct.structure, panelInstallationProgressPct: pct.panels, wiringInverterProgressPct: pct.wiring,
        laborCountOnSite: num(labour), workCompletedToday: work.trim(), blockersOrDelays: blockers.trim() || undefined, weatherConditions: weather.trim() || undefined,
        gpsLatitude: coords?.latitude, gpsLongitude: coords?.longitude, sitePhotos: photos.map((x) => x.fileId),
      };
      await api.createDpr(project.value, payload);
      await store.del(draftKey);
      haptic.success();
      toast('Site report sent');
      router.back();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 0 && project) {
        const count = await queueDpr(project.value, {
          reportDate: date, structureMountingProgressPct: pct.structure, panelInstallationProgressPct: pct.panels, wiringInverterProgressPct: pct.wiring,
          laborCountOnSite: num(labour), workCompletedToday: work.trim(), blockersOrDelays: blockers.trim() || undefined, weatherConditions: weather.trim() || undefined,
          sitePhotos: photos.map((x) => x.fileId),
        });
        await store.del(draftKey);
        toast(`Offline: report queued (${count} waiting)`, 'info');
        router.back();
      } else toast(e.message, 'error');
    } finally { setSaving(false); }
  };

  return (
    <Screen title="Site report" large={false} back backLabel="Cancel" right={<Button title="Send" size="s" loading={saving} onPress={save} />}>
      <FormSection>
        <SelectField label="Project" required value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={(o) => setProject(o)} />
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
      </FormSection>
      <FormSection header="Progress" footer="Overall progress so far, not just today.">
        <Pct label="Structure & mounting" value={pct.structure} onChange={(v) => setPct((s) => ({ ...s, structure: v }))} />
        <Pct label="Panels installed" value={pct.panels} onChange={(v) => setPct((s) => ({ ...s, panels: v }))} />
        <Pct label="Wiring & inverter" value={pct.wiring} onChange={(v) => setPct((s) => ({ ...s, wiring: v }))} />
      </FormSection>
      <FormSection header="Today">
        <TextField label="Work done" value={work} onChange={setWork} multiline required placeholder="e.g. Structure fixed on east side, 6 panels mounted" />
        <TextField label="People on site" kind="number" value={labour} onChange={setLabour} />
        <TextField label="Problems / delays" value={blockers} onChange={setBlockers} multiline placeholder="Optional — e.g. waiting for inverter" />
        <TextField label="Weather" value={weather} onChange={setWeather} placeholder="Optional" />
      </FormSection>
      <FormSection>
        <PhotosField label="Site photos" value={photos} onChange={setPhotos} />
        <ToggleField label="Attach my location" value={gps} onChange={setGps} />
      </FormSection>
      <T variant="caption" color="secondary" align="center">This report is saved as a private draft on this device until it is sent successfully.</T>
      <Button title="Send report" loading={saving} onPress={save} full />
    </Screen>
  );
}
