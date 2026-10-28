import React, { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileImage, FileText, FolderOpen, Plus, Share2 } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { toPage, usePaged } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate, formatFileSize } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SearchBar, useOverlay, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';
import type { ProjectDocument } from '../../src/types';

const CATEGORIES = ['all', 'Agreement', 'Quotation', 'Installation Report', 'Site Survey', 'UPPCL Document', 'Net Metering', 'Completion Certificate', 'Payment Receipt', 'Other'];

export default function DocumentsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { toast, actions } = useOverlay();
  const { user, hasPermission: can } = useAuth();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const docs = usePaged<ProjectDocument & { customerName?: string; projectName?: string }>(['documents', 'list', search, category], async (page, limit) => {
    const r: any = await api.getDocuments({ page: String(page), limit: String(limit), q: search, category });
    return toPage(r.documents, r, page);
  });
  const open = async (item: ProjectDocument, share = false) => {
    try {
      const url = await api.getFileUrl(item.fileId);
      if (share) await Share.share({ title: item.name, message: `${item.name}\n${url}`, url });
      else await Linking.openURL(url);
    } catch (e: any) { toast(e.message || 'Could not open this file', 'error'); }
  };
  const menu = (item: ProjectDocument) => actions({ title: item.name, items: [
    { label: 'Open document', icon: <FileText size={20} color={p.accentText} />, onPress: () => void open(item) },
    { label: 'Share secure link', icon: <Share2 size={20} color={p.accentText} />, onPress: () => void open(item, true) },
  ] });
  return (
    <ListScreen<any>
      title="Documents" subtitle={user?.role === 'CUSTOMER' ? 'Your project files and certificates' : 'Project files and customer certificates'} back large={false}
      right={can('documents.create') && user?.role !== 'CUSTOMER' ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="Upload document" onPress={() => router.push('/document-form')} /> : undefined}
      header={<>
        <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder="Name, file, ID or category" />
        <Chips value={category} onChange={setCategory} options={CATEGORIES.map((value) => ({ value, label: value === 'all' ? 'All' : value }))} />
        {docs.loading ? <ListSkeleton /> : docs.error ? <ErrorState message={docs.error} onRetry={docs.refresh} /> : null}
      </>}
      data={docs.loading || docs.error ? [] : docs.items}
      keyExtractor={(item) => item.id}
      refreshing={docs.refreshing}
      onRefresh={docs.refresh}
      onEndReached={docs.loadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={!docs.loading && !docs.error ? <EmptyState icon={<FolderOpen size={44} color={p.tertiary} />} title={search || category !== 'all' ? 'No matching documents' : 'No documents yet'} action={can('documents.create') && user?.role !== 'CUSTOMER' && !search ? { title: 'Upload document', onPress: () => router.push('/document-form') } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={docs.loadingMore} hasMore={docs.hasMore} count={docs.items.length} total={docs.total} noun="documents" />}
      renderItem={({ item, index }) => {
        const image = item.fileMime?.startsWith('image/');
        return <GroupedItem index={index} count={docs.items.length} inset={58}>
          <Row icon={<IconTile icon={image ? <FileImage size={17} color={p.purple} /> : <FileText size={17} color={p.blue} />} tone={image ? 'purple' : 'blue'} />}
            title={item.name}
            subtitle={[item.projectName, item.customerName, item.fileName, formatFileSize(item.fileSize), formatDate(item.createdAt)].filter(Boolean).join(' · ')}
            accessory={<Badge text={item.category} tone="gray" />}
            onPress={() => void open(item)}
            onLongPress={() => menu(item)} />
        </GroupedItem>;
      }}
    />
  );
}
