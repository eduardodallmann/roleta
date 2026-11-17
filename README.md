# Roleta de pontuação

Aplicação Next.js com PostgreSQL. Use Node.js 24, conforme `.nvmrc`.
Copie `.env.example` para `.env.local`, configure
`DATABASE_URL` e execute `pnpm install` e `pnpm dev`.

## Personagens e vozes

Antes de usar esta versão, execute **[sql/001-personagens.sql](sql/001-personagens.sql)**
no banco da aplicação, que já deve ter a tabela `times`:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/001-personagens.sql
```

Se já aplicou a versão anterior com a coluna `imagem_url`, execute
**[sql/002-personagens-imagem-blob.sql](sql/002-personagens-imagem-blob.sql)**.
Esse `ALTER TABLE` adiciona `imagem BYTEA`, mantendo eventuais URLs antigas
preservadas na coluna anterior, que o aplicativo não usa mais.

Para ativar o cache em um banco já criado, execute também
**[sql/003-personagens-imagem-cache.sql](sql/003-personagens-imagem-cache.sql)**.
Novos bancos já recebem essa estrutura pelo SQL inicial.

O SQL inicial cria as tabelas e insere **48 personagens e 153 referências**:

- `personagens`: ID numérico próprio, `slug` estável, nome, `fish_voice_id`,
  `imagem BYTEA` opcional, estilo para a IA e ordem de exibição.
- `personagem_frases`: bordões, frases e piadas vinculados pelo ID interno.
  `origem` distingue adaptações originais de referências pesquisadas, que incluem `fonte_url`.
- `personagem_historico`: última referência e último tema por equipe e personagem.

Todos os dados dos personagens, incluindo as vozes, ficam no banco. O ID do Fish
é uma referência externa e não é chave primária nem chave estrangeira.
O SQL pode ser repetido sem duplicar a carga inicial ou sobrescrever edições.
A antiga coluna `times.silvio_last_phrase_key` pode permanecer; não é mais usada.

O seletor exibe nome e imagem, com ícone quando a imagem está ausente ou falha.
“Sem som” é a primeira opção e o padrão. A seleção fica salva neste navegador na
chave versionada `roulette-character-v1`. Preferências antigas de modo e som são
ignoradas; JSON inválido, versão desconhecida ou personagem removido resultam em
“Sem som”. Se o armazenamento estiver bloqueado, a seleção funciona durante a sessão.

A voz `3602d43a7e444ea8822bec77598e5617` ativa a roleta 3D automaticamente, com
`public/sounds/silvio.mp3` durante o giro e a fala gerada após o resultado. Todas
as outras vozes e “Sem som” usam a roleta 2D. A troca de voz e as edições dos
participantes ficam bloqueadas durante o giro.
O áudio é preparado durante a animação; se demorar mais, toca quando estiver pronto.
Trocar de personagem, iniciar outro giro ou sair da equipe cancela o áudio anterior.
Nas vozes 2D, `public/sounds/tick-tick.mp3` toca durante o giro, antes da fala gerada.
Com “Sem som”, nenhum áudio de giro ou fala é reproduzido.

Se o catálogo estiver indisponível (por exemplo, antes de aplicar o SQL), a página
permite sortear sem som e oferece uma tentativa de recarregar as vozes.

## Editar imagens e referências

Grave o arquivo como binário na coluna `imagem` pelo gerenciador do banco.
Também é possível usar SQL com o conteúdo do arquivo em base64 (sem o prefixo
`data:image/...;base64,`):

```sql
UPDATE personagens
SET imagem = decode('BASE64_DA_IMAGEM', 'base64')
WHERE slug = 'silvio-santos';

INSERT INTO personagem_frases (personagem_id, tipo, texto)
SELECT id, 'piada', '{nome}, são {horario} e você já tem {pontos} pontos!'
FROM personagens WHERE slug = 'silvio-santos'
ON CONFLICT (personagem_id, tipo, texto) DO NOTHING;
```

São aceitos PNG, JPEG, GIF, WebP e AVIF; o servidor identifica o formato pelos
bytes do arquivo. A rota `GET /api/personagens/{id}/imagem` entrega o blob com o
`Content-Type` correspondente. O catálogo retorna apenas o endereço dessa rota,
sem incluir os binários ou base64 no JSON. Sem imagem ou se o arquivo falhar,
o seletor exibe o ícone padrão.

O endereço inclui `?v=HASH`, com o SHA-256 da imagem. A coluna gerada
`imagem_hash` é calculada e armazenada pelo PostgreSQL sempre que a imagem é
gravada, inclusive em alterações diretas pelo gerenciador do banco ou SQL.
Não preencha essa coluna manualmente. Imagens existentes recebem seu hash ao
aplicar a migração; imagens ausentes ou vazias não geram endereço.

As respostas da URL versionada usam `Cache-Control: public, max-age=31536000,
immutable`: o navegador pode reaproveitar a imagem por um ano sem consultar o
servidor a cada abertura do seletor. Ao trocar a imagem, o hash e o endereço mudam;
reabra a página para carregar o catálogo atualizado. O catálogo continua sem cache,
e sua consulta lê o hash já armazenado, sem transferir as imagens do banco.
Regravar os mesmos bytes mantém o mesmo endereço.

Endereços sem versão ou com uma versão antiga redirecionam temporariamente para
o endereço atual, sem cache no redirecionamento. Erros também não ficam em cache.
Assim, um endereço antigo nunca recebe os bytes de outra versão com cache longo.
Em ferramentas de desenvolvimento, respostas reaproveitadas podem aparecer como
`memory cache` ou `disk cache`; mantenha “Disable cache” desmarcado para conferir.

Os tipos são `bordao`, `frase` e `piada`. Os espaços disponíveis nas referências são
`{nome}`, `{pontos}` (total após ganhar um ponto), `{pontos_antes}`, `{horario}` e
`{periodo}`. A IA adapta a referência ao contexto, em vez de reproduzir uma fala
fixa. Você pode alterar `estilo`, `nome`, `fish_voice_id` e `ordem` ou cadastrar
outros personagens diretamente em `personagens`, usando um `slug` único e estável.
Reabra a página para recarregar o catálogo. Sem referências, a IA usa o estilo e o tema.

## Geração de voz

Configure `OPENROUTER_API_KEY`, `OPENROUTER_TEXT_MODEL`, `FISH_API_KEY` e
`FISH_TTS_MODEL`. São variáveis exclusivas do servidor, sem `NEXT_PUBLIC_`.
`FISH_VOICE_ID` foi removida: cada personagem tem sua própria voz no banco.
O áudio é gerado diretamente pelo Fish Audio. Com `GROQ_API_KEY` e
`GROQ_TEXT_MODEL`, o Groq assume a geração textual quando o OpenRouter falha.

`GET /api/personagens` retorna o catálogo público com o modo visual derivado da voz,
sem expor o ID do Fish. `POST /api/winner-voice` substitui `/api/silvio-winner` e recebe:

```json
{ "nome": "Maria", "timeId": 1, "characterSlug": "chaves", "pontos": 4 }
```

`pontos` é o total anterior ao sorteio. O prompt recebe esse total, o total após
ganhar um ponto, a data, o horário atual, o período do dia e o fuso
`America/Sao_Paulo`, calculados no servidor. A chamada de voz não altera pontos;
a atualização continua sendo feita pela rota de pontuação ao terminar o giro.
Selecionar “Sem som” não chama os serviços de geração.

Os temas sazonais ficam em `src/lib/phrase-themes.ts` e valem para todos os personagens:

| Ocasião             | Período inclusivo              |
| ------------------- | ------------------------------ |
| Ano Novo            | 01/01 a 07/01                  |
| Halloween           | 25/10 a 31/10                  |
| Novembro Azul       | 01/11 a 07/11                  |
| Black Friday        | Quarta sexta-feira de novembro |
| Natal               | 19/12 a 25/12                  |
| Início do Verão     | 21/12 a 27/12                  |
| Véspera de Ano Novo | 25/12 a 31/12                  |

Períodos sobrepostos combinam temas; fora deles são usados temas cotidianos.
A reserva de referência e tema é transacional, com bloqueio do histórico por
equipe/personagem para evitar repetição consecutiva quando há alternativas,
inclusive em requisições simultâneas. Falhas de geração mantêm a reserva.

## Verificação

O script de build executa o lint explicitamente, preservando essa validação após
a atualização para Next.js 16. Os tipos de Node.js acompanham a versão 24.
O ESLint permanece na série 9 por compatibilidade com `eslint-plugin-react`;
o TypeScript fica limitado à série 6.0, suportada por `@typescript-eslint`.

```sh
pnpm test
pnpm lint
pnpm build
```

Os testes de integração de banco podem ser ativados com
`TEST_DATABASE_URL` apontando para um PostgreSQL de testes. A suíte cria um esquema
isolado e o remove ao terminar, sem aplicar a migração no banco da aplicação.
