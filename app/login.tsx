import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, User } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAuth } from '../src/context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    label: 'Tenant Admin',
    subtitle: 'Solar EPC Workspace ERP',
    email: 'admin@suryashaktisolar.com',
    password: 'admin123',
    Icon: Building2,
    tint: '#34d399',
  },
  {
    label: 'Customer',
    subtitle: 'Self-Service Solar Portal',
    email: 'amit.sharma@example.com',
    password: 'customer123',
    Icon: User,
    tint: '#60a5fa',
  },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const doLogin = async (id: string, pw: string) => {
    if (!id || !pw) {
      Alert.alert('Missing details', 'Enter both email/username and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(id, pw);
    } catch (err: any) {
      Alert.alert('Sign in failed', err?.message || 'Invalid login credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
          paddingBottom: 56,
        }}
        bottomOffset={28}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
          {/* Brand */}
          <View className="items-center mb-8">
            <View className="w-36 h-36 rounded-[32px] overflow-hidden mb-4 border border-slate-700 bg-slate-900">
              <Image
                source={require('../assets/branding/brand-login-icon-v3.jpg')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="w-full max-w-sm h-20 rounded-2xl bg-slate-50 items-center justify-center px-4 mb-3 border border-slate-700">
              <Image
                source={require('../assets/branding/brand-wordmark-mobile.png')}
                className="w-full h-16"
                resizeMode="contain"
              />
            </View>
            <Text className="text-slate-400 text-xs mt-1 text-center">
              Multi-Tenant Solar EPC ERP &amp; Customer Portal
            </Text>
          </View>

          {/* Email */}
          <Text className="text-slate-300 text-xs font-medium mb-1.5">Email or Username</Text>
          <View className="relative mb-4">
            <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
              <Mail size={16} color="#64748b" />
            </View>
            <TextInput
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              placeholder="you@company.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              className="bg-slate-900 border border-slate-700 rounded-xl text-white text-base pl-10 pr-3 py-3"
            />
          </View>

          {/* Password */}
          <Text className="text-slate-300 text-xs font-medium mb-1.5">Password</Text>
          <View className="relative mb-5">
            <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
              <Lock size={16} color="#64748b" />
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              className="bg-slate-900 border border-slate-700 rounded-xl text-white text-base pl-10 pr-12 py-3"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={12}
              className="absolute right-3 top-0 bottom-0 justify-center z-10"
            >
              {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </Pressable>
          </View>

          {/* Submit */}
          <Pressable
            onPress={() => doLogin(emailOrUsername, password)}
            disabled={isSubmitting}
            className={`rounded-xl py-3.5 flex-row items-center justify-center gap-2 ${
              isSubmitting ? 'bg-amber-500/50' : 'bg-amber-500 active:bg-amber-400'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <>
                <Text className="text-slate-950 font-semibold text-base">Sign In</Text>
                <ArrowRight size={18} color="#020617" />
              </>
            )}
          </Pressable>

          {/* Quick demo access — mirrors the web login page */}
          <View className="mt-8 pt-6 border-t border-slate-800">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">
              Quick Demo Access
            </Text>
            {DEMO_ACCOUNTS.map(({ label, subtitle, email, password: pw, Icon, tint }) => (
              <Pressable
                key={label}
                onPress={() => doLogin(email, pw)}
                disabled={isSubmitting}
                className="flex-row items-center gap-3 bg-slate-900 border border-slate-800 active:bg-slate-800 rounded-xl p-3 mb-2"
              >
                <View className="w-9 h-9 rounded-lg bg-slate-800 items-center justify-center">
                  <Icon size={18} color={tint} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xs font-semibold">{label}</Text>
                  <Text className="text-slate-400 text-[10px]">{subtitle}</Text>
                </View>
              </Pressable>
            ))}
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
