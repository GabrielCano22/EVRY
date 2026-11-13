import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Material Symbols wrapper. The Android symbol set is bundled by expo-symbols,
 * so the icons keep the same weight and optical size across the app.
 */
export function AppIcon({
  name,
  size = 20,
  color = '#F4F6F9',
  style,
}: {
  name: AndroidSymbol;
  size?: number;
  color?: ColorValue;
  style?: object;
}) {
  return (
    <SymbolView
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      name={{ android: name }}
      size={size}
      style={style}
      tintColor={color}
    />
  );
}
