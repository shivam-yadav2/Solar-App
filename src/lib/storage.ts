import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** SecureStore on phones; localStorage on web (used only for the browser preview). */
const web = Platform.OS === 'web';
export const store = {
  get: async (key: string): Promise<string | null> => (web ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key)),
  set: async (key: string, value: string): Promise<void> => { if (web) globalThis.localStorage?.setItem(key, value); else await SecureStore.setItemAsync(key, value); },
  del: async (key: string): Promise<void> => { if (web) globalThis.localStorage?.removeItem(key); else await SecureStore.deleteItemAsync(key); },
};
