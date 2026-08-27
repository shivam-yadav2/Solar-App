import { Redirect } from 'expo-router';

/**
 * Expo Router needs a route matching the bare "/" path, or a cold start
 * shows the "Unmatched Route" screen before AuthGate's redirect logic in
 * _layout.tsx ever runs. Always bounce to /login — AuthGate immediately
 * redirects onward to /(tabs)/dashboard if a session is already active.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
