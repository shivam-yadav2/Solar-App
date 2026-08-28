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
    <SafeAreaView className="bg-black" edges={['top']}>
      <View className="h-14 px-4 flex-row items-center border-b border-slate-800 bg-slate-950">
        <View className="w-28 h-9 rounded-lg bg-slate-50 px-2 py-1 items-center justify-center overflow-hidden">
          <Image
            source={require('../../assets/branding/brand-wordmark-mobile.png')}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 ml-3 mr-2">
          <View className="flex-row items-center gap-1.5">
            {remoteLogo ? <Image source={{ uri: remoteLogo }} className="w-4 h-4 rounded" resizeMode="contain" /> : null}
            <Text className="flex-1 text-white text-xs font-bold" numberOfLines={1}>
              {tenant?.name || (user?.role === 'SUPER_ADMIN' ? 'Platform Console' : 'SolarOS Workspace')}
            </Text>
          </View>
          <Text className="text-slate-400 text-[10px]" numberOfLines={1}>
            {user?.role === 'CUSTOMER' ? 'Customer Portal' : 'Solar EPC Operations'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center active:bg-slate-800"
        >
          <Bell size={18} color="#f8fafc" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
