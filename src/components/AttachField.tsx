import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileUp, Paperclip, X } from 'lucide-react-native';
import { api } from '../lib/api';
import { radius, space, T, Tap, useOverlay, useTheme } from '../ds';

export interface Attached { fileId: string; fileName: string; uri?: string; mimeType?: string }

/** Take a photo / pick an image or file and upload it (receipts, site photos, documents). */
export const AttachField: React.FC<{ label: string; value: Attached | null; onChange: (a: Attached | null) => void; documents?: boolean; hint?: string }> = ({ label, value, onChange, documents = true, hint }) => {
  const p = useTheme();
  const { actions, toast } = useOverlay();
  const [busy, setBusy] = useState(false);
  const upload = async (file: { uri: string; name: string; mimeType?: string }) => {
    setBusy(true);
    try {
      const r = await api.uploadFile(file);
      onChange({ fileId: r.fileId, fileName: r.fileName || file.name, uri: file.uri, mimeType: file.mimeType });
    } catch (e: any) { toast(e.message || 'Upload failed', 'error'); } finally { setBusy(false); }
  };
  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { toast('Allow camera access in Settings to take photos.', 'error'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (!r.canceled && r.assets[0]) await upload({ uri: r.assets[0].uri, name: r.assets[0].fileName || `photo-${Date.now()}.jpg`, mimeType: r.assets[0].mimeType || 'image/jpeg' });
  };
  const fromLibrary = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (!r.canceled && r.assets[0]) await upload({ uri: r.assets[0].uri, name: r.assets[0].fileName || `image-${Date.now()}.jpg`, mimeType: r.assets[0].mimeType || 'image/jpeg' });
  };
  const fromFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!r.canceled && r.assets[0]) await upload({ uri: r.assets[0].uri, name: r.assets[0].name, mimeType: r.assets[0].mimeType || undefined });
  };
  const choose = () => actions({
    title: label,
    items: [
      { label: 'Take photo', icon: <Camera size={20} color={p.accentText} />, onPress: () => void fromCamera() },
      { label: 'Choose from photos', icon: <Paperclip size={20} color={p.accentText} />, onPress: () => void fromLibrary() },
      ...(documents ? [{ label: 'Choose a file (PDF…)', icon: <FileUp size={20} color={p.accentText} />, onPress: () => void fromFiles() }] : []),
    ],
  });
  const isImage = value?.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(value?.fileName || '');
  return (
    <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 6 }}>
      <T variant="footnote" color="secondary">{label}</T>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          {isImage && value.uri ? <Image source={{ uri: value.uri }} style={{ width: 52, height: 52, borderRadius: radius.s }} /> : <View style={{ width: 52, height: 52, borderRadius: radius.s, backgroundColor: p.fill, alignItems: 'center', justifyContent: 'center' }}><Paperclip size={20} color={p.secondary} /></View>}
          <T variant="body" numberOfLines={1} style={{ flex: 1 }}>{value.fileName}</T>
          <Tap onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Remove attachment"><X size={20} color={p.secondary} /></Tap>
        </View>
      ) : (
        <Tap onPress={busy ? undefined : choose} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          {busy ? <ActivityIndicator color={p.accent} /> : <Camera size={20} color={p.accentText} />}
          <T variant="body" color="accent">{busy ? 'Uploading…' : 'Add photo or file'}</T>
        </Tap>
      )}
      {hint ? <T variant="caption" color="secondary">{hint}</T> : null}
    </View>
  );
};
