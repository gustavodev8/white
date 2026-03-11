-- ─── Migração: Adiciona coluna size_stock na tabela products ──────────────────
-- Execute este script no SQL Editor do Supabase (projeto > SQL Editor > New Query)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_stock JSONB DEFAULT NULL;

COMMENT ON COLUMN products.size_stock IS
  'Estoque por tamanho. Ex: {"P": 10, "M": 5, "G": 0}. NULL = usa coluna stock global.';

-- Índice GIN para buscas futuras dentro do JSON (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_products_size_stock
  ON products USING GIN (size_stock);
