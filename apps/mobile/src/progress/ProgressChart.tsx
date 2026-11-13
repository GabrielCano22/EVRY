import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText,
} from 'react-native-svg';
import { theme } from '../ui/theme';

export interface ProgressChartPoint {
  from: string;
  to: string;
  volumeKg: number;
  maxWeightKg: number | null;
  estimated1RMKg: number | null;
}

const WIDTH = 320;
const HEIGHT = 150;
const LEFT = 28;
const RIGHT = 12;
const TOP = 18;
const BOTTOM = 28;

function valueOf(point: ProgressChartPoint): number | null {
  return point.estimated1RMKg ?? point.maxWeightKg;
}

/**
 * A compact line chart for the progress screen. It prefers estimated 1RM,
 * falls back to max weight, and never invents points for periods without data.
 */
export function ProgressChart({ points }: { points: readonly ProgressChartPoint[] }) {
  const values = points
    .map((point) => ({ point, value: valueOf(point) }))
    .filter((item): item is { point: ProgressChartPoint; value: number } => item.value !== null && Number.isFinite(item.value) && item.value > 0);
  if (values.length < 2) return null;

  const numbers = values.map((item) => item.value);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const span = Math.max(1, max - min);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (index * plotWidth) / Math.max(1, values.length - 1);
  const y = (value: number) => TOP + (1 - (value - min) / span) * plotHeight;
  const line = values.map((item, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${TOP + plotHeight} L${x(0).toFixed(1)},${TOP + plotHeight} Z`;
  const first = values[0].value;
  const last = values[values.length - 1].value;
  const unit = points.some((point) => point.estimated1RMKg !== null) ? '1RM estimado' : 'peso máximo';
  const lastPoint = values[values.length - 1];

  return <View
    accessibilityLabel={`Gráfica de evolución (${unit}): de ${first.toFixed(1)} a ${last.toFixed(1)} kg en ${values.length} periodos.`}
    accessibilityRole="image"
    style={styles.wrapper}
    testID="progress-chart"
  >
    <Svg height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%">
      <Defs>
        <LinearGradient id="evryProgressFill" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.32" />
          <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Line stroke={theme.colors.border} strokeWidth="1" x1={LEFT} x2={WIDTH - RIGHT} y1={TOP} y2={TOP} />
      <Line stroke={theme.colors.border} strokeWidth="1" x1={LEFT} x2={WIDTH - RIGHT} y1={TOP + plotHeight} y2={TOP + plotHeight} />
      <Path d={area} fill="url(#evryProgressFill)" />
      <Path d={line} fill="none" stroke={theme.colors.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <Circle cx={x(values.length - 1)} cy={y(lastPoint.value)} fill={theme.colors.primary} r="4.5" />
      <SvgText fill={theme.colors.textMuted} fontSize="10" x={LEFT} y={TOP - 5}>{`${max.toFixed(1)} kg`}</SvgText>
      <SvgText fill={theme.colors.textMuted} fontSize="10" x={LEFT} y={TOP + plotHeight + 14}>{`${min.toFixed(1)} kg`}</SvgText>
      <SvgText fill={theme.colors.text} fontSize="11" fontWeight="700" textAnchor="end" x={WIDTH - RIGHT} y={TOP + plotHeight + 14}>
        {`${last.toFixed(1)} kg`}
      </SvgText>
    </Svg>
    <Text style={styles.caption}>{unit} por periodo · {values.length} puntos con datos</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 2 },
  caption: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
});
