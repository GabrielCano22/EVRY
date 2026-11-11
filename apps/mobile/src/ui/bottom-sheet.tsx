import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { textStyles } from './components';
import { theme } from './theme';

/**
 * Bottom sheet used by the training screen and the calendar. It is a plain
 * Modal so it works the same on every Android version and inside tests.
 * The inset context is optional: a sheet rendered outside a provider (tests,
 * isolated previews) simply reserves no extra space instead of crashing.
 */
export function BottomSheet({ visible, title, onClose, children, footer }: PropsWithChildren<{
  visible: boolean;
  title: string;
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
            <Text accessibilityRole="header" style={textStyles.heading}>{title}</Text>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  handle: { alignSelf: 'center', backgroundColor: theme.colors.surfaceHigh, borderRadius: 99, height: 4, marginBottom: 10, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingBottom: 8 },
  close: { justifyContent: 'center', minHeight: 44, minWidth: 44 },
  closeText: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
  content: { gap: 10, paddingBottom: 12 },
});
