import { NextResponse } from 'next/server';

import { pool } from '~/db/pool';
import type { Configs, ConfigsResponse } from '~/types/configs';

export async function GET(): Promise<
  NextResponse<Configs | { error: string }>
> {
  try {
    const {
      rows: [data],
    } = await pool.query<ConfigsResponse>('SELECT * FROM configs');

    return NextResponse.json({
      showUpDown: data.show_up_down,
    });
  } catch (error) {
    console.error('Erro ao buscar configs:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
