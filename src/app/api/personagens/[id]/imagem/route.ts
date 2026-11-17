import { NextResponse } from 'next/server';

import { getCharacterImage } from '~/db/characters';
import { getCharacterImageContentType } from '~/lib/character-images';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const characterId = Number(id);
  if (!Number.isSafeInteger(characterId) || characterId <= 0) {
    return NextResponse.json(
      { error: 'Personagem inválido.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const image = await getCharacterImage(characterId);
    if (!image?.imagem?.length || !image.imagem_hash) {
      return NextResponse.json(
        { error: 'Imagem não encontrada.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const contentType = getCharacterImageContentType(image.imagem);
    if (!contentType) {
      return NextResponse.json(
        { error: 'Formato de imagem não suportado.' },
        { status: 415, headers: NO_STORE_HEADERS },
      );
    }

    if (new URL(request.url).searchParams.get('v') !== image.imagem_hash) {
      // Uma versão antiga nunca pode receber novos bytes com cache imutável.
      const currentUrl = new URL(
        `/api/personagens/${characterId}/imagem`,
        request.url,
      );
      currentUrl.searchParams.set('v', image.imagem_hash);

      return NextResponse.redirect(currentUrl, {
        status: 307,
        headers: NO_STORE_HEADERS,
      });
    }

    return new Response(new Uint8Array(image.imagem), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Erro ao carregar imagem do personagem:', error);

    return NextResponse.json(
      { error: 'Não foi possível carregar a imagem.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
