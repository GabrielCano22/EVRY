import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { SyncQueueState } from '../sync/queue-policy';
import type { LocalSaveState } from '../training/training-store';
import { AppIcon } from './icon';
import { theme } from './theme';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'cycle';

const toneColor: Record<Tone, string> = {
  default: theme.colors.textMuted,
  primary: theme.colors.primary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  error: theme.colors.error,
  cycle: theme.colors.cycle,
};

const toneSoft: Record<Tone, string> = {
  default: theme.colors.surfaceHigh,
  primary: theme.colors.primarySoft,
  success: theme.colors.successSoft,
  warning: theme.colors.warningSoft,
  error: theme.colors.errorSoft,
  cycle: theme.colors.cycleSoft,
};

export function Screen({
  children,
  scroll = true,
  contentStyle,
  padded = true,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; padded?: boolean }>) {
  const insets = useContext(SafeAreaInsetsContext);
  const top = Math.max(insets?.top ?? 0, theme.spacing.sm);
  const style = [styles.screen, padded && styles.screenPadded, { paddingTop: top + theme.spacing.sm }, contentStyle];
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView
      contentContainerStyle={style}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  tone = 'default',
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: Tone;
}>) {
  const cardStyle = [
    styles.card,
    tone !== 'default' && { backgroundColor: toneSoft[tone], borderColor: toneColor[tone] + '59' },
    style,
  ];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <AppIcon name="chevron_right" size={16} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function PrimaryButton({
  children,
  disabled,
  variant = 'primary',
  icon,
  compact = false,
  style,
  ...props
}: PropsWithChildren<PressableProps & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
      <Text style={[
        styles.buttonText,
        variant === 'primary' && styles.buttonTextPrimary,
        variant === 'secondary' && styles.buttonTextSecondary,
        variant === 'ghost' && styles.buttonTextGhost,
        variant === 'danger' && styles.buttonTextDanger,
      ]}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  tone = 'default',
  disabled,
}: {
  name: Parameters<typeof AppIcon>[0]['name'];
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: toneSoft[tone] },
        pressed && styles.pressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <AppIcon color={toneColor[tone]} name={name} size={21} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  tone = 'primary',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: Parameters<typeof AppIcon>[0]['name'];
  tone?: Tone;
}) {
  const color = selected ? theme.colors.onPrimary : toneColor[tone];
  const body = (
    <>
      {icon ? <AppIcon color={color} name={icon} size={16} /> : null}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={[styles.chip, selected && styles.chipSelected]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : { backgroundColor: toneSoft[tone] },
        pressed && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: toneSoft[tone] }]}>
      <Text style={[styles.badgeText, { color: toneColor[tone] }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'E';
  return (
    <View style={[styles.avatar, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: Parameters<typeof AppIcon>[0]['name'];
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statTile, style]}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon ? <AppIcon color={toneColor[tone]} name={icon} size={17} /> : null}
      </View>
      <Text numberOfLines={1} style={styles.statValue}>{value}</Text>
      {hint ? <Text style={[styles.statHint, { color: toneColor[tone] }]}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressRing({
  size,
  strokeWidth = 8,
  progress,
  color = theme.colors.primary,
  trackColor = theme.colors.surfaceHigh,
  children,
}: PropsWithChildren<{
  size: number;
  strokeWidth?: number;
  progress: number;
  color?: ColorValue;
  trackColor?: ColorValue;
}>) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ alignItems: 'center', height: size, justifyContent: 'center', width: size }}>
      <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      {children}
    </View>
  );
}

export function EmptyState({
  icon = 'info',
  title,
  description,
  action,
}: {
  icon?: Parameters<typeof AppIcon>[0]['name'];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon color={theme.colors.primary} name={icon} size={28} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      {leading ? <View style={styles.listLeading}>{leading}</View> : null}
      <View style={styles.listCopy}>
        <Text numberOfLines={1} style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.listTrailing}>{trailing}</View> : null}
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{body}</View>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <View style={styles.wordmarkRow}>
      <Text style={[styles.wordmark, { fontSize: size }]}>EVRY</Text>
      <View style={[styles.wordmarkDot, { height: size * 0.18, width: size * 0.18 }]} />
    </View>
  );
}

const syncLabels: Record<SyncQueueState, string> = {
  pending: 'Guardado localmente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  requires_review: 'Requiere revisión',
};

export function SyncStatus({ state, localSaveState = 'saved' }: { state: SyncQueueState; localSaveState?: LocalSaveState }) {
  const label = localSaveState === 'saving' ? 'Guardando en este dispositivo…'
    : localSaveState === 'failed' ? 'No se pudo guardar el último cambio' : syncLabels[state];
  const failed = localSaveState === 'failed' || state === 'requires_review';
  const color: ColorValue = failed ? theme.colors.error
    : localSaveState === 'saving' ? theme.colors.warning
      : state === 'synced' ? theme.colors.success : theme.colors.textMuted;
  return (
    <View accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={[styles.screen, styles.center]}>
      <Wordmark size={30} />
      <ActivityIndicator color={theme.colors.primary} size="small" style={{ marginTop: theme.spacing.lg }} />
      <Text style={styles.muted}>Preparando EVRY…</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  display: { color: theme.colors.text, fontSize: theme.type.display, fontWeight: '800', letterSpacing: -1.1 },
  title: { color: theme.colors.text, fontSize: theme.type.title, fontWeight: '800', letterSpacing: -0.7 },
  heading: { color: theme.colors.text, fontSize: theme.type.heading, fontWeight: '700', letterSpacing: -0.25 },
  subheading: { color: theme.colors.text, fontSize: theme.type.subheading, fontWeight: '700' },
  body: { color: theme.colors.text, fontSize: theme.type.body, lineHeight: 22 },
  muted: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  caption: { color: theme.colors.textDim, fontSize: theme.type.caption, lineHeight: 16 },
  error: { color: theme.colors.error, fontSize: 14, lineHeight: 20 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  number: { color: theme.colors.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
} satisfies Record<string, TextStyle>);

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
  },
  screenPadded: {
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: theme.colors.textMuted, fontSize: 14, marginTop: theme.spacing.sm },
  header: { gap: theme.spacing.xs, paddingBottom: theme.spacing.xs },
  headerCopy: { gap: 3 },
  headerTitle: { color: theme.colors.text, fontSize: theme.type.title, fontWeight: '800', letterSpacing: -0.8 },
  headerSubtitle: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  headerAction: { position: 'absolute', right: 0, top: 4 },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  pressed: { opacity: 0.82 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  sectionDetail: { color: theme.colors.textMuted, fontSize: 12 },
  sectionAction: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 32 },
  sectionActionText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  button: {
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  buttonCompact: { minHeight: 42, paddingHorizontal: theme.spacing.md },
  buttonPrimary: { backgroundColor: theme.colors.primary },
  buttonSecondary: { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: theme.colors.errorSoft },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  buttonDisabled: { opacity: 0.4 },
  buttonIcon: { alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  buttonTextPrimary: { color: theme.colors.onPrimary },
  buttonTextSecondary: { color: theme.colors.text },
  buttonTextGhost: { color: theme.colors.textMuted },
  buttonTextDanger: { color: theme.colors.error },
  iconButton: {
    alignItems: 'center',
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  chip: {
    alignItems: 'center',
    borderRadius: theme.radii.full,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: theme.radii.full, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderColor: 'rgba(22,141,255,0.35)',
    borderWidth: 1,
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.primary, fontWeight: '800' },
  statTile: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 4,
    minWidth: '44%',
    padding: theme.spacing.md,
  },
  statHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  statLabel: { color: theme.colors.textMuted, flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  statHint: { fontSize: 11, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 58,
    justifyContent: 'center',
    marginBottom: 4,
    width: 58,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { marginTop: theme.spacing.sm },
  divider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth },
  listRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.gutter,
    minHeight: 58,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  listLeading: { alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1, gap: 2 },
  listTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  listSubtitle: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  listTrailing: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  dot: { borderRadius: 99, height: 7, width: 7 },
  pillText: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  wordmarkRow: { alignItems: 'flex-start', flexDirection: 'row' },
  wordmark: { color: theme.colors.text, fontStyle: 'italic', fontWeight: '900', letterSpacing: -1.6 },
  wordmarkDot: { backgroundColor: theme.colors.primary, borderRadius: 99, marginLeft: 4, marginTop: 3 },
});
