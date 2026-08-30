import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useSessionStore } from '@/src/auth/session-store';
import { SyncCoordinator } from '@/src/sync/SyncCoordinator';
import { useTrainingStore } from '@/src/training/training-store';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeSession = useSessionStore((state) => state.initialize);
  const initializeTraining = useTrainingStore((state) => state.initialize);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));

  useEffect(() => {
    void Promise.all([initializeSession(), initializeTraining()])
      .finally(() => SplashScreen.hideAsync());
  }, [initializeSession, initializeTraining]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <SyncCoordinator />
        <Stack screenOptions={{ contentStyle: { backgroundColor: '#0a141d' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
