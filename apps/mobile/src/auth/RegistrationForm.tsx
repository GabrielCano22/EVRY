import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { RegisterInput } from '../api/client';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';

type Field = 'name' | 'email' | 'password' | 'confirmation';

export function RegistrationForm({ busy, error, onSubmit }: {
  busy: boolean;
  error: string | null;
  onSubmit: (input: RegisterInput) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [trackCycle, setTrackCycle] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const submit = () => {
    if (busy) return;
    const next: Partial<Record<Field, string>> = {};
    if (name.trim().length < 2) next.name = 'Escribe un nombre de al menos 2 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Escribe un correo electrónico válido.';
    if (password.length < 8) next.password = 'Usa al menos 8 caracteres.';
    if (password !== confirmation) next.confirmation = 'Las contraseñas no coinciden.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), password, trackCycle });
  };
  return (
    <View style={styles.form}>
      <Text style={textStyles.title}>Crear cuenta</Text>
      <Text style={textStyles.muted}>Necesitas conexión para registrarte. Después podrás entrenar sin conexión.</Text>
      <Text style={textStyles.body}>Nombre</Text>
      <TextInput accessibilityLabel="Nombre" autoComplete="name" editable={!busy} maxLength={100} value={name} onChangeText={setName} style={styles.input} />
      {errors.name ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.name}</Text> : null}
      <Text style={textStyles.body}>Correo electrónico</Text>
      <TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" editable={!busy} maxLength={254} value={email} onChangeText={setEmail} style={styles.input} />
      {errors.email ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.email}</Text> : null}
      <Text style={textStyles.body}>Contraseña</Text>
      <TextInput accessibilityLabel="Contraseña" autoCapitalize="none" autoComplete="new-password" autoCorrect={false} editable={!busy} maxLength={128} secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      {errors.password ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.password}</Text> : null}
      <Text style={textStyles.body}>Confirmar contraseña</Text>
      <TextInput accessibilityLabel="Confirmar contraseña" autoCapitalize="none" autoComplete="new-password" autoCorrect={false} editable={!busy} maxLength={128} secureTextEntry value={confirmation} onChangeText={setConfirmation} style={styles.input} />
      {errors.confirmation ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.confirmation}</Text> : null}
      <View style={styles.choice}>
        <View style={styles.copy}>
          <Text style={textStyles.body}>Seguimiento de ciclo</Text>
          <Text style={textStyles.muted}>Opcional para cualquier persona. Puedes cambiarlo en Perfil.</Text>
        </View>
        <Switch accessibilityLabel="Activar seguimiento de ciclo" disabled={busy} value={trackCycle} onValueChange={setTrackCycle} />
      </View>
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
      <PrimaryButton disabled={busy} onPress={submit}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing.md, width: '100%', maxWidth: 440, alignSelf: 'center' },
  input: { borderWidth: 1, borderColor: '#414755', backgroundColor: theme.colors.surfaceHigh,
    color: theme.colors.text, borderRadius: theme.radii.lg, minHeight: 52, fontSize: 16, paddingHorizontal: theme.spacing.md },
  choice: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  copy: { flex: 1 },
});
