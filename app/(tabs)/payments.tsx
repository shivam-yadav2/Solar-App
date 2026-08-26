import React from 'react';
import { View, Text } from 'react-native';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatDate } from '../../src/lib/formatters';
import { Screen, Card, Badge, StatCard, Loading, ErrorState, EmptyState } from '../../src/components/ui';
import type { Payment } from '../../src/types';
import { useRouter } from 'expo-router';
import { HeaderButton } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';

export default function PaymentsScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { data, error, isLoading, isRefreshing, refresh, reload } = useFetch(
    () => api.getPayments({ limit: '50' })
  );
  const payments: Payment[] = data?.payments ?? [];
  const summary = data?.summary as { totalCollected?: number } | undefined;

  return (
    <Screen
      title="Payments"
      subtitle="Milestone receipts & collections"
      refreshing={isRefreshing}
      onRefresh={refresh}
      action={hasPermission('payments.create') ? <HeaderButton onPress={() => router.push('/payment-form')} /> : undefined}
    >
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {summary?.totalCollected != null ? (
            <StatCard
              label="Total Received"
              value={formatINR(summary.totalCollected)}
              hint={`${payments.length} transactions`}
              accent="text-emerald-700"
            />
          ) : null}

          {payments.length === 0 ? (
            <EmptyState message="No payments recorded yet." />
          ) : (
            payments.map((p) => (
              <Card key={p.id}>
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-[10px] font-mono text-slate-400">{p.customId}</Text>
                  <Badge
                    text={p.status ?? 'Pending'}
                    tone={p.status === 'Successful' ? 'green' : 'amber'}
                  />
                </View>

                <Text className="text-xl font-bold text-emerald-700">{formatINR(p.amount)}</Text>

                <View className="mt-2 gap-1">
                  <Text className="text-xs text-slate-600">
                    {p.paymentMethod ?? '—'} · {formatDate(p.paymentDate)}
                  </Text>
                  {p.notes ? (
                    <Text className="text-[11px] text-slate-400" numberOfLines={2}>
                      {p.notes}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
