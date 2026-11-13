import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SET_TYPE_LABELS, setTypeOf } from '@evry/domain';
import type { LocalWorkoutSet } from './workout-domain';
import { BottomSheet } from '../ui/bottom-sheet';
import { PrimaryButton } from '../ui/components';
import { theme } from '../ui/theme';

const techniqueOptions = [
  { value: null, label: 'Sin registrar' },
  { value: true, label: 'Estable' },
  { value: false, label: 'Inestable' },
] as const;

export function SetOptionsSheet({ visible, set, ordinal, onUpdate, onDelete, onClose }: {
  visible: boolean;
  set: LocalWorkoutSet | null;
  ordinal: string;
  onUpdate: (changes: Partial<LocalWorkoutSet>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} title={`Serie ${ordinal}`} visible={visible && set !== null}>
      {set ? <>
        <Text style={styles.type}>Tipo: {SET_TYPE_LABELS[setTypeOf(set)]}</Text>
        <Text style={styles.label}>RPE (esfuerzo percibido, 1–10)</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="RPE" style={styles.chips}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <Pressable
              accessibilityLabel={`RPE ${value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: set.rpe === value }}
              key={value}
              onPress={() => onUpdate({ rpe: value })}
              style={[styles.chip, set.rpe === value && styles.chipSelected]}
            >
              <Text style={[styles.chipText, set.rpe === value && styles.chipTextSelected]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        {set.rpe !== null ? <Pressable accessibilityLabel="Quitar RPE" accessibilityRole="button" onPress={() => onUpdate({ rpe: null })} style={styles.clear}>
          <Text style={styles.clearText}>Quitar RPE</Text>
        </Pressable> : null}
        <Text style={styles.label}>Técnica</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Técnica" style={styles.technique}>
          {techniqueOptions.map((option) => {
            const selected = set.techniqueStable === option.value;
            return (
              <Pressable
                accessibilityLabel={`Técnica ${option.label}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.label}
                onPress={() => onUpdate({ techniqueStable: option.value })}
                style={[styles.techniqueOption, selected && styles.techniqueSelected]}
              >
                <Text style={selected ? styles.techniqueTextSelected : styles.techniqueText}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton onPress={onDelete} variant="danger">Eliminar serie</PrimaryButton>
      </> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  type: { color: theme.colors.textMuted, fontSize: 13 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  chipTextSelected: { color: theme.colors.onPrimary },
  clear: { justifyContent: 'center', minHeight: 40 },
  clearText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  technique: { flexDirection: 'row', gap: 6 },
  techniqueOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  techniqueSelected: { backgroundColor: theme.colors.primary },
  techniqueText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  techniqueTextSelected: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: '700' },
});
