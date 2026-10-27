import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { loadProjects, toOptions } from '../../src/lib/pickers';
import { Button, ChoiceField, FormSection, Screen, SelectField, T, TextField, haptic, useOverlay } from '../../src/ds';
import { PhotosField, Attached } from '../../src/components/AttachField';
import type { ComplaintPriority } from '../../src/types';

const TYPES = ['Low generation', 'Inverter error', 'Panel damage / cleaning', 'Wiring / earthing', 'Net meter / DISCOM', 'Billing / payment', 'Other'];

export default function TicketForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { user } = useAuth();
  const { toast } = useOverlay();
  const isCustomer = user?.role === 'CUSTOMER';
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, enabled: !isCustomer, staleTime: 10 * 60_000 });
  const mine = useQuery({ queryKey: ['projects', 'mine'], queryFn: () => api.getProjects({ limit: '50' }), enabled: isCustomer });
  const [project, setProject] = useState<{ value: string; label: string } | null>(params.projectId ? { value: params.projectId, label: '' } : null);
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [photos, setPhotos] = useState<Attached[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.projectId) api.getProject(params.projectId).then((r) => setProject({ value: r.project.id, label: r.project.projectName })).catch(() => {});
  }, [params.projectId]);
  useEffect(() => {
    const list = mine.data?.projects || [];
    if (isCustomer && !project && list.length === 1) setProject({ value: list[0].id, label: list[0].projectName });
  }, [mine.data, isCustomer, project]);

  const types = toOptions(settings.data?.settings?.complaintCategories, TYPES);
  const save = async () => {
    if (!project) { toast('Choose the system / project', 'error'); haptic.error(); return; }
    if (!type) { toast('Choose what the problem is about', 'error'); haptic.error(); return; }
    if (!description.trim()) { toast('Describe the problem', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      const r: any = await api.createComplaint({
        projectId: project.value, complaintType: type, subject: subject.trim() || type, description: description.trim(), priority,
        attachments: photos.map((a) => ({ id: a.fileId, fileId: a.fileId, fileName: a.fileName, mimeType: a.mimeType || 'image/jpeg', fileSize: 0 })) as any,
      });
      haptic.success();
      toast(isCustomer ? 'Request sent — we will get back to you soon' : 'Ticket created');
      const newId = r.complaint?.id;
      if (newId) router.replace({ pathname: '/ticket/[id]', params: { id: newId } }); else router.back();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const myOptions = (mine.data?.projects || []).map((x: any) => ({ value: x.id, label: x.projectName, subtitle: `${x.capacityKw} kW` }));

  return (
    <Screen title={isCustomer ? 'Get help' : 'New ticket'} large={false} back backLabel="Cancel" right={<Button title="Send" size="s" loading={saving} onPress={save} />}>
      <FormSection>
        {isCustomer ? (
          myOptions.length > 1 ? <SelectField label="Your system" value={project?.value} display={project?.label} options={myOptions} onChange={(o) => setProject(o)} required /> : null
        ) : <SelectField label="Project" value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={(o) => setProject(o)} required />}
        <SelectField label="Problem" value={type} options={types} onChange={(o) => o && setType(o.value)} required />
      </FormSection>
      <FormSection header="Details">
        <TextField label="Short title" value={subject} onChange={setSubject} placeholder="Optional" />
        <TextField label="What's happening?" value={description} onChange={setDescription} multiline required placeholder={isCustomer ? 'e.g. Inverter shows error E02 since yesterday' : ''} />
        <ChoiceField<ComplaintPriority> label="How urgent" value={priority} onChange={setPriority} options={[{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Normal' }, { value: 'High', label: 'High' }, { value: 'Critical', label: 'Critical' }]} />
      </FormSection>
      <FormSection footer="A photo of the inverter screen or the problem helps the technician come prepared.">
        <PhotosField label="Photos" value={photos} onChange={setPhotos} max={4} />
      </FormSection>
      <Button title={isCustomer ? 'Send request' : 'Create ticket'} loading={saving} onPress={save} full />
      {isCustomer ? <T variant="footnote" color="secondary" align="center">You'll get replies here and in your notifications.</T> : null}
    </Screen>
  );
}
