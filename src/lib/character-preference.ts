// Uma chave nova impede que roulette-mode/roulette-sound ativem vozes antigas.
export const CHARACTER_PREFERENCE_KEY = 'roulette-character-v1';

export const readCharacterPreference = (
  raw: string | null,
  availableSlugs: readonly string[],
): string | null => {
  try {
    const preference: unknown = JSON.parse(raw ?? 'null');
    if (
      typeof preference === 'object' &&
      preference !== null &&
      'version' in preference &&
      preference.version === 1 &&
      'characterSlug' in preference &&
      typeof preference.characterSlug === 'string' &&
      availableSlugs.includes(preference.characterSlug)
    ) {
      return preference.characterSlug;
    }
  } catch {
    // Preferências inválidas ou de outra versão sempre resultam em silêncio.
  }

  return null;
};

export const serializeCharacterPreference = (
  characterSlug: string | null,
): string => JSON.stringify({ version: 1, characterSlug });
