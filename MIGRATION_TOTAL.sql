-- ================================================================
-- MIGRATION TOTAL — SISTEMA DE LOJA / FARMÁCIA
-- Execute inteiro no Supabase SQL Editor de um novo projeto.
-- Seguro para re-executar (IF NOT EXISTS + DO blocks).
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. PERFIS DE USUÁRIO (estende auth.users)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name                 TEXT NOT NULL DEFAULT '',
  cpf                  TEXT,
  phone                TEXT,
  birth_date           DATE,
  -- endereço
  address_cep          TEXT,
  address_street       TEXT,
  address_number       TEXT,
  address_complement   TEXT,
  address_neighborhood TEXT,
  address_city         TEXT,
  address_state        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: cria perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ────────────────────────────────────────────────────────────────
-- 2. PRODUTOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  brand          TEXT NOT NULL DEFAULT '',
  quantity       TEXT NOT NULL DEFAULT '',       -- ex: "500ml", "60 cáps"
  price          NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  image_url      TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  sections       TEXT[] NOT NULL DEFAULT '{}',   -- seções do carrossel
  is_active      BOOLEAN NOT NULL DEFAULT true,
  stock          INTEGER,
  stock_min      INTEGER NOT NULL DEFAULT 5,     -- alerta de estoque baixo
  lote           TEXT,                           -- lote do produto
  validade       DATE,                           -- data de validade
  fornecedor_id  UUID,                           -- FK adicionada depois
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "public read active products" ON products FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket para imagens dos produtos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;

DO $$ BEGIN CREATE POLICY "public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 3. SEÇÕES DO CARROSSEL
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT    NOT NULL UNIQUE,
  display_order INT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "public read active sections" ON sections FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage sections" ON sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 4. BANNERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT    NOT NULL,
  file_name     TEXT    NOT NULL DEFAULT '',
  display_order INT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "public read active banners" ON banners FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated read all banners" ON banners FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage banners" ON banners FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT DO NOTHING;

DO $$ BEGIN CREATE POLICY "public read banner images" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated upload banner images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated delete banner images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 5. PEDIDOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number          TEXT UNIQUE NOT NULL
                          DEFAULT 'RB-' || UPPER(SUBSTR(gen_random_uuid()::TEXT, 1, 8)),
  -- cliente
  customer_name         TEXT NOT NULL,
  customer_email        TEXT NOT NULL,
  customer_cpf          TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,
  -- entrega
  shipping_cep          TEXT NOT NULL,
  shipping_address      TEXT NOT NULL,
  shipping_number       TEXT NOT NULL,
  shipping_complement   TEXT,
  shipping_neighborhood TEXT,
  shipping_city         TEXT NOT NULL,
  shipping_state        TEXT NOT NULL,
  -- pagamento
  payment_method        TEXT NOT NULL CHECK (payment_method IN ('pix','credit','boleto')),
  payment_installments  INTEGER DEFAULT 1,
  -- valores
  subtotal              NUMERIC(10,2) NOT NULL,
  discount              NUMERIC(10,2) DEFAULT 0,
  shipping_cost         NUMERIC(10,2) DEFAULT 0,
  total                 NUMERIC(10,2) NOT NULL,
  -- extras
  vendedor_nome         TEXT,
  cupom_codigo          TEXT DEFAULT NULL,
  observacoes           TEXT,
  -- status
  status                TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "orders_insert_any" ON orders FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx    ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status);


-- ────────────────────────────────────────────────────────────────
-- 6. ITENS DO PEDIDO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id       TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  product_image    TEXT,
  product_brand    TEXT,
  product_quantity TEXT,
  unit_price       NUMERIC(10,2) NOT NULL,
  quantity         INTEGER       NOT NULL,
  total            NUMERIC(10,2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "order_items_insert_any" ON order_items FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "order_items_select_via_order" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);


-- ────────────────────────────────────────────────────────────────
-- 7. COLABORADORES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaboradores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT        NOT NULL,
  telefone      TEXT,
  email         TEXT,
  cpf           TEXT,
  salario       NUMERIC(10,2),
  comissao_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_admissao DATE,
  observacao    TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage colaboradores" ON colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 8. FORNECEDORES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT    NOT NULL,
  cnpj        TEXT,
  telefone    TEXT,
  email       TEXT,
  contato     TEXT,        -- nome do representante
  observacoes TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage fornecedores" ON fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK de produtos → fornecedores (adicionada depois da criação de ambas)
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_fornecedor_id_fkey
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 9. FLUXO DE CAIXA
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria       TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  data            DATE NOT NULL,
  forma_pagamento TEXT,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage fluxo_caixa" ON fluxo_caixa FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 10. FECHAMENTO DE CAIXA
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS caixa_fechamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data           DATE NOT NULL UNIQUE,        -- um fechamento por dia
  saldo_inicial  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_pix      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cartao   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_saidas   NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_final    NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes    TEXT,
  status         TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE caixa_fechamentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage caixa_fechamentos" ON caixa_fechamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 11. METAS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metas (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  mes              TEXT          NOT NULL UNIQUE,   -- formato YYYY-MM
  meta_faturamento NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_pedidos     INTEGER       NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage metas" ON metas FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 12. CUPONS DE DESCONTO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cupons (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo      TEXT           NOT NULL UNIQUE,
  tipo        TEXT           NOT NULL CHECK (tipo IN ('percentual', 'fixo')),
  valor       NUMERIC(10,2)  NOT NULL,
  valor_minimo NUMERIC(10,2) DEFAULT NULL,
  validade    DATE           DEFAULT NULL,
  usos_limite INTEGER        DEFAULT NULL,
  usos_count  INTEGER        NOT NULL DEFAULT 0,
  ativo       BOOLEAN        NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ    DEFAULT NOW()
);

ALTER TABLE cupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "public read cupons" ON cupons FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated manage cupons" ON cupons FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 13. CONTAS A PAGAR / RECEBER
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas (
  id         UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao  TEXT           NOT NULL,
  valor      NUMERIC(10,2)  NOT NULL,
  tipo       TEXT           NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  vencimento DATE           NOT NULL,
  status     TEXT           NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'pago', 'vencido')),
  categoria  TEXT           NOT NULL,
  observacao TEXT           DEFAULT NULL,
  created_at TIMESTAMPTZ    DEFAULT NOW(),
  updated_at TIMESTAMPTZ    DEFAULT NOW()
);

ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated manage contas" ON contas FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- 14. CONFIGURAÇÕES DO SISTEMA
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  id         TEXT PRIMARY KEY,
  valor      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "config_read_all"   ON config FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_write_auth" ON config FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Valores padrão
INSERT INTO config (id, valor) VALUES
  ('taxa_cartao_pct',               '2.50'),
  ('taxa_cartao_parcelas_max',       '6'),
  ('taxa_cartao_juros_a_partir_de',  '2')
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 15. PAPÉIS E PERMISSÕES (colaboradores com login)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'colaborador')),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  permissoes     TEXT[] NOT NULL DEFAULT '{}',
  ativo          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "user_roles_select" ON user_roles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- INSERT e DELETE apenas via Edge Function com service role

-- ================================================================
-- FIM — todas as tabelas criadas com sucesso
-- ================================================================
