import { NextResponse, type NextRequest } from 'next/server';

import { pool } from '~/db/pool';
import type { CreatePessoaRequest, Pessoa } from '~/types/pessoa';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<Pessoa[] | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const timeId = Number(searchParams.get('timeId'));

    if (!Number.isInteger(timeId) || timeId <= 0) {
      return NextResponse.json(
        { error: 'timeId é obrigatório e deve ser válido' },
        { status: 400 },
      );
    }

    const result = await pool.query<Pessoa>(
      'SELECT * FROM pessoas WHERE time_id = $1 ORDER BY nome ASC',
      [timeId],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar pessoas:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<Pessoa | { error: string }>> {
  try {
    const body: CreatePessoaRequest = await request.json();
    const { nome, timeId } = body;

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 },
      );
    }

    if (!Number.isInteger(timeId) || timeId <= 0) {
      return NextResponse.json(
        { error: 'timeId é obrigatório e deve ser válido' },
        { status: 400 },
      );
    }

    const result = await pool.query<Pessoa>(
      'INSERT INTO pessoas (nome, pontos, time_id) VALUES ($1, 0, $2) RETURNING *',
      [nome.trim().toUpperCase(), timeId],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Esta pessoa já existe' },
        { status: 400 },
      );
    }
    console.error('Erro ao criar pessoa:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
