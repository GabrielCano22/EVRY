import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useSessionStore } from '@/src/auth/session-store';
import { SyncCoordinator } from '@/src/sync/SyncCoordinator';
import { useTrainingStore } from '@/src/training/training-store';
import { AccountQueryProvider } from '@/src/auth/AccountQueryProvider';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeSession = useSessionStore((state) => state.initialize);
  const initializeTraining = useTrainingStore((state) => state.initialize);
  const session = useSessionStore((state) => state.session);
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);
  useEffect(() => {
    if (session) void initializeTraining(session);
  }, [session, initializeTraining]);
  useEffect(() => {
    if (status !== 'checking') void SplashScreen.hideAsync();
  }, [status]);

  return (
    <AccountQueryProvider session={session}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <SyncCoordinator />
        <Stack screenOptions={{ contentStyle: { backgroundColor: '#0a141d' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </AccountQueryProvider>
  );
}
