import { useState } from 'react';
import type { components } from '@evry/api-client';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { AppIcon } from '../ui/icon';
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
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <AppIcon color={theme.colors.primary} name="person" size={18} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Mapa muscular</Text>
          <Text style={styles.caption}>Esquema {body} orientativo · azul relativo a las series útiles por grupo principal.</Text>
        </View>
      </View>

      <Text style={styles.note}>El modelo visual no cambia tu perfil ni determina tu sexo.</Text>

      <View accessibilityLabel="Modelo visual" accessibilityRole="radiogroup" style={styles.selector}>
        {([{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }] as const).map((option) => {
          const selected = model === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => setModel(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={selected ? styles.optionTextSelected : styles.optionText}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.pair}>
        {(['front', 'back'] as const).map((side) => (
          <View key={side} style={styles.column}>
            <View style={styles.figure}>
              <Body data={parts} defaultFill="#4A505A" gender={model} scale={scale} side={side} border="#737D88" />
            </View>
            <Text style={styles.sideLabel}>{side === 'front' ? 'Frente' : 'Espalda'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#4A505A' }]} />
          <Text style={styles.legendText}>Sin series</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#245F94' }]} />
          <View style={[styles.swatch, { backgroundColor: '#197CC8' }]} />
          <View style={[styles.swatch, { backgroundColor: '#168DFF' }]} />
          <Text style={styles.legendText}>Menos a más</Text>
        </View>
      </View>

      <Text style={styles.caption}>Gris: sin series clasificadas · Azul: menos a más series. No mide activación ni fatiga.</Text>
      <Text style={styles.caption}>Las zonas representan grupos amplios, no la activación de músculos individuales.</Text>
      {distribution.some((item) => (item.muscleGroup === 'FULL_BODY' || item.muscleGroup === 'CARDIO') && item.workingSets > 0) ? (
        <Text style={styles.caption}>Cuerpo completo y cardio se muestran en el resumen, sin asignarlos a zonas específicas.</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showLicense }}
        onPress={() => setShowLicense(!showLicense)}
        style={styles.creditRow}
      >
        <Text style={styles.credit}>Créditos de la ilustración</Text>
        <AppIcon color={theme.colors.primary} name={showLicense ? 'expand_less' : 'expand_more'} size={18} />
      </Pressable>
      {showLicense ? <Text selectable style={styles.license}>{license}</Text> : null}
    </View>
  );
}

const license = `react-native-body-highlighter — MIT License\nCopyright (c) 2022 ELABBASSI Hicham\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerCopy: { flex: 1, gap: 1 },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  caption: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  note: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  optionSelected: { backgroundColor: theme.colors.primary },
  optionTextSelected: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: '800' },
  optionText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'center' },
  column: { alignItems: 'center', gap: 2 },
  figure: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  sideLabel: { color: theme.colors.textDim, fontSize: 11, fontWeight: '600' },
  legend: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  swatch: { borderRadius: 3, height: 8, width: 8 },
  legendText: { color: theme.colors.textMuted, fontSize: 10, marginLeft: 2 },
  creditRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 40,
  },
  credit: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  license: { color: theme.colors.textDim, fontSize: 10, lineHeight: 15 },
});
