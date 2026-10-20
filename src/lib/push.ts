import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { APP_VERSION } from './appConfig';

/**
 * Push notifications (Firebase Cloud Messaging). The phone's FCM token is sent
 * to the server after sign-in; Super Admin → Mobile app sends to it, and
 * in-app notifications are forwarded when that's switched on.
 *
 * Needs google-services.json in the project when the APK is built — without
 * it Android has no Firebase app, getDevicePushTokenAsync fails, and the app
 * simply carries on without push.
 */

let currentToken: string | null = null;

const deviceName = () => {
  const c = Platform.constants as { Manufacturer?: string; Model?: string };
  return [c.Manufacturer, c.Model].filter(Boolean).join(' ') || undefined;
};
export const getPushToken = () => currentToken;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Ask permission, get the token and hand it to `save` (the API call). Never throws. */
export async function registerForPush(save: (token: string, info: { platform: string; appVersion: string; deviceName?: string }) => Promise<unknown>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SolarOS',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== 'string' || !data) return;
    currentToken = data;
    await save(data, { platform: Platform.OS, appVersion: APP_VERSION, deviceName: deviceName() });
  } catch (e) {
    // No Firebase config in this build, emulator without Play services, or offline.
    if (__DEV__) console.warn('[push] not registered:', (e as Error).message);
  }
}

/** Tapping a notification opens the notifications screen. */
export function onNotificationTap(open: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) open();
  });
  return () => sub.remove();
}
