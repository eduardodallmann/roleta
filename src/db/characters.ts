import { randomInt } from 'node:crypto';

import { getPhraseThemes, selectPhraseTheme } from '~/lib/phrase-themes';
import type {
  Character,
  CharacterOption,
  CharacterPhrase,
} from '~/types/character';

import { pool } from './pool';

export const listCharacters = async (): Promise<CharacterOption[]> => {
  const { rows } = await pool.query<CharacterOption>(
    `SELECT id, slug, nome,
       CASE WHEN imagem_hash IS NOT NULL
         THEN '/api/personagens/' || id || '/imagem?v=' || imagem_hash
         ELSE NULL END AS imagem_url,
       CASE WHEN fish_voice_id = '3602d43a7e444ea8822bec77598e5617'
         THEN '3d' ELSE '2d' END AS mode
     FROM personagens ORDER BY ordem, id`,
  );

  return rows;
};

type CharacterImage = {
  imagem: Buffer | null;
  imagem_hash: string | null;
};

export const getCharacterImage = async (
  id: number,
): Promise<CharacterImage | null> => {
  const { rows } = await pool.query<CharacterImage>(
    'SELECT imagem, imagem_hash FROM personagens WHERE id = $1',
    [id],
  );

  return rows[0] ?? null;
};

type PhraseHistory = {
  ultima_frase_id: number | null;
  ultimo_tema_key: string | null;
};

export const reserveCharacterPhrase = async (
  timeId: number,
  characterSlug: string,
  now = new Date(),
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const team = await client.query('SELECT id FROM times WHERE id = $1', [
      timeId,
    ]);
    if (team.rows.length === 0) {
      await client.query('COMMIT');

      return { status: 'team-not-found' } as const;
    }

    const { rows: characters } = await client.query<Character>(
      'SELECT id, slug, nome, estilo, fish_voice_id FROM personagens WHERE slug = $1',
      [characterSlug],
    );
    const [character] = characters;
    if (!character) {
      await client.query('COMMIT');

      return { status: 'character-not-found' } as const;
    }

    // O histórico é independente por equipe e personagem, inclusive na primeira reserva.
    await client.query(
      `INSERT INTO personagem_historico (time_id, personagem_id)
       VALUES ($1, $2) ON CONFLICT (time_id, personagem_id) DO NOTHING`,
      [timeId, character.id],
    );
    const { rows: history } = await client.query<PhraseHistory>(
      `SELECT ultima_frase_id, ultimo_tema_key FROM personagem_historico
       WHERE time_id = $1 AND personagem_id = $2 FOR UPDATE`,
      [timeId, character.id],
    );
    const { rows: phrases } = await client.query<CharacterPhrase>(
      'SELECT id, tipo, texto FROM personagem_frases WHERE personagem_id = $1 ORDER BY id',
      [character.id],
    );
    const alternatives = phrases.filter(
      ({ id }) => id !== history[0].ultima_frase_id,
    );
    const candidates = alternatives.length ? alternatives : phrases;
    const phrase = candidates.length
      ? candidates[randomInt(candidates.length)]
      : null;
    const theme = selectPhraseTheme(
      getPhraseThemes(now),
      history[0].ultimo_tema_key,
    );

    await client.query(
      `UPDATE personagem_historico SET ultima_frase_id = $3, ultimo_tema_key = $4
       WHERE time_id = $1 AND personagem_id = $2`,
      [timeId, character.id, phrase?.id ?? null, theme.key],
    );
    await client.query('COMMIT');

    return { status: 'ok', character, phrase, theme } as const;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
