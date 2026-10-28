import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadProjects } from '../../src/lib/pickers';
import { Button, DateField, FormSection, Screen, SelectField, TextField, haptic, useOverlay, useUnsavedChanges } from '../../src/ds';

const NAMES = ['Feasibility Application Submitted', 'Feasibility Approved', 'Estimate Generated & Paid', 'Work Execution Submitted (WCR)', 'Safety Inspection / CEIG Inspection', 'Bi-directional Net-Meter Testing', 'Net-Meter Installed on Site', 'Joint Inspection Report (JIR) Signed', 'Subsidy / DBT Portal Claim Dispatched', 'Subsidy Disbursed to Customer'];
const STATUSES = ['Pending', 'In Progress', 'Approved', 'Rejected', 'On Hold'];

export default function DiscomFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { toast } = useOverlay();
  const [project, setProject] = useState<{ value: string; label: string } | null>(params.projectId ? { value: params.projectId, label: '' } : null);
  const [f, setF] = useState({ stageName: NAMES[0], status: 'Pending', submissionDate: new Date().toISOString().slice(0, 10), approvalDate: '', applicationReferenceNo: '', discomOfficerName: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const allowLeave = useUnsavedChanges(!saving && (!!project || !!f.applicationReferenceNo || !!f.remarks));
  useEffect(() => {
    if (!params.projectId) return;
    api.getProject(params.projectId).then((r) => setProject({ value: r.project.id, label: r.project.projectName })).catch(() => {});
  }, [params.projectId]);
  const set = (key: keyof typeof f) => (value: string) => setF((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!project) { toast('Choose the project', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      await api.createDiscomStage(project.value, { ...f, approvalDate: f.approvalDate || undefined } as any);
      toast('DISCOM stage added');
      allowLeave();
      router.back();
    } catch (e: any) { toast(e.message || 'Could not add this stage', 'error'); } finally { setSaving(false); }
  };
  return (
    <Screen title="Add DISCOM stage" subtitle="Net-metering, inspection or subsidy milestone" large={false} back backLabel="Cancel" right={<Button title="Add" size="s" loading={saving} onPress={save} />}>
      <FormSection header="Project">
        <SelectField label="Project" value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={setProject} required />
      </FormSection>
      <FormSection header="Milestone">
        <SelectField label="Stage" value={f.stageName} options={NAMES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('stageName')(o.value)} />
        <SelectField label="Status" value={f.status} options={STATUSES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('status')(o.value)} />
        <DateField label="Submission date" value={f.submissionDate} onChange={set('submissionDate')} />
        <DateField label="Approval date" value={f.approvalDate} onChange={set('approvalDate')} placeholder="Not approved yet" />
      </FormSection>
      <FormSection header="Reference">
        <TextField label="Application / reference no." value={f.applicationReferenceNo} onChange={set('applicationReferenceNo')} />
        <TextField label="DISCOM officer" kind="name" value={f.discomOfficerName} onChange={set('discomOfficerName')} />
        <TextField label="Remarks" value={f.remarks} onChange={set('remarks')} multiline />
      </FormSection>
      <Button title="Add stage" loading={saving} onPress={save} full />
    </Screen>
  );
}
