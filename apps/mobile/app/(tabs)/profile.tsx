import { Text, View } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  return (
    <Screen>
      <Text style={textStyles.title}>Perfil</Text>
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 8, padding: 18 }}>
        <Text style={textStyles.heading}>{user?.name}</Text>
        <Text style={textStyles.muted}>{user?.email}</Text>
      </View>
      <PrimaryButton onPress={() => void logout()}>Cerrar sesión</PrimaryButton>
    </Screen>
  );
}
