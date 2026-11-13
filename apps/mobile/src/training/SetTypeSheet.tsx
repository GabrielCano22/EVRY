import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SET_TYPES, SET_TYPE_CHIPS, SET_TYPE_HELP, SET_TYPE_LABELS, type SetType,
} from '@evry/domain';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppIcon } from '../ui/icon';
import { textStyles } from '../ui/components';
import { theme } from '../ui/theme';

export const setTypeColors: Record<SetType, string> = {
  WARMUP: theme.colors.warning,
  NORMAL: theme.colors.textMuted,
  FAILURE: theme.colors.error,
  DROP: theme.colors.secondary,
};

export function setTypeColor(setType: SetType): string {
  return setTypeColors[setType];
}

export function SetTypeSheet({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: SetType;
  onSelect: (setType: SetType) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      onClose={onClose}
      subtitle="El tipo define el descanso y si la serie cuenta para el volumen."
      title="Tipo de serie"
      visible={visible}
    >
      <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de serie" style={styles.options}>
        {SET_TYPES.map((type) => {
          const selected = type === current;
          return (
            <Pressable
              accessibilityLabel={`${SET_TYPE_LABELS[type]}. ${SET_TYPE_HELP[type]}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={type}
              onPress={() => onSelect(type)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.chip, { backgroundColor: `${setTypeColors[type]}22`, borderColor: setTypeColors[type] }]}>
                <Text style={[styles.chipText, { color: setTypeColors[type] }]}>{SET_TYPE_CHIPS[type] || 'N'}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={textStyles.body}>{SET_TYPE_LABELS[type]}</Text>
                <Text style={styles.help}>{SET_TYPE_HELP[type]}</Text>
              </View>
              {selected ? (
                <View style={styles.check}>
                  <AppIcon color={theme.colors.onPrimary} name="check" size={15} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: theme.spacing.sm },
  option: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.gutter,
    minHeight: 64,
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: 10,
  },
  optionSelected: { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.primary },
  chip: { alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  chipText: { fontSize: 14, fontWeight: '800' },
  copy: { flex: 1, gap: 2 },
  help: { color: theme.colors.textMuted, fontSize: 12 },
  check: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
