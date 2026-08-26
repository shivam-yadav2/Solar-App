import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { ProjectExpense } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function ExpensesScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const state = useFetch(() => api.getExpenses({ limit: '100' }));
  const expenses: ProjectExpense[] = state.data?.expenses ?? [];
  const total = state.data?.summary?.totalExpense;
  const remove = (item: ProjectExpense) => Alert.alert('Delete expense?', item.expenseName, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteExpense(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete expense', e.message); } } }]);
  return (
    <Screen title="Expenses" subtitle="Project costs and vendor bills" onBack={() => router.back()} action={hasPermission('expenses.create') ? <HeaderButton onPress={() => router.push('/expense-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
      {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
        <StatCard label="Total Expenses" value={formatINR(total ?? expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))} hint={`${expenses.length} entries`} accent="text-rose-600" />
        {expenses.length === 0 ? <EmptyState message="No expenses recorded yet." /> : expenses.map((item) => (
          <Card key={item.id}>
            <View className="flex-row justify-between items-start gap-3">
              <View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.expenseName}</Text><Text className="text-xs text-slate-500 mt-1">{item.vendor || 'No vendor'} · {formatDate(item.date)}</Text></View>
              <Text className="text-base font-bold text-rose-600">{formatINR(item.amount)}</Text>
            </View>
            <View className="mt-3"><Badge text={item.expenseCategory || 'Other'} /></View>
            {item.remark ? <Text className="text-xs text-slate-400 mt-2">{item.remark}</Text> : null}
            {hasPermission('expenses.delete') ? <Pressable onPress={() => remove(item)} className="mt-3 self-end"><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable> : null}
          </Card>
        ))}
      </>}
    </Screen>
  );
}
