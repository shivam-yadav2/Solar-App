import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Card, FormField, PrimaryButton, Screen } from '../../src/components/ui';

export default function AccountSecurityScreen() {
  const router = useRouter(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [saving, setSaving] = useState(false);
  const save = async () => { if (password.length < 6) { Alert.alert('Password too short', 'Use at least six characters.'); return; } if (password !== confirm) { Alert.alert('Passwords do not match'); return; } setSaving(true); try { await api.changePassword(password); Alert.alert('Password updated', 'Your new password is active.'); router.back(); } catch (e: any) { Alert.alert('Could not change password', e.message); } finally { setSaving(false); } };
  return <Screen title="Account Security" subtitle="Change your login password" onBack={() => router.back()}><Card><FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry required /><FormField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry required /><PrimaryButton label={saving ? 'Updating…' : 'Update Password'} onPress={() => void save()} disabled={saving} /></Card></Screen>;
}
