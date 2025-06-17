import { NextResponse, type NextRequest } from 'next/server';

import { pool } from '~/db/pool';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<{ message: string } | { error: string }>> {
  try {
    const { id } = await params;

    const result = await pool.query(
      'DELETE FROM pessoas WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pessoa não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: 'Pessoa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pessoa:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
