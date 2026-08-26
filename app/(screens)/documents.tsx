import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { API_BASE, api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatFileSize } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';
import type { ProjectDocument } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function DocumentsScreen() {
  const router = useRouter(); const state = useFetch(() => api.getDocuments({ limit: '100' })); const items: ProjectDocument[] = state.data?.documents ?? [];
  const { hasPermission } = useAuth();
  return <Screen title="Documents" subtitle="Project files and certificates" onBack={() => router.back()} action={hasPermission('documents.create') ? <HeaderButton onPress={() => router.push('/document-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No documents uploaded yet." /> : items.map((item) => <Pressable key={item.id} onPress={() => item.fileId ? void Linking.openURL(`${API_BASE}/files/${encodeURIComponent(item.fileId)}`) : undefined}><Card>
      <View className="flex-row gap-3"><View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center"><FileText size={19} color="#2563eb" /></View><View className="flex-1"><Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{item.name}</Text><Text className="text-xs text-slate-500 mt-1">{item.fileName}</Text><Text className="text-[10px] text-slate-400 mt-1">{formatFileSize(item.fileSize)} · {formatDate(item.createdAt)}</Text></View><Badge text={item.category} /></View>
    </Card></Pressable>)}
  </Screen>;
}
