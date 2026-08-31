import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export const AppTopBar: React.FC = () => {
  const router = useRouter();
  const { tenant, user } = useAuth();
  const remoteLogo = tenant?.branding?.logoUrl?.trim();

  return (
    <SafeAreaView className="bg-[#071426]" edges={['top']}>
      <View className="h-16 px-4 flex-row items-center border-b border-[#20304a] bg-[#0b1b31]">
        <View className="w-9 h-9 rounded-xl bg-[#102846] items-center justify-center overflow-hidden">
          <Image
            source={require('../../assets/branding/brand-adaptive-foreground-v3.png')}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        <Text className="ml-2 text-white text-base font-extrabold tracking-tight">SolarOS</Text>

        <View className="flex-1 ml-3 mr-3">
          <View className="flex-row items-center gap-1.5">
            {remoteLogo ? <Image source={{ uri: remoteLogo }} className="w-4 h-4 rounded-md" resizeMode="contain" /> : null}
            <Text className="flex-1 text-slate-100 text-xs font-bold" numberOfLines={1}>
              {tenant?.name || (user?.role === 'SUPER_ADMIN' ? 'Platform Console' : 'SolarOS Workspace')}
            </Text>
          </View>
          <Text className="text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>
            {user?.role === 'CUSTOMER' ? 'Customer Portal' : 'Solar EPC Operations'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          className="w-11 h-11 rounded-2xl bg-[#102846] border border-[#29415f] items-center justify-center active:bg-[#173554]"
        >
          <Bell size={18} color="#f8fafc" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
