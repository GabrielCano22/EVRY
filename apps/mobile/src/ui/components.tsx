import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import type { SyncQueueState } from '../sync/queue-policy';
import { theme } from './theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>;
}

export function PrimaryButton({ children, disabled, ...props }: PropsWithChildren<PressableProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}

export function LoadingScreen() {
  return (
    <View style={[styles.screen, styles.center]}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={styles.muted}>Preparando EVRY…</Text>
    </View>
  );
}

const syncLabels: Record<SyncQueueState, string> = {
  pending: 'Guardado localmente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  requires_review: 'Requiere revisión',
};

export function SyncStatus({ state }: { state: SyncQueueState }) {
  return (
    <View accessibilityRole="text" style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: state === 'requires_review' ? theme.colors.error : theme.colors.success }]} />
      <Text style={styles.pillText}>{syncLabels[state]}</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '800' },
  heading: { color: theme.colors.text, fontSize: 21, fontWeight: '700' },
  body: { color: theme.colors.text, fontSize: 16, lineHeight: 23 },
  muted: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.error, fontSize: 14 },
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  muted: { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '700' },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dot: { borderRadius: 99, height: 8, width: 8 },
  pillText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
});
