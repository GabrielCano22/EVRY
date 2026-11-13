import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View, useWindowDimensions, type ColorValue } from 'react-native';
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
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundElevated,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabContentHeight + bottomGutter,
          paddingBottom: bottomGutter,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
        tabBarIconStyle: { marginBottom: -1 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => <TabIcon active={focused} name={{ ios: 'house.fill', android: 'home', web: 'home' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ color, focused }) => <TabIcon active={focused} name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, focused }) => <TabIcon active={focused} name={{ ios: 'chart.line.uptrend.xyaxis', android: 'show_chart', web: 'show_chart' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <TabIcon active={focused} name={{ ios: 'person.fill', android: 'person', web: 'person' }} color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, active }: {
  name: Parameters<typeof SymbolView>[0]['name'];
  color: ColorValue;
  active: boolean;
}) {
  return (
    <View style={styles.iconSlot}>
      <SymbolView name={name} tintColor={color} size={23} />
      <View style={[styles.activeDot, active && styles.activeDotVisible]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconSlot: { alignItems: 'center', gap: 3, justifyContent: 'center' },
  activeDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 99,
    height: 3,
    opacity: 0,
    width: 3,
  },
  activeDotVisible: { opacity: 1 },
});
