import { NextResponse, type NextRequest } from 'next/server';

import { pool } from '~/db/pool';
import type { Pessoa, UpdatePontosRequest } from '~/types/pessoa';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<Pessoa | { error: string }>> {
  try {
    const { id } = await params;
    const body: UpdatePontosRequest = await request.json();
    const { acao } = body;

    if (!['aumentar', 'diminuir', 'sorteio'].includes(acao)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    let query: string;
    if (acao === 'aumentar' || acao === 'sorteio') {
      query =
        'UPDATE pessoas SET pontos = pontos + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    } else {
      query =
        'UPDATE pessoas SET pontos = GREATEST(pontos - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    }

    const result = await pool.query<Pessoa>(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pessoa não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pontos:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
