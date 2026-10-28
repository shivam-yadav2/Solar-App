import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Button, FormSection, Screen, SelectField, space, T, Tap, TextField, haptic, useOverlay, useTheme } from '../../src/ds';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function FeedbackScreen() {
  const router = useRouter();
  const p = useTheme();
  const { toast, actions } = useOverlay();
  const projects = useQuery({ queryKey: ['projects', 'mine-feedback'], queryFn: () => api.getProjects({ limit: '50' }) });
  const [rating, setRating] = useState(0);
  const [project, setProject] = useState<{ value: string; label: string } | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!rating) { toast('Tap the stars to rate', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      const r = await api.submitFeedback({ rating, projectId: project?.value, comment: comment.trim() || undefined });
      haptic.success();
      if (r.googleReviewUrl) actions({ title: 'Thank you!', message: r.message, items: [{ label: 'Review us on Google', onPress: () => { void Linking.openURL(r.googleReviewUrl!); router.back(); } }, { label: 'Done', onPress: () => router.back() }] });
      else { toast(r.message || 'Thank you for your feedback'); router.back(); }
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const options = (projects.data?.projects || []).map((x: any) => ({ value: x.id, label: x.projectName, subtitle: `${x.capacityKw} kW` }));
  return (
    <Screen title="Rate your installation" large={false} back backLabel="Cancel">
      <View style={{ alignItems: 'center', gap: space.m, paddingVertical: space.l }}>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="adjustable" accessibilityLabel={`Rating ${rating} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Tap key={n} onPress={() => { haptic.tap(); setRating(n); }} scaleTo={0.85} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Star size={38} color={n <= rating ? p.accent : p.fillStrong} fill={n <= rating ? p.accent : 'transparent'} />
            </Tap>
          ))}
        </View>
        <T variant="headline" color="secondary">{rating ? WORDS[rating] : 'Tap to rate'}</T>
      </View>
      <FormSection>
        {options.length > 1 ? <SelectField label="Project" value={project?.value} display={project?.label} options={options} allowClear onChange={(o) => setProject(o)} placeholder="Optional" /> : null}
        <TextField label="Tell us more" value={comment} onChange={setComment} multiline placeholder="What went well? What could be better?" />
      </FormSection>
      <Button title="Send feedback" loading={saving} onPress={save} full />
    </Screen>
  );
}
