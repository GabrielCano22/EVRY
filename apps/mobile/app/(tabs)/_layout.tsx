import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { LoadingScreen } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function TabLayout() {
  const status = useSessionStore((state) => state.status);
  const trackCycle = useSessionStore((state) => state.user?.trackCycle ?? false);
  if (status === 'checking') return <LoadingScreen />;
  if (status !== 'authenticated') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceHigh },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'house.fill', android: 'home', web: 'home' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'chart.line.uptrend.xyaxis', android: 'show_chart', web: 'show_chart' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{
          title: 'Ciclo',
          href: trackCycle ? '/cycle' : null,
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'person.fill', android: 'person', web: 'person' }} color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: Parameters<typeof SymbolView>[0]['name']; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={24} />;
}
