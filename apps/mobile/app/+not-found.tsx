import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <Screen>
        <Text style={textStyles.title}>Esta pantalla no existe.</Text>
        <Link href="/" style={{ color: theme.colors.primary }}>
          Volver al inicio
        </Link>
      </Screen>
    </>
  );
}
