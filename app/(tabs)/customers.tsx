import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Search, Phone, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatPhone } from '../../src/lib/formatters';
import { Screen, Card, Badge, Loading, ErrorState, EmptyState, HeaderButton } from '../../src/components/ui';
import type { Customer } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

/**
 * Reference implementation for every list screen in this app.
 * Copy this file's shape for Projects / Payments / Invoices / Warranties /
 * Tickets — only the api call, the card body, and the search field change.
 */
export default function CustomersScreen() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, isLoading, isRefreshing, refresh, reload } = useFetch(
    () => api.getCustomers({ search: debounced, limit: '50' }),
    [debounced]
  );

  const customers: Customer[] = data?.customers ?? [];

  return (
    <Screen
      title={user?.role === 'CUSTOMER' ? 'My Profile' : 'Customers'}
      subtitle={user?.role === 'CUSTOMER' ? 'Account and contact information' : 'Residential & commercial solar clients'}
      refreshing={isRefreshing}
      onRefresh={refresh}
      action={hasPermission('customers.create') ? <HeaderButton onPress={() => router.push('/customer-form')} /> : undefined}
    >
      <View className="relative mb-3">
        <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
          <Search size={16} color="#94a3b8" />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, phone, or ID…"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-white border border-slate-200 rounded-xl text-base text-slate-900 pl-10 pr-3 py-3"
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : customers.length === 0 ? (
        <EmptyState message={debounced ? `No customers match "${debounced}".` : 'No customers yet.'} />
      ) : (
        customers.map((c) => <CustomerCard key={c.id} customer={c} />)
      )}
    </Screen>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push({ pathname: '/customer/[id]', params: { id: customer.id } })}>
      <Card>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-[10px] font-mono text-slate-400">{customer.customId}</Text>
          <Badge
            text={customer.status ?? 'Active'}
            tone={customer.status === 'Active' ? 'green' : 'slate'}
          />
        </View>

        <Text className="text-base font-bold text-slate-900 mb-2">{customer.name}</Text>

        <View className="gap-1.5">
          {customer.mobile ? (
            <View className="flex-row items-center gap-2">
              <Phone size={13} color="#64748b" />
              <Text className="text-xs text-slate-600">{formatPhone(customer.mobile)}</Text>
            </View>
          ) : null}
          {customer.city ? (
            <View className="flex-row items-center gap-2">
              <MapPin size={13} color="#64748b" />
              <Text className="text-xs text-slate-600">
                {customer.city}
                {customer.state ? `, ${customer.state}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-3 pt-2.5 border-t border-slate-100">
          <Text className="text-[11px] text-slate-500">
            Portal:{' '}
            <Text
              className={
                customer.accountStatus === 'Enabled'
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-400 font-semibold'
              }
            >
              {customer.accountStatus ?? 'Disabled'}
            </Text>
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
