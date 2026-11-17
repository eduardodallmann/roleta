-- Para bancos que já receberam a primeira versão de 001-personagens.sql.
-- A antiga coluna imagem_url, se existir, é preservada e não é mais usada.
BEGIN;

ALTER TABLE personagens
  ADD COLUMN IF NOT EXISTS imagem BYTEA;

COMMENT ON COLUMN personagens.imagem IS 'Opcional: conteúdo binário da imagem (PNG, JPEG, GIF, WebP ou AVIF).';

COMMIT;
