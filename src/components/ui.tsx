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
  <SafeAreaView className="flex-1 bg-slate-50" edges={[]}>
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      bottomOffset={28}
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-4 flex-row items-center gap-3">
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center">
            <ArrowLeft size={18} color="#334155" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900">{title}</Text>
          {subtitle ? <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text> : null}
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
  <View className={`bg-white rounded-2xl border border-slate-200 p-4 mb-3 ${className}`}>
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
    <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</Text>
    <Text className={`text-2xl font-bold mt-1 ${accent}`}>{value}</Text>
    {hint ? <Text className="text-[11px] text-slate-400 mt-1">{hint}</Text> : null}
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
      <Pressable onPress={onRetry} className="mt-3 bg-slate-900 rounded-lg py-2 items-center">
        <Text className="text-white text-xs font-semibold">Retry</Text>
      </Pressable>
    ) : null}
  </Card>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <Card>
    <Text className="text-xs text-slate-400 text-center py-6">{message}</Text>
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
      className="bg-white border border-slate-200 rounded-xl text-base text-slate-900 pl-10 pr-3 py-3"
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
    className={`rounded-xl px-4 py-3 items-center ${disabled ? 'bg-slate-300' : 'bg-slate-900 active:bg-slate-700'}`}
  >
    <Text className="text-white text-sm font-semibold">{label}</Text>
  </Pressable>
);

export const HeaderButton: React.FC<{ label?: string; onPress: () => void }> = ({ label = 'Add', onPress }) => (
  <Pressable onPress={onPress} className="min-h-10 bg-slate-900 rounded-xl px-3 items-center justify-center active:bg-slate-700">
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
    <Text className="text-xs font-semibold text-slate-600 mb-1.5">{label}{required ? ' *' : ''}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      className={`bg-white border border-slate-200 rounded-xl text-base text-slate-900 px-3 py-3 ${multiline ? 'min-h-24' : ''}`}
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
        <Pressable key={option} onPress={() => onChange(option)} className={`rounded-lg border px-3 py-2 ${value === option ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
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
}> = ({ label, value, options, onChange }) => (
  <View className="mb-4">
    <Text className="text-xs font-semibold text-slate-600 mb-2">{label}</Text>
    <View className="gap-2">
      {options.map(option => (
        <Pressable key={option.value} onPress={() => onChange(option.value)} className={`rounded-xl border px-3 py-3 ${value === option.value ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
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
