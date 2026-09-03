import React from 'react';
import { View, Text, ActivityIndicator, Pressable, RefreshControl, TextInput } from 'react-native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/** Page chrome shared by every screen: title, subtitle, pull-to-refresh. */
export const Screen: React.FC<{
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, refreshing, onRefresh, onBack, action, children }) => (
  <SafeAreaView className="flex-1 bg-[#f6f8fb]" edges={[]}>
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }}
      bottomOffset={28}
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-5 flex-row items-center gap-3">
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 items-center justify-center shadow-sm">
            <ArrowLeft size={18} color="#334155" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-[23px] font-bold tracking-tight text-slate-950">{title}</Text>
          {subtitle ? <Text className="text-[13px] text-slate-500 mt-1">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </KeyboardAwareScrollView>
  </SafeAreaView>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <View
    className={`bg-white rounded-[20px] border border-slate-200/80 p-4 mb-3 shadow-sm ${className}`}
    style={{ shadowColor: '#0f172a', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}
  >
    {children}
  </View>
);

/** KPI tile — the mobile equivalent of the web dashboard's stat cards. */
export const StatCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}> = ({ label, value, hint, accent = 'text-slate-900' }) => (
  <Card>
    <View className="flex-row items-center justify-between">
      <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-[1.2px]">{label}</Text>
      <View className="h-1.5 w-7 rounded-full bg-amber-400" />
    </View>
    <Text className={`text-[27px] font-extrabold mt-2 tracking-tight ${accent}`}>{value}</Text>
    {hint ? <Text className="text-xs text-slate-400 mt-1">{hint}</Text> : null}
  </Card>
);

export const Badge: React.FC<{ text: string; tone?: 'green' | 'amber' | 'rose' | 'slate' }> = ({
  text,
  tone = 'slate',
}) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
  } as const;
  return (
    <View className={`px-2 py-0.5 rounded-md self-start ${tones[tone].split(' ')[0]}`}>
      <Text className={`text-[10px] font-semibold ${tones[tone].split(' ')[1]}`}>{text}</Text>
    </View>
  );
};

export const Loading: React.FC = () => (
  <View className="py-16 items-center">
    <ActivityIndicator color="#f59e0b" />
  </View>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <Card>
    <Text className="text-sm font-semibold text-rose-600 mb-1">Couldn't load data</Text>
    <Text className="text-xs text-slate-500">{message}</Text>
    {onRetry ? (
    <Pressable onPress={onRetry} className="mt-4 min-h-11 bg-slate-900 rounded-xl py-3 items-center justify-center active:bg-slate-700">
        <Text className="text-white text-xs font-semibold">Retry</Text>
      </Pressable>
    ) : null}
  </Card>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <Card>
    <Text className="text-sm text-slate-400 text-center py-7">{message}</Text>
  </Card>
);

export const SearchField: React.FC<{
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChangeText, placeholder = 'Search…' }) => (
  <View className="relative mb-3">
    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
      <Search size={16} color="#94a3b8" />
    </View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      autoCapitalize="none"
      autoCorrect={false}
    className="bg-white border border-slate-200 rounded-2xl text-base text-slate-900 pl-11 pr-3 py-3.5 min-h-12"
    />
  </View>
);

export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    className={`rounded-2xl px-4 py-3.5 min-h-12 items-center justify-center ${disabled ? 'bg-slate-300' : 'bg-slate-900 active:bg-slate-700'}`}
  >
    <Text className="text-white text-sm font-semibold">{label}</Text>
  </Pressable>
);

export const HeaderButton: React.FC<{ label?: string; onPress: () => void }> = ({ label = 'Add', onPress }) => (
  <Pressable onPress={onPress} className="min-h-11 bg-slate-900 rounded-2xl px-4 items-center justify-center active:bg-slate-700">
    <Text className="text-xs font-semibold text-white">{label}</Text>
  </Pressable>
);

export const FormField: React.FC<{
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  required?: boolean;
  secureTextEntry?: boolean;
}> = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline, required, secureTextEntry }) => (
  <View className="mb-4">
    <Text className="text-xs font-bold text-slate-600 mb-2">{label}{required ? ' *' : ''}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      className={`bg-white border border-slate-200 rounded-2xl text-base text-slate-900 px-4 py-3.5 min-h-12 ${multiline ? 'min-h-28' : ''}`}
    />
  </View>
);

export const ChoiceField: React.FC<{
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <View className="mb-4">
    <Text className="text-xs font-semibold text-slate-600 mb-2">{label}</Text>
    <View className="flex-row flex-wrap gap-2">
      {options.map(option => (
        <Pressable key={option} onPress={() => onChange(option)} className={`rounded-xl border px-4 py-2.5 min-h-11 justify-center ${value === option ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
          <Text className={`text-xs font-semibold ${value === option ? 'text-amber-800' : 'text-slate-600'}`}>{option}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export const OptionField: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ label, value, options, onChange, disabled }) => (
  <View className="mb-4">
    <Text className="text-xs font-semibold text-slate-600 mb-2">{label}</Text>
    <View className={`gap-2 ${disabled ? 'opacity-50' : ''}`}>
      {options.map(option => (
        <Pressable key={option.value} disabled={disabled} onPress={() => onChange(option.value)} className={`rounded-2xl border px-4 py-3.5 min-h-12 justify-center ${value === option.value ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
          <Text className={`text-xs font-semibold ${value === option.value ? 'text-amber-800' : 'text-slate-700'}`}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <View className="flex-row py-2 border-b border-slate-100 last:border-b-0">
    <Text className="w-32 text-xs text-slate-400">{label}</Text>
    <Text className="flex-1 text-xs font-medium text-slate-700">{value || '—'}</Text>
  </View>
);
