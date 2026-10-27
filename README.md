This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copie `.env.example` para `.env.local` e configure as variáveis antes de usar a
chamada de voz do modo Silvio. `OPENROUTER_API_KEY`, `OPENROUTER_TEXT_MODEL`,
`FISH_API_KEY`, `FISH_TTS_MODEL` e `FISH_VOICE_ID` são lidas somente pelo
backend e não devem usar o prefixo `NEXT_PUBLIC_`. O áudio é gerado diretamente
pela API do Fish Audio, sem passar pelo OpenRouter.
Quando `GROQ_API_KEY` e `GROQ_TEXT_MODEL` estiverem configuradas, o Groq será
usado como fallback automático caso a geração textual pelo OpenRouter falhe.

Os temas do Silvio e os períodos sazonais ficam em
`src/lib/silvio-phrases.ts`, no array retornado por `getSeasonalThemePeriods`.
A seleção é feita a cada chamada, pelo dia no fuso `America/Sao_Paulo`, com
início e fim inclusivos e repetição anual:

| Ocasião             | Período                                        |
| ------------------- | ---------------------------------------------- |
| Ano Novo            | 01/01 a 07/01                                  |
| Halloween           | 25/10 a 31/10                                  |
| Novembro Azul       | 01/11 a 07/11                                  |
| Black Friday        | Quarta sexta-feira de novembro (27/11 em 2026) |
| Natal               | 19/12 a 25/12                                  |
| Início do Verão     | 21/12 a 27/12                                  |
| Véspera de Ano Novo | 25/12 a 31/12                                  |

Quando os períodos coincidem, os temas de todos os blocos ativos participam do
sorteio. Fora dos períodos sazonais, o sorteio usa temas do dia a dia.
Para incluir outra ocasião, adicione um objeto com
`occasion`, `start`, `end` e `themes` ao array. As datas usam `Date.UTC`, com
mês começando em zero, para representar os dias do calendário sem depender do
fuso do servidor.

O backend sorteia uma inspiração ampla por chamada, como "Bruxas e magia" no
Halloween ou "Presentes e embrulhos" no Natal. A IA recebe a ocasião, essa
inspiração e a lista de bordões para criar livremente uma piada original,
escolhendo também o bordão. As regras de tamanho, nome e interpretação são as
mesmas durante todo o ano. O prompt não contém exemplos completos de chamadas.

A última chave sorteada fica na coluna
`times.silvio_last_phrase_key`, para excluir esse tema do próximo sorteio da
mesma equipe quando houver alternativas. O histórico usa uma chave derivada do
nome da ocasião e do tema, portanto reordenar a lista não altera sua identificação.

A reserva é feita em uma transação com bloqueio da linha da equipe, antes das
chamadas externas, evitando a repetição consecutiva de temas mesmo com
requisições simultâneas e várias instâncias do servidor. Se uma geração falhar,
o tema reservado continua registrado. O controle se aplica à inspiração sorteada;
a piada e a redação final continuam sendo produzidas pela IA.

Esta versão reaproveita a coluna do histórico existente, sem migração adicional.
Chaves antigas de frases são substituídas automaticamente no próximo sorteio.
Se a coluna ainda não foi criada, execute no PostgreSQL:

```sql
ALTER TABLE times
  ADD COLUMN IF NOT EXISTS silvio_last_phrase_key TEXT;
```

A rota `POST /api/silvio-winner` exige `{ nome, timeId }`; a página da equipe
já envia os dois campos.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
