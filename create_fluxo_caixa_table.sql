-- Executar no Supabase SQL Editor
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria       TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(10, 2) NOT NULL,
  data            DATE NOT NULL,
  forma_pagamento TEXT,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: apenas admins autenticados
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem tudo" ON fluxo_caixa
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
