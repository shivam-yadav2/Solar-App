import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';

export default function PayrollScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const state = useFetch(async () => { const [payroll, employees, advances] = await Promise.all([api.getPayrollRecords({ limit: '100' }), api.getEmployees({ limit: '100' }), api.getSalaryAdvances({ limit: '100' })]); return { payroll, employees, advances }; });
  const records = state.data?.payroll.records ?? []; const employees = state.data?.employees.employees ?? []; const advances = state.data?.advances.advances ?? []; const summary = state.data?.payroll.summary;
  const remove = (kind: 'employee' | 'record', id: string, label: string) => Alert.alert(`Delete ${kind}?`, label, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { if (kind === 'employee') await api.deleteEmployee(id); else await api.deletePayrollRecord(id); await state.reload(); } catch (e: any) { Alert.alert(`Could not delete ${kind}`, e.message); } } }]);
  return <Screen title="Staff Payroll" subtitle="Employees, salaries and settlements" onBack={() => router.back()} action={<View className="flex-row gap-2"><HeaderButton label="Employee" onPress={() => router.push('/employee-form')} /><HeaderButton label="Run" onPress={() => router.push('/payroll-record-form')} /></View>} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Employees" value={String(employees.length)} /></View><View className="flex-1"><StatCard label="Net Payroll" value={formatINR(summary?.totalNet)} accent="text-blue-700" /></View></View>
      {records.length === 0 ? <EmptyState message="No payroll records yet." /> : records.map(item => <Card key={item.id}>
        <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.employeeName}</Text><Text className="text-xs text-slate-500 mt-1">{item.employeeRole} · {item.month}</Text></View><Badge text={item.status} tone={item.status === 'Paid' ? 'green' : 'amber'} /></View>
        <View className="flex-row mt-3 pt-3 border-t border-slate-100"><View className="flex-1"><Text className="text-[10px] text-slate-400">GROSS</Text><Text className="text-xs font-bold">{formatINR(item.grossSalary)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">DEDUCTIONS</Text><Text className="text-xs font-bold text-rose-600">{formatINR(item.totalDeductions)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">NET</Text><Text className="text-xs font-bold text-emerald-700">{formatINR(item.netSalary)}</Text></View></View>
        {hasPermission('payroll.manage') ? <Pressable onPress={() => remove('record', item.id, `${item.employeeName} · ${item.month}`)} className="mt-3 self-end"><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable> : null}
      </Card>)}
      <Text className="text-xs font-bold text-slate-500 mt-3 mb-2 px-1">EMPLOYEES</Text>
      {employees.map(item => <Card key={item.id}><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.name}</Text><Text className="text-xs text-slate-500 mt-1">{item.role} · {item.department}</Text></View><Badge text={item.status} tone={item.status === 'Active' ? 'green' : 'slate'} /></View><Text className="text-sm font-bold text-slate-800 mt-3">{formatINR(item.baseSalary)} base</Text>{hasPermission('payroll.manage') ? <Pressable onPress={() => remove('employee', item.id, item.name)} className="mt-3 self-end"><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable> : null}</Card>)}
      <View className="flex-row items-center justify-between mt-3 mb-2 px-1"><Text className="text-xs font-bold text-slate-500">SALARY ADVANCES</Text><HeaderButton label="Grant" onPress={() => router.push('/salary-advance-form')} /></View>
      {advances.length === 0 ? <EmptyState message="No salary advances recorded." /> : advances.map(item => <Pressable key={item.id} onPress={() => router.push({ pathname: '/salary-advance-form', params: { id: item.id } })}><Card><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.employeeName}</Text><Text className="text-xs text-slate-500 mt-1">Recovery {item.recoveryMonth} · {item.reason}</Text></View><Badge text={item.isRecovered ? 'Recovered' : 'Pending'} tone={item.isRecovered ? 'green' : 'amber'} /></View><Text className="text-lg font-bold text-amber-700 mt-3">{formatINR(item.amount)}</Text></Card></Pressable>)}
    </>}
  </Screen>;
}
