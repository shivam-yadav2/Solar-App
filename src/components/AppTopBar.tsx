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
        <View className="w-9 h-9 rounded-xl bg-amber-500 items-center justify-center overflow-hidden">
          {remoteLogo ? (
            <Image source={{ uri: remoteLogo }} className="w-9 h-9" resizeMode="contain" />
          ) : (
            <Image
              source={require('../../assets/branding/brand-mark.png')}
              className="w-8 h-8"
              resizeMode="contain"
            />
          )}
        </View>

        <View className="flex-1 ml-3 mr-2">
          <Text className="text-white text-sm font-bold" numberOfLines={1}>
            {tenant?.name || 'SolarOS'}
          </Text>
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
