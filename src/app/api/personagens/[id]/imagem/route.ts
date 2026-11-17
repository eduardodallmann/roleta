import { NextResponse } from 'next/server';

import { getCharacterImage } from '~/db/characters';
import { getCharacterImageContentType } from '~/lib/character-images';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const characterId = Number(id);
  if (!Number.isSafeInteger(characterId) || characterId <= 0) {
    return NextResponse.json(
      { error: 'Personagem inválido.' },
      { status: 400 },
    );
  }

  try {
    const image = await getCharacterImage(characterId);
    if (!image?.length) {
      return NextResponse.json(
        { error: 'Imagem não encontrada.' },
        { status: 404 },
      );
    }

    const contentType = getCharacterImageContentType(image);
    if (!contentType) {
      return NextResponse.json(
        { error: 'Formato de imagem não suportado.' },
        { status: 415 },
      );
    }

    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Erro ao carregar imagem do personagem:', error);

    return NextResponse.json(
      { error: 'Não foi possível carregar a imagem.' },
      { status: 503 },
    );
  }
}
