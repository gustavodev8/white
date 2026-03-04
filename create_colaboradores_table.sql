-- Executar no Supabase SQL Editor
CREATE TABLE IF NOT EXISTS colaboradores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  telefone      TEXT,
  email         TEXT,
  cpf           TEXT,
  salario       NUMERIC(10, 2),
  data_admissao DATE,
  observacao    TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem tudo" ON colaboradores
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
