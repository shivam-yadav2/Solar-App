import React, { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Card, ChoiceField, ErrorState, FormField, Loading, OptionField, PrimaryButton, Screen } from '../../src/components/ui';

export default function FeedbackScreen() {
  const router = useRouter(); const [projects, setProjects] = useState<any[]>([]); const [rating, setRating] = useState('5'); const [projectId, setProjectId] = useState(''); const [comment, setComment] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { api.getProjects({ limit: '100' }).then(data => setProjects(data.projects)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const save = async () => { setSaving(true); try { const result = await api.submitFeedback({ rating: Number(rating), projectId: projectId || undefined, comment }); Alert.alert('Thank you', result.message, result.googleReviewUrl ? [{ text: 'Done', onPress: () => router.back() }, { text: 'Review on Google', onPress: () => void Linking.openURL(result.googleReviewUrl!) }] : [{ text: 'Done', onPress: () => router.back() }]); } catch (e: any) { Alert.alert('Could not submit feedback', e.message); } finally { setSaving(false); } };
  return <Screen title="Share Feedback" subtitle="Tell us about your SolarOS experience" onBack={() => router.back()}>{loading ? <Loading /> : error ? <ErrorState message={error} /> : <Card><ChoiceField label="Rating" value={rating} options={['1', '2', '3', '4', '5']} onChange={setRating} />{projects.length ? <OptionField label="Project (optional)" value={projectId} onChange={setProjectId} options={[{ value: '', label: 'General feedback' }, ...projects.map(item => ({ value: item.id, label: `${item.projectName} · ${item.customId}` }))]} /> : null}<FormField label="Comments" value={comment} onChangeText={setComment} multiline /><PrimaryButton label={saving ? 'Submitting…' : 'Submit Feedback'} onPress={() => void save()} disabled={saving} /></Card>}</Screen>;
}
