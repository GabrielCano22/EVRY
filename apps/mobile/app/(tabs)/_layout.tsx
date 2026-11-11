import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import { Platform, Text, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/auth/session-store';
import { useTrainingStore } from '@/src/training/training-store';
import { LoadingScreen, PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const ready = useTrainingStore((state) => state.ready);
  const trainingSession = useTrainingStore((state) => state.session);
  const error = useTrainingStore((state) => state.error);
  const initialize = useTrainingStore((state) => state.initialize);
  // Some Android gesture hosts report zero navigation-bar inset (observed on
  // ColorOS). Reserve an app-owned gutter, not a claimed OS inset measurement.
  const bottomGutter = Platform.OS === 'android'
    ? Math.max(insets.bottom, theme.spacing.lg)
    : insets.bottom;
  // Icon slot (28), button padding (10), gap (8), plus a scaling label line.
  const tabContentHeight = Math.max(theme.spacing.xxl, Math.ceil(46 + 18 * Math.max(1, fontScale)));
  if (status === 'checking') return <LoadingScreen />;
  if (status !== 'authenticated') return <Redirect href="/login" />;
  if (!ready || session !== trainingSession) {
    if (error && session) return <Screen><Text accessibilityRole="alert" style={textStyles.error}>{error}</Text><PrimaryButton onPress={() => void initialize(session)}>Reintentar almacenamiento local</PrimaryButton></Screen>;
    return <LoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceHigh,
          height: tabContentHeight + bottomGutter,
          paddingBottom: bottomGutter,
        },
        tabBarLabelStyle: { fontSize: theme.spacing.gutter, lineHeight: 18 },
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
