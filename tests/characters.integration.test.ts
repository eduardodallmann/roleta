import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { Pool } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  'catálogo, carga SQL, histórico concorrente e geração de voz',
  { skip: !databaseUrl },
  async (t) => {
    const schema = `roleta_test_${randomUUID().replaceAll('-', '')}`;
    const admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    process.env.DATABASE_URL = databaseUrl;
    process.env.PGOPTIONS = `-c search_path=${schema}`;
    const { pool } = await import('~/db/pool');
    const { listCharacters, reserveCharacterPhrase } =
      await import('~/db/characters');
    const { POST } = await import('~/app/api/winner-voice/route');
    const { GET } = await import('~/app/api/personagens/route');
    const { GET: getImage } =
      await import('~/app/api/personagens/[id]/imagem/route');
    const seed = await readFile('sql/001-personagens.sql', 'utf8');
    const imageMigration = await readFile(
      'sql/002-personagens-imagem-blob.sql',
      'utf8',
    );
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    );
    try {
      await pool.query(
        'CREATE TABLE times (id INTEGER PRIMARY KEY); INSERT INTO times VALUES (1), (2)',
      );
      await pool.query(seed);

      await t.test(
        'migração para BYTEA preserva o cadastro e pode ser reaplicada',
        async () => {
          // Reproduz a coluna de texto da versão anterior, antes de qualquer upload.
          await pool.query(`ALTER TABLE personagens RENAME COLUMN imagem TO imagem_url;
          ALTER TABLE personagens ALTER COLUMN imagem_url TYPE TEXT USING imagem_url::text;
          UPDATE personagens SET imagem_url = '/antiga.webp' WHERE slug = 'chaves'`);
          await pool.query(imageMigration);
          await pool.query(imageMigration);
          const { rows } = await pool.query(
            "SELECT imagem, imagem_url, pg_typeof(imagem)::text AS tipo FROM personagens WHERE slug = 'chaves'",
          );
          assert.deepEqual(rows[0], {
            imagem: null,
            imagem_url: '/antiga.webp',
            tipo: 'bytea',
          });
          assert.equal(
            (await listCharacters()).find(({ slug }) => slug === 'chaves')
              ?.imagem_url,
            null,
          );
        },
      );

      await t.test(
        'carga completa e repetível preserva edições e identidade própria',
        async () => {
          await pool.query(
            "UPDATE personagens SET imagem = $1, estilo = 'Estilo editado' WHERE slug = 'chaves'",
            [png],
          );
          await pool.query(seed);
          const catalog = await listCharacters();
          assert.equal(catalog.length, 48);
          assert.equal(
            (
              await pool.query(
                'SELECT COUNT(*)::int AS total FROM personagem_frases',
              )
            ).rows[0].total,
            153,
          );
          assert.ok(catalog.every(({ id }) => Number.isInteger(id)));
          assert.equal(
            catalog.find(({ slug }) => slug === 'chaves')?.imagem_url,
            `/api/personagens/${catalog.find(({ slug }) => slug === 'chaves')?.id}/imagem`,
          );
          assert.deepEqual(
            catalog.filter(({ mode }) => mode === '3d').map(({ slug }) => slug),
            ['silvio-santos'],
          );
          const response = await GET();
          assert.equal(response.status, 200);
          assert.ok(
            (await response.json()).every(
              (row: object) => !('fish_voice_id' in row),
            ),
          );
        },
      );

      await t.test(
        'a rota de imagem devolve os bytes originais e o MIME correto',
        async () => {
          const chaves = (await listCharacters()).find(
            ({ slug }) => slug === 'chaves',
          );
          assert.ok(chaves);
          const readImage = (id: string) =>
            getImage(new Request('http://localhost'), {
              params: Promise.resolve({ id }),
            });
          const response = await readImage(String(chaves.id));
          assert.equal(response.status, 200);
          assert.equal(response.headers.get('Content-Type'), 'image/png');
          assert.equal(response.headers.get('Cache-Control'), 'no-store');
          assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
          assert.equal((await readImage('1')).status, 404);
          assert.equal((await readImage('999')).status, 404);
          assert.equal((await readImage('invalido')).status, 400);
          await pool.query('UPDATE personagens SET imagem = $1 WHERE id = $2', [
            Buffer.from('not an image'),
            chaves.id,
          ]);
          assert.equal((await readImage(String(chaves.id))).status, 415);
          await pool.query('UPDATE personagens SET imagem = $1 WHERE id = $2', [
            Buffer.alloc(0),
            chaves.id,
          ]);
          assert.equal((await readImage(String(chaves.id))).status, 404);
          assert.equal(
            (await listCharacters()).find(({ id }) => id === chaves.id)
              ?.imagem_url,
            null,
          );
          await pool.query('UPDATE personagens SET imagem = $1 WHERE id = $2', [
            png,
            chaves.id,
          ]);
        },
      );

      await t.test(
        'modo visual segue o ID da voz mesmo que o slug mude',
        async () => {
          await pool.query(
            "UPDATE personagens SET slug = 'apresentador' WHERE slug = 'silvio-santos'",
          );
          assert.equal(
            (await listCharacters()).find(({ slug }) => slug === 'apresentador')
              ?.mode,
            '3d',
          );
          await pool.query(
            "UPDATE personagens SET slug = 'silvio-santos' WHERE slug = 'apresentador'",
          );
        },
      );

      await t.test(
        'reservas simultâneas não repetem referência ou tema consecutivos',
        async () => {
          const [first, second] = await Promise.all([
            reserveCharacterPhrase(1, 'chaves'),
            reserveCharacterPhrase(1, 'chaves'),
          ]);
          assert.equal(first.status, 'ok');
          assert.equal(second.status, 'ok');
          if (first.status !== 'ok' || second.status !== 'ok') {
            throw new Error('Reserva falhou');
          }
          assert.notEqual(first.phrase?.id, second.phrase?.id);
          assert.notEqual(first.theme.key, second.theme.key);
          await reserveCharacterPhrase(2, 'chaves');
          await reserveCharacterPhrase(1, 'goku');
          assert.equal(
            (
              await pool.query(
                'SELECT COUNT(*)::int AS total FROM personagem_historico',
              )
            ).rows[0].total,
            3,
          );
          assert.equal(
            (await reserveCharacterPhrase(999, 'chaves')).status,
            'team-not-found',
          );
          assert.equal(
            (await reserveCharacterPhrase(1, 'inexistente')).status,
            'character-not-found',
          );
        },
      );

      await t.test(
        'a API usa a voz do banco e envia o contexto correto para a IA',
        async () => {
          Object.assign(process.env, {
            OPENROUTER_API_KEY: 'test',
            OPENROUTER_TEXT_MODEL: 'test',
            FISH_API_KEY: 'test',
            FISH_TTS_MODEL: 'test',
            GROQ_API_KEY: 'test',
            GROQ_TEXT_MODEL: 'test',
          });
          const calls: { url: string; body: Record<string, unknown> }[] = [];
          const fetchMock = t.mock.method(
            globalThis,
            'fetch',
            async (url: string, options: RequestInit) => {
              const body = JSON.parse(String(options.body));
              calls.push({ url, body });
              if (url.includes('fish.audio')) {
                return new Response(new Uint8Array([73, 68, 51]), {
                  headers: { 'Content-Type': 'audio/mpeg' },
                });
              }
              return Response.json({
                choices: [
                  {
                    message: {
                      content:
                        '[excited] Maria, mais um ponto e um sanduíche para comemorar!',
                    },
                  },
                ],
              });
            },
          );
          try {
            const request = () =>
              new Request('http://localhost/api/winner-voice', {
                method: 'POST',
                body: JSON.stringify({
                  nome: 'Maria',
                  timeId: 1,
                  characterSlug: 'chaves',
                  pontos: 4,
                }),
              });
            const response = await POST(request());
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('content-type'), 'audio/mpeg');
            assert.equal((await response.arrayBuffer()).byteLength, 3);
            assert.equal(
              calls[1].body.reference_id,
              '762e3e674ebf42e1a1a2f8ac0533c491',
            );
            const messages = calls[0].body.messages as { content: string }[];
            assert.equal(
              JSON.parse(messages[1].content).pontos_apos_sorteio,
              5,
            );
            assert.match(messages[0].content, /Estilo editado/);

            calls.length = 0;
            fetchMock.mock.mockImplementation(
              async (url: string, options: RequestInit) => {
                calls.push({ url, body: JSON.parse(String(options.body)) });
                if (url.includes('openrouter')) {
                  return Response.json(
                    { error: 'Indisponível' },
                    { status: 503 },
                  );
                }
                if (url.includes('fish.audio')) {
                  return new Response(new Uint8Array([73, 68, 51]));
                }
                return Response.json({
                  choices: [{ message: { content: 'Maria, mais um ponto!' } }],
                });
              },
            );
            assert.equal((await POST(request())).status, 200);
            assert.match(calls[1].url, /groq/);
            assert.equal(
              calls[2].body.reference_id,
              '762e3e674ebf42e1a1a2f8ac0533c491',
            );

            const before = calls.length;
            assert.equal(
              (
                await POST(
                  new Request('http://localhost', {
                    method: 'POST',
                    body: 'null',
                  }),
                )
              ).status,
              400,
            );
            assert.equal(calls.length, before);
            assert.equal(
              (
                await POST(
                  new Request('http://localhost', {
                    method: 'POST',
                    body: JSON.stringify({
                      nome: 'Maria',
                      timeId: 1,
                      characterSlug: 'removido',
                      pontos: 4,
                    }),
                  }),
                )
              ).status,
              404,
            );
            assert.equal(calls.length, before);
          } finally {
            fetchMock.mock.restore();
          }
        },
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
