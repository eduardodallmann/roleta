import {
  getSilvioPhraseThemes,
  selectSilvioPhraseTheme,
  type SilvioPhraseTheme,
} from '~/lib/silvio-phrases';

import { pool } from './pool';

type ThemeHistory = {
  silvio_last_phrase_key: string | null;
};

export const reserveSilvioPhraseTheme = async (
  timeId: number,
  now = new Date(),
): Promise<SilvioPhraseTheme | null> => {
  const themes = getSilvioPhraseThemes(now);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<ThemeHistory>(
      'SELECT silvio_last_phrase_key FROM times WHERE id = $1 FOR UPDATE',
      [timeId],
    );

    if (rows.length === 0) {
      await client.query('COMMIT');

      return null;
    }

    const theme = selectSilvioPhraseTheme(
      themes,
      rows[0].silvio_last_phrase_key,
    );

    await client.query(
      'UPDATE times SET silvio_last_phrase_key = $1 WHERE id = $2',
      [theme.key, timeId],
    );
    await client.query('COMMIT');

    return theme;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
