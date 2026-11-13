import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileSession } from '../api/client';
import { CachedThumbnail } from './CachedThumbnail';
import { muscleTargetLabel } from './muscle-labels';
import { mediaUrl } from './media-url';
import { mobileThumbnailCache } from './thumbnail-files';
import type { Exercise } from './catalog';
import { AppIcon } from '../ui/icon';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';

/** Shared exercise detail used by the session picker and the routine editor. */
export function ExercisePreview({ exercise, session, onClose }: {
  exercise: Exercise;
  session: MobileSession;
  onClose?: () => void;
}) {
  const [playingGif, setPlayingGif] = useState(false);
  const image = mediaUrl(exercise.imageUrl ?? exercise.imagePath, session.serverUrl);
  const gif = mediaUrl(exercise.gifUrl ?? exercise.gifPath, session.serverUrl);
  const source = playingGif ? gif : image;
  return <View accessibilityLabel={`Vista previa de ${exercise.name}`} style={styles.preview}>
    <View style={styles.header}>
      <Text style={styles.title}>{exercise.name}</Text>
      {onClose ? <Pressable accessibilityLabel="Cerrar vista previa" accessibilityRole="button" onPress={onClose} style={styles.close}>
        <AppIcon color={theme.colors.textMuted} name="close" size={19} />
      </Pressable> : null}
    </View>
    <Text style={textStyles.body}>Equipo: {exercise.equipmentLabel ?? exercise.equipment}</Text>
    <Text style={textStyles.body}>Músculo: {muscleTargetLabel(exercise.target, exercise.muscleGroup)}</Text>
    {exercise.description ? <Text style={textStyles.body}>{exercise.description}</Text> : null}
    {source ? playingGif
      ? <Image accessibilityLabel={`Demostración de ${exercise.name}`} cachePolicy="none" contentFit="contain" source={{ uri: source }} style={styles.media} />
      : <CachedThumbnail cache={mobileThumbnailCache} label={`Demostración de ${exercise.name}`} owner={session} url={source} style={styles.media} />
    : <Text style={textStyles.muted}>Este ejercicio no tiene imagen ni demostración.</Text>}
    {exercise.attribution ? <Text style={textStyles.muted}>{exercise.attribution}</Text> : null}
    {gif ? <PrimaryButton onPress={() => setPlayingGif((value) => !value)} variant="secondary">
      {playingGif ? 'Detener demostración' : 'Reproducir GIF'}
    </PrimaryButton> : null}
  </View>;
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  title: { color: theme.colors.text, flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  close: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  media: { borderRadius: theme.radii.lg, height: 220, width: '100%' },
});
