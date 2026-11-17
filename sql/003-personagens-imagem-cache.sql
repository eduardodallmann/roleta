-- Execute após 002-personagens-imagem-blob.sql em bancos existentes.
-- Calcula também o hash das imagens já cadastradas. Não altera seus bytes.
BEGIN;

ALTER TABLE personagens
  ADD COLUMN IF NOT EXISTS imagem_hash TEXT GENERATED ALWAYS AS (
    CASE WHEN octet_length(imagem) > 0 THEN encode(sha256(imagem), 'hex') END
  ) STORED;

COMMENT ON COLUMN personagens.imagem_hash IS 'SHA-256 da imagem, calculado automaticamente na gravação para versionar a URL de cache.';

COMMIT;
