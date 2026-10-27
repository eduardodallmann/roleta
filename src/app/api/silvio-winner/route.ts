import { NextResponse } from 'next/server';

import { reserveSilvioPhraseTheme } from '~/db/silvio-phrases';
import {
  buildSilvioPhraseMessages,
  type ChatMessage,
} from '~/lib/silvio-phrases';

export const runtime = 'nodejs';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const FISH_SPEECH_URL = 'https://api.fish.audio/v1/tts';
const MAX_WINNER_NAME_LENGTH = 120;
const TEXT_GENERATION_TIMEOUT_MS = 5000;

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?:
    | {
        message?: string;
      }
    | string;
  message?: string;
  reason?: string;
};

const getMessageText = (response: OpenRouterChatResponse): string => {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join(' ');
  }

  return '';
};

const cleanGeneratedPhrase = (phrase: string): string =>
  phrase
    .trim()
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/^frase\s*:\s*/i, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();

const chatApiError = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as OpenRouterChatResponse;
    const nestedError =
      typeof data.error === 'string' ? data.error : data.error?.message;

    return (
      nestedError ||
      data.message ||
      data.reason ||
      `A API respondeu com ${response.status}`
    );
  } catch {
    return `A API respondeu com ${response.status}`;
  }
};

const readGeneratedPhrase = async (
  response: Response,
  providerName: string,
): Promise<string> => {
  if (!response.ok) {
    throw new Error(`${providerName}: ${await chatApiError(response)}`);
  }

  const phraseData = (await response.json()) as OpenRouterChatResponse;
  const phrase = cleanGeneratedPhrase(getMessageText(phraseData));

  if (!phrase) {
    throw new Error(`${providerName}: a IA retornou uma frase vazia.`);
  }

  return phrase;
};

const generatePhraseWithOpenRouter = async (
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> => {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'Roleta de Pontuacao',
    },
    body: JSON.stringify({
      model,
      messages,
      reasoning: {
        effort: 'none',
        exclude: true,
      },
      max_tokens: 80,
      temperature: 0.85,
      provider: {
        sort: 'latency',
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(TEXT_GENERATION_TIMEOUT_MS),
  });

  return readGeneratedPhrase(response, 'OpenRouter');
};

const generatePhraseWithGroq = async (
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> => {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: 80,
      temperature: 0.85,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(TEXT_GENERATION_TIMEOUT_MS),
  });

  return readGeneratedPhrase(response, 'Groq');
};

export async function POST(
  request: Request,
): Promise<Response | NextResponse<{ error: string }>> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const textModel = process.env.OPENROUTER_TEXT_MODEL;
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqTextModel = process.env.GROQ_TEXT_MODEL;
  const fishApiKey = process.env.FISH_API_KEY;
  const fishTtsModel = process.env.FISH_TTS_MODEL;
  const fishVoiceId = process.env.FISH_VOICE_ID;

  if (
    !openRouterApiKey ||
    !textModel ||
    !fishApiKey ||
    !fishTtsModel ||
    !fishVoiceId
  ) {
    console.error(
      'Configure OPENROUTER_API_KEY, OPENROUTER_TEXT_MODEL, FISH_API_KEY, FISH_TTS_MODEL e FISH_VOICE_ID.',
    );

    return NextResponse.json(
      { error: 'A geração de voz não está configurada no servidor.' },
      { status: 503 },
    );
  }

  let winnerName: string;
  let timeId: number;

  try {
    const body = (await request.json()) as { nome?: unknown; timeId?: unknown };
    winnerName = typeof body.nome === 'string' ? body.nome.trim() : '';
    timeId = typeof body.timeId === 'number' ? body.timeId : NaN;
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 },
    );
  }

  if (!winnerName || winnerName.length > MAX_WINNER_NAME_LENGTH) {
    return NextResponse.json(
      { error: 'O nome do vencedor é inválido.' },
      { status: 400 },
    );
  }

  if (!Number.isSafeInteger(timeId) || timeId <= 0) {
    return NextResponse.json(
      { error: 'timeId é obrigatório e deve ser válido.' },
      { status: 400 },
    );
  }

  try {
    const theme = await reserveSilvioPhraseTheme(timeId);

    if (!theme) {
      return NextResponse.json(
        { error: 'Time não encontrado.' },
        { status: 404 },
      );
    }

    const messages = buildSilvioPhraseMessages(winnerName, theme);
    let phrase: string;

    try {
      phrase = await generatePhraseWithOpenRouter(
        openRouterApiKey,
        textModel,
        messages,
      );
    } catch (primaryError) {
      console.warn(
        'Falha na geração textual pelo OpenRouter; tentando Groq:',
        primaryError,
      );

      if (!groqApiKey || !groqTextModel) {
        throw new Error('O fallback Groq não está configurado.', {
          cause: primaryError,
        });
      }

      phrase = await generatePhraseWithGroq(
        groqApiKey,
        groqTextModel,
        messages,
      );
    }

    const audioResponse = await fetch(FISH_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fishApiKey}`,
        'Content-Type': 'application/json',
        model: fishTtsModel,
      },
      body: JSON.stringify({
        text: phrase,
        reference_id: fishVoiceId,
        format: 'mp3',
      }),
      cache: 'no-store',
    });

    if (!audioResponse.ok) {
      throw new Error(await chatApiError(audioResponse));
    }

    const audio = await audioResponse.arrayBuffer();

    if (audio.byteLength === 0) {
      throw new Error('A IA de voz retornou um áudio vazio.');
    }

    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type':
          audioResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar a chamada do vencedor:', error);

    return NextResponse.json(
      { error: 'Não foi possível gerar a chamada do vencedor.' },
      { status: 502 },
    );
  }
}
