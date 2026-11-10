/** Validate new secrets without changing their text or requiring native encoders. */
export function registrationPasswordError(password: string): string | null {
  let characters = 0;
  let bytes = 0;
  for (const character of password) {
    const point = character.codePointAt(0)!;
    if (point >= 0xd800 && point <= 0xdfff) {
      return 'La contraseña contiene caracteres Unicode no válidos.';
    }
    characters += 1;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  if (characters < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (bytes > 72) return 'La contraseña no debe superar 72 bytes UTF-8; algunos caracteres ocupan varios bytes.';
  return null;
}
