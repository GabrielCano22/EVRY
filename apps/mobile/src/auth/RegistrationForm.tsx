import { useState, type ReactNode } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { RegisterInput } from '../api/client';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { registrationPasswordError } from '@evry/domain';

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
    const passwordError = registrationPasswordError(password);
    if (passwordError) next.password = passwordError;
    if (password !== confirmation) next.confirmation = 'Las contraseñas no coinciden.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), password, trackCycle });
  };
  return (
    <View style={styles.form}>
      <View style={styles.intro}>
        <Text style={textStyles.title}>Crear cuenta</Text>
        <Text style={textStyles.muted}>Necesitas conexión para registrarte. Después podrás entrenar sin conexión.</Text>
      </View>
      <View style={styles.card}>
        <FormField error={errors.name} label="Nombre">
          <TextInput accessibilityLabel="Nombre" autoComplete="name" editable={!busy} maxLength={100} value={name} onChangeText={setName} style={styles.input} placeholder="Tu nombre" placeholderTextColor={theme.colors.textDim} />
        </FormField>
        <FormField error={errors.email} label="Correo electrónico">
          <TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" editable={!busy} maxLength={254} value={email} onChangeText={setEmail} style={styles.input} placeholder="tu@correo.com" placeholderTextColor={theme.colors.textDim} />
        </FormField>
        <FormField error={errors.password} hint="Mínimo 8 caracteres y máximo 72 bytes UTF-8; las letras acentuadas y los emoji pueden ocupar varios bytes." label="Contraseña">
          <TextInput accessibilityLabel="Contraseña" autoCapitalize="none" autoComplete="new-password" autoCorrect={false} editable={!busy} maxLength={128} secureTextEntry value={password} onChangeText={setPassword} style={styles.input} placeholder="Crea una contraseña" placeholderTextColor={theme.colors.textDim} />
        </FormField>
        <FormField error={errors.confirmation} label="Confirmar contraseña">
          <TextInput accessibilityLabel="Confirmar contraseña" autoCapitalize="none" autoComplete="new-password" autoCorrect={false} editable={!busy} maxLength={128} secureTextEntry value={confirmation} onChangeText={setConfirmation} style={styles.input} placeholder="Repite la contraseña" placeholderTextColor={theme.colors.textDim} />
        </FormField>

        <View style={styles.choice}>
          <View style={styles.copy}>
            <Text style={textStyles.body}>Seguimiento de ciclo</Text>
            <Text style={textStyles.muted}>Opcional para cualquier persona. Puedes cambiarlo en Perfil.</Text>
          </View>
          <Switch
            accessibilityLabel="Activar seguimiento de ciclo"
            disabled={busy}
            thumbColor={trackCycle ? theme.colors.text : theme.colors.textDim}
            trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.primary }}
            value={trackCycle}
            onValueChange={setTrackCycle}
          />
        </View>

        {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
        <PrimaryButton disabled={busy} onPress={submit}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</PrimaryButton>
      </View>
    </View>
  );
}

function FormField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { alignSelf: 'center', gap: theme.spacing.lg, maxWidth: 440, width: '100%' },
  intro: { gap: 6 },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  field: { gap: 7 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: theme.colors.textDim, fontSize: 12, lineHeight: 17 },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choice: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  copy: { flex: 1, gap: 2 },
});
