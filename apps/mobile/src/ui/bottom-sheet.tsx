import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppIcon } from './icon';
import { textStyles } from './components';
import { theme } from './theme';

/**
 * Bottom sheet used by training, the calendar and every editor. It is a plain
 * Modal so it behaves identically on every Android version and in tests.
 * The inset context is optional: a sheet rendered outside a provider (tests,
 * isolated previews) simply reserves no extra space instead of crashing.
 */
export function BottomSheet({ visible, title, subtitle, onClose, children, footer }: PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
}>) {
  const insets = useContext(SafeAreaInsetsContext);
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.container}>
        <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets?.bottom ?? 0, theme.spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <AppIcon color={theme.colors.textMuted} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    backgroundColor: theme.colors.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderTopLeftRadius: theme.radii.xxl,
    borderTopRightRadius: theme.radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '90%',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceHighest,
    borderRadius: 99,
    height: 4,
    marginBottom: 14,
    width: 40,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerCopy: { flex: 1, gap: 3 },
  title: { ...textStyles.heading, letterSpacing: -0.2 },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  close: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: { gap: 12, paddingBottom: 16 },
  footer: { paddingTop: 4 },
});
