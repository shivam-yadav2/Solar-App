import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileUp, Paperclip, X } from 'lucide-react-native';
import { uploadWithProgress } from '../lib/transfers';
import { radius, space, T, Tap, useOverlay, useTheme } from '../ds';

export interface Attached { fileId: string; fileName: string; fileSize?: number; uri?: string; mimeType?: string }

/** Take a photo / pick an image or file and upload it (receipts, site photos, documents). */
export const AttachField: React.FC<{ label: string; value: Attached | null; onChange: (a: Attached | null) => void; documents?: boolean; hint?: string }> = ({ label, value, onChange, documents = true, hint }) => {
  const p = useTheme();
  const { actions, toast } = useOverlay();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<AbortController | null>(null);
  const upload = async (file: { uri: string; name: string; mimeType?: string; size?: number }) => {
    const next = new AbortController(); setController(next); setProgress(0);
    setBusy(true);
    try {
      const r = await uploadWithProgress(file, { signal: next.signal, onProgress: setProgress, retries: 1 });
      onChange({ fileId: r.fileId, fileName: r.fileName || file.name, fileSize: r.fileSize, uri: file.uri, mimeType: r.mimeType || file.mimeType });
    } catch (e: any) { toast(e.message || 'Upload failed', 'error'); } finally { setBusy(false); setController(null); }
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
    if (!r.canceled && r.assets[0]) await upload({ uri: r.assets[0].uri, name: r.assets[0].name, mimeType: r.assets[0].mimeType || undefined, size: r.assets[0].size });
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
        <Tap onPress={busy ? undefined : choose} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }} accessibilityRole="button" accessibilityLabel={busy ? `Uploading, ${Math.round(progress * 100)} percent` : 'Add photo or file'}>
          {busy ? <ActivityIndicator color={p.accent} /> : <Camera size={20} color={p.accentText} />}
          {busy ? <T variant="caption" color="secondary" accessibilityLiveRegion="polite">{Math.round(progress * 100)}%</T> : null}
          {busy ? <Tap onPress={() => controller?.abort()} accessibilityRole="button" accessibilityLabel="Cancel upload" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><X size={18} color={p.red} /></Tap> : null}
          <T variant="body" color="accent">{busy ? 'Uploading…' : 'Add photo or file'}</T>
        </Tap>
      )}
      {hint ? <T variant="caption" color="secondary">{hint}</T> : null}
    </View>
  );
};

/** Several site photos (camera or gallery), each uploaded as it is added. */
export const PhotosField: React.FC<{ label: string; value: Attached[]; onChange: (v: Attached[]) => void; max?: number }> = ({ label, value, onChange, max = 8 }) => {
  const p = useTheme();
  const { actions, toast } = useOverlay();
  const [busy, setBusy] = useState(0);
  const add = async (assets: { uri: string; fileName?: string | null; mimeType?: string | null }[]) => {
    const room = max - value.length;
    const list = assets.slice(0, room);
    setBusy(list.length);
    const added: Attached[] = [];
    for (const a of list) {
      try {
        const r = await uploadWithProgress({ uri: a.uri, name: a.fileName || `site-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' }, { retries: 1 });
        added.push({ fileId: r.fileId, fileName: r.fileName, fileSize: r.fileSize, uri: a.uri, mimeType: r.mimeType || 'image/jpeg' });
      } catch (e: any) { toast(e.message || 'A photo did not upload', 'error'); }
      setBusy((n) => n - 1);
    }
    onChange([...value, ...added]);
  };
  const choose = () => actions({ title: label, items: [
    { label: 'Take photo', icon: <Camera size={20} color={p.accentText} />, onPress: async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast('Allow camera access in Settings.', 'error'); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.5, mediaTypes: ['images'] });
      if (!r.canceled) await add(r.assets);
    } },
    { label: 'Choose from photos', icon: <Paperclip size={20} color={p.accentText} />, onPress: async () => {
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, max - value.length) });
      if (!r.canceled) await add(r.assets);
    } },
  ] });
  return (
    <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 8 }}>
      <T variant="footnote" color="secondary">{label} · {value.length}/{max}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {value.map((a) => (
          <View key={a.fileId}>
            <Image source={{ uri: a.uri }} style={{ width: 72, height: 72, borderRadius: radius.s, backgroundColor: p.fill }} />
            <Tap onPress={() => onChange(value.filter((x) => x.fileId !== a.fileId))} hitSlop={8} style={{ position: 'absolute', top: -12, right: -12, width: 44, height: 44, borderRadius: 22, backgroundColor: p.label, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Remove photo">
              <X size={13} color={p.bg} strokeWidth={3} />
            </Tap>
          </View>
        ))}
        {busy > 0 ? <View style={{ width: 72, height: 72, borderRadius: radius.s, backgroundColor: p.fill, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={p.accent} /></View> : null}
        {value.length < max && !busy ? (
          <Tap onPress={choose} style={{ width: 72, height: 72, borderRadius: radius.s, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.tertiary, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Add photo">
            <Camera size={22} color={p.accentText} />
          </Tap>
        ) : null}
      </View>
    </View>
  );
};
