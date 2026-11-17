import { NextResponse } from 'next/server';

import { listCharacters } from '~/db/characters';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(await listCharacters(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Erro ao listar personagens:', error);

    return NextResponse.json(
      { error: 'Não foi possível carregar os personagens.' },
      { status: 503 },
    );
  }
}
