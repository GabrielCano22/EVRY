import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SET_TYPES, SET_TYPE_CHIPS, SET_TYPE_HELP, SET_TYPE_LABELS, type SetType,
} from '@evry/domain';
import { BottomSheet } from '../ui/bottom-sheet';
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
    <BottomSheet onClose={onClose} title="Tipo de serie" visible={visible}>
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
              <View style={[styles.chip, { borderColor: setTypeColors[type] }]}>
                <Text style={[styles.chipText, { color: setTypeColors[type] }]}>{SET_TYPE_CHIPS[type] || 'N'}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={textStyles.body}>{SET_TYPE_LABELS[type]}</Text>
                <Text style={textStyles.muted}>{SET_TYPE_HELP[type]}</Text>
              </View>
              <Text style={styles.check}>{selected ? '✓' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 6 },
  option: {
    alignItems: 'center',
    borderColor: theme.colors.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSelected: { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.primary },
  chip: { alignItems: 'center', borderRadius: 8, borderWidth: 2, height: 34, justifyContent: 'center', width: 34 },
  chipText: { fontSize: 14, fontWeight: '800' },
  copy: { flex: 1 },
  check: { color: theme.colors.success, fontSize: 18, fontWeight: '800', minWidth: 20, textAlign: 'center' },
});
