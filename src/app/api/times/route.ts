import { NextResponse, type NextRequest } from 'next/server';

import { pool } from '~/db/pool';
import type { CreateTimeRequest, Time, TimeResponse } from '~/types/time';

const mapTime = (time: TimeResponse): Time => ({
  id: time.id,
  nome: time.nome,
  created_at: time.created_at,
  updated_at: time.updated_at,
  totalPessoas: time.total_pessoas,
  totalPontos: time.total_pontos,
});

export async function GET(): Promise<NextResponse<Time[] | { error: string }>> {
  try {
    const result = await pool.query<TimeResponse>(`
      SELECT
        t.id,
        t.nome,
        t.created_at,
        t.updated_at,
        COUNT(p.id)::int AS total_pessoas,
        COALESCE(SUM(p.pontos), 0)::int AS total_pontos
      FROM times t
      LEFT JOIN pessoas p ON p.time_id = t.id
      GROUP BY t.id
      ORDER BY t.nome ASC
    `);

    return NextResponse.json(result.rows.map(mapTime));
  } catch (error) {
    console.error('Erro ao buscar times:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<Time | { error: string }>> {
  try {
    const body: CreateTimeRequest = await request.json();
    const nome = body.nome?.trim();

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome do time é obrigatório' },
        { status: 400 },
      );
    }

    const result = await pool.query<Time>(
      'INSERT INTO times (nome) VALUES ($1) RETURNING *',
      [nome.toUpperCase()],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Este time já existe' },
        { status: 400 },
      );
    }

    console.error('Erro ao criar time:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
