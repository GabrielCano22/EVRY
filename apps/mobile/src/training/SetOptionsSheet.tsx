import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SET_TYPE_LABELS, setTypeOf } from '@evry/domain';
import type { LocalWorkoutSet } from './workout-domain';
import { BottomSheet } from '../ui/bottom-sheet';
import { PrimaryButton, textStyles } from '../ui/components';
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
        <Text style={textStyles.muted}>Tipo: {SET_TYPE_LABELS[setTypeOf(set)]}</Text>
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
          <Text style={textStyles.muted}>Quitar RPE</Text>
        </Pressable> : null}
        <Text style={styles.label}>Técnica</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Técnica" style={styles.technique}>
          {techniqueOptions.map((option) => (
            <Pressable
              accessibilityLabel={`Técnica ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: set.techniqueStable === option.value }}
              key={option.label}
              onPress={() => onUpdate({ techniqueStable: option.value })}
              style={styles.techniqueOption}
            >
              <Text style={textStyles.body}>{set.techniqueStable === option.value ? '✓ ' : ''}{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton onPress={onDelete}>Eliminar serie</PrimaryButton>
      </> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { alignItems: 'center', backgroundColor: theme.colors.surfaceHigh, borderRadius: 9, height: 44, justifyContent: 'center', width: 44 },
  chipSelected: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  chipTextSelected: { color: theme.colors.onPrimary },
  clear: { justifyContent: 'center', minHeight: 44 },
  technique: { gap: 4 },
  techniqueOption: { justifyContent: 'center', minHeight: 44 },
});
