// app/api/pessoas/clear-points/route.ts
import { NextResponse, type NextRequest } from 'next/server';

import { pool } from '~/db/pool';
import type { Pessoa } from '~/types/pessoa';

export async function PUT(
  request: NextRequest,
): Promise<
  NextResponse<{ message: string; pessoas: Pessoa[] } | { error: string }>
> {
  try {
    const { searchParams } = new URL(request.url);
    const timeId = Number(searchParams.get('timeId'));

    if (!Number.isInteger(timeId) || timeId <= 0) {
      return NextResponse.json(
        { error: 'timeId é obrigatório e deve ser válido' },
        { status: 400 },
      );
    }

    // Zerar todos os pontos
    const result = await pool.query<Pessoa>(
      'UPDATE pessoas SET pontos = 0, updated_at = CURRENT_TIMESTAMP WHERE time_id = $1 RETURNING *',
      [timeId],
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
