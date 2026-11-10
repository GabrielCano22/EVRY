import { useState } from 'react';
import type { components } from '@evry/api-client';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { textStyles } from '../ui/components';
import { theme } from '../ui/theme';

type MuscleGroup = components['schemas']['MuscleDistribution']['muscleGroup'];
type Distribution = Pick<components['schemas']['MuscleDistribution'], 'muscleGroup' | 'workingSets'>;
type Sex = components['schemas']['User']['biologicalSex'];
type Model = 'male' | 'female';

// These are broad primary-muscle groups, not individual muscle measurements.
const regions = new Map<MuscleGroup, readonly Slug[]>([
  ['CHEST', ['chest']], ['BACK', ['upper-back', 'lower-back']], ['SHOULDERS', ['deltoids']],
  ['BICEPS', ['biceps']], ['TRICEPS', ['triceps']], ['FOREARMS', ['forearm']], ['CORE', ['abs', 'obliques']],
  ['QUADS', ['quadriceps']], ['HAMSTRINGS', ['hamstring']], ['GLUTES', ['gluteal']], ['CALVES', ['calves']],
]);

export function muscleShade(sets: number, maximum: number): string {
  if (!Number.isFinite(sets) || sets <= 0 || !Number.isFinite(maximum) || maximum <= 0) return '#4A505A';
  const ratio = sets / maximum;
  return ratio <= 1 / 3 ? '#245F94' : ratio <= 2 / 3 ? '#197CC8' : '#168DFF';
}

export function bodyMapParts(distribution: readonly Distribution[]): ExtendedBodyPart[] {
  const counts = new Map<MuscleGroup, number>();
  for (const { muscleGroup, workingSets } of distribution) {
    if (!regions.has(muscleGroup) || !Number.isFinite(workingSets) || workingSets <= 0) continue;
    counts.set(muscleGroup, (counts.get(muscleGroup) ?? 0) + workingSets);
  }
  const maximum = Math.max(0, ...counts.values());
  return [...counts].flatMap(([group, count]) =>
    (regions.get(group) ?? []).map((slug) => ({ slug, color: muscleShade(count, maximum) })));
}

export function BodyMuscleMap({ distribution, sex }: { distribution: readonly Distribution[]; sex: Sex | undefined }) {
  const [model, setModel] = useState<Model>(sex === 'FEMALE' ? 'female' : 'male');
  const [showLicense, setShowLicense] = useState(false);
  const { width } = useWindowDimensions();
  const parts = bodyMapParts(distribution);
  const scale = Math.max(0.48, Math.min(0.76, (width - 112) / 400));
  const body = sex === 'FEMALE' ? 'femenina' : sex === 'MALE' ? 'masculina' : 'neutral';
  return (
    <View style={styles.container}>
      <Text style={textStyles.heading}>Mapa muscular</Text>
      <Text style={textStyles.muted}>Esquema {body} orientativo · azul relativo a las series útiles por grupo principal.</Text>
      <Text style={textStyles.muted}>El modelo visual no cambia tu perfil ni determina tu sexo.</Text>
      <View style={styles.selector} accessibilityRole="radiogroup" accessibilityLabel="Modelo visual">
        {([{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }] as const).map((option) => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: model === option.value }}
            onPress={() => setModel(option.value)} style={[styles.option, model === option.value && styles.optionSelected]}>
            <Text style={model === option.value ? styles.optionTextSelected : textStyles.body}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.pair} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {(['front', 'back'] as const).map((side) => (
          <View key={side} style={styles.column}>
            <Body data={parts} gender={model} side={side} scale={scale} border="#737D88" defaultFill="#4A505A" />
            <Text style={textStyles.muted}>{side === 'front' ? 'Frente' : 'Espalda'}</Text>
          </View>
        ))}
      </View>
      <Text style={textStyles.muted}>Gris: sin series clasificadas · Azul: menos a más series. No mide activación ni fatiga.</Text>
      <Text style={textStyles.muted}>Las zonas representan grupos amplios, no la activación de músculos individuales.</Text>
      {distribution.some((item) => (item.muscleGroup === 'FULL_BODY' || item.muscleGroup === 'CARDIO') && item.workingSets > 0) ? (
        <Text style={textStyles.muted}>Cuerpo completo y cardio se muestran en el resumen, sin asignarlos a zonas específicas.</Text>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLicense }} onPress={() => setShowLicense(!showLicense)}>
        <Text style={styles.credit}>Créditos de la ilustración</Text>
      </Pressable>
      {showLicense ? <Text selectable style={textStyles.muted}>{license}</Text> : null}
    </View>
  );
}

const license = `react-native-body-highlighter — MIT License\nCopyright (c) 2022 ELABBASSI Hicham\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 999, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  optionSelected: { backgroundColor: theme.colors.primary },
  optionTextSelected: { color: theme.colors.onPrimary, fontWeight: '700' },
  pair: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  column: { alignItems: 'center', gap: 4 },
  credit: { color: theme.colors.primary, paddingVertical: 8 },
});
