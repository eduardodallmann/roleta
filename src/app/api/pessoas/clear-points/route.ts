// app/api/pessoas/clear-points/route.ts
import { NextResponse } from 'next/server';

import { pool } from '~/db/pool';
import type { Pessoa } from '~/types/pessoa';

export async function PUT(): Promise<
  NextResponse<{ message: string; pessoas: Pessoa[] } | { error: string }>
> {
  try {
    // Zerar todos os pontos
    const result = await pool.query<Pessoa>(
      'UPDATE pessoas SET pontos = 0, updated_at = CURRENT_TIMESTAMP RETURNING *',
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma pessoa encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: `Pontos zerados para ${result.rows.length} pessoa(s)`,
      pessoas: result.rows,
    });
  } catch (error) {
    console.error('Erro ao limpar pontos:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
