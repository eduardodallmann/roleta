import { NextResponse } from 'next/server';

import { pool } from '~/db/pool';
import type { Time } from '~/types/time';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _: Request,
  { params }: RouteParams,
): Promise<NextResponse<Time | { error: string }>> {
  try {
    const { id } = await params;
    const timeId = Number(id);

    if (!Number.isInteger(timeId) || timeId <= 0) {
      return NextResponse.json({ error: 'Time inválido' }, { status: 400 });
    }

    const result = await pool.query<Time>('SELECT * FROM times WHERE id = $1', [
      timeId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Time não encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar time:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
