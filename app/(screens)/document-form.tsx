import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadProjects } from '../../src/lib/pickers';
import { AttachField, Attached } from '../../src/components/AttachField';
import { Button, FormSection, Screen, SelectField, TextField, haptic, useOverlay, useUnsavedChanges } from '../../src/ds';
import type { ProjectDocumentCategory } from '../../src/types';

const CATEGORIES: ProjectDocumentCategory[] = ['Agreement', 'Quotation', 'Installation Report', 'Site Survey', 'UPPCL Document', 'Net Metering', 'Completion Certificate', 'Payment Receipt', 'Other'];

export default function DocumentFormScreen() {
  const router = useRouter();
  const { toast } = useOverlay();
  const [project, setProject] = useState<{ value: string; label: string } | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProjectDocumentCategory>('Other');
  const [file, setFile] = useState<Attached | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = !!project || !!name || !!file || category !== 'Other';
  const allowLeave = useUnsavedChanges(dirty && !saving);
  const save = async () => {
    const next: Record<string, string> = {};
    if (!project) next.project = 'Choose the project.';
    if (!name.trim()) next.name = 'Give this document a clear name.';
    if (!file) next.file = 'Add a photo or file.';
    setErrors(next);
    if (Object.keys(next).length || !project || !file) { haptic.error(); return; }
    setSaving(true);
    try {
      await api.createDocument({ projectId: project.value, customerId, name: name.trim(), category, fileId: file.fileId, fileName: file.fileName, fileSize: file.fileSize, fileMime: file.mimeType || 'application/octet-stream' });
      toast('Document uploaded');
      allowLeave();
      router.back();
    } catch (e: any) { toast(e.message || 'Could not save this document', 'error'); } finally { setSaving(false); }
  };
  return (
    <Screen title="Upload document" subtitle="Take a photo or attach an existing project file" large={false} back backLabel="Cancel" right={<Button title="Upload" size="s" loading={saving} onPress={save} />}>
      <FormSection header="Project">
        <SelectField label="Project" required value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" error={errors.project}
          onChange={async (option) => {
            setProject(option);
            if (!option) { setCustomerId(''); return; }
            const r = await api.getProject(option.value).catch(() => null);
            setCustomerId(r?.project?.customerId || '');
          }} />
      </FormSection>
      <FormSection header="Document">
        <TextField label="Document name" value={name} onChange={setName} placeholder="e.g. Net meter approval" required error={errors.name} />
        <SelectField label="Category" value={category} options={CATEGORIES.map((value) => ({ value, label: value }))} onChange={(option) => option && setCategory(option.value as ProjectDocumentCategory)} />
        <AttachField label="Photo or file" value={file} onChange={(value) => { setFile(value); if (value && !name) setName(value.fileName.replace(/\.[^.]+$/, '')); }} hint={errors.file || 'PDF, image, Word document or any supported project file.'} />
      </FormSection>
      <Button title="Upload document" loading={saving} onPress={save} full />
    </Screen>
  );
}
