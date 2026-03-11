-- ─────────────────────────────────────────────────────────────────────────────
-- seed_tenis.sql
-- 10 produtos Tênis/Calçados com fotos Unsplash reais, estoque por tamanho
-- Execute no SQL Editor do Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- Garante que a coluna size_stock existe (seguro re-rodar)
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_stock JSONB DEFAULT NULL;

INSERT INTO products
  (name, brand, quantity, price, original_price, discount, image_url, category, sections, is_active, stock, size_stock)
VALUES

-- 1 ─ Nike Air Max 90 ─────────────────────────────────────────────────────────
(
  'Nike Air Max 90 Branco e Vermelho',
  'Nike',
  '38 / 39 / 40 / 41 / 42 / 43',
  399.90,
  599.90,
  33,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais comprados']::text[],
  true,
  null,
  '{"38": 4, "39": 8, "40": 14, "41": 12, "42": 7, "43": 3}'::jsonb
),

-- 2 ─ Nike Air Force 1 ────────────────────────────────────────────────────────
(
  'Nike Air Force 1 Low All White',
  'Nike',
  '37 / 38 / 39 / 40 / 41 / 42 / 43',
  459.90,
  599.90,
  23,
  'https://images.unsplash.com/photo-1595950653106-bdbf8c6fca83?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais Vistos', 'Mais comprados']::text[],
  true,
  null,
  '{"37": 5, "38": 9, "39": 13, "40": 16, "41": 10, "42": 6, "43": 4}'::jsonb
),

-- 3 ─ Nike Dunk Low ───────────────────────────────────────────────────────────
(
  'Nike Dunk Low Azul e Branco',
  'Nike',
  '38 / 39 / 40 / 41 / 42 / 43',
  529.90,
  749.90,
  29,
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Novidades']::text[],
  true,
  null,
  '{"38": 3, "39": 6, "40": 10, "41": 8, "42": 5, "43": 2}'::jsonb
),

-- 4 ─ Adidas Ultraboost ───────────────────────────────────────────────────────
(
  'Adidas Ultraboost 22 Preto',
  'Adidas',
  '38 / 39 / 40 / 41 / 42 / 43 / 44',
  549.90,
  799.90,
  31,
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais comprados']::text[],
  true,
  null,
  '{"38": 6, "39": 10, "40": 15, "41": 13, "42": 9, "43": 5, "44": 3}'::jsonb
),

-- 5 ─ Adidas Stan Smith ───────────────────────────────────────────────────────
(
  'Adidas Stan Smith Branco e Verde',
  'Adidas',
  '36 / 37 / 38 / 39 / 40 / 41 / 42',
  299.90,
  399.90,
  25,
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Ofertas do mes']::text[],
  true,
  null,
  '{"36": 4, "37": 7, "38": 11, "39": 14, "40": 10, "41": 6, "42": 3}'::jsonb
),

-- 6 ─ New Balance 574 ─────────────────────────────────────────────────────────
(
  'New Balance 574 Cinza e Marinho',
  'New Balance',
  '37 / 38 / 39 / 40 / 41 / 42 / 43',
  449.90,
  549.90,
  18,
  'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais Vistos']::text[],
  true,
  null,
  '{"37": 4, "38": 8, "39": 12, "40": 11, "41": 8, "42": 5, "43": 2}'::jsonb
),

-- 7 ─ Vans Old Skool ──────────────────────────────────────────────────────────
(
  'Vans Old Skool Preto e Branco',
  'Vans',
  '35 / 36 / 37 / 38 / 39 / 40 / 41 / 42',
  279.90,
  369.90,
  24,
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Ofertas do mes', 'Mais Vistos']::text[],
  true,
  null,
  '{"35": 5, "36": 8, "37": 12, "38": 15, "39": 10, "40": 7, "41": 4, "42": 2}'::jsonb
),

-- 8 ─ Converse All Star ───────────────────────────────────────────────────────
(
  'Converse All Star Chuck Taylor Preto',
  'Converse',
  '34 / 35 / 36 / 37 / 38 / 39 / 40 / 41 / 42',
  219.90,
  299.90,
  27,
  'https://images.unsplash.com/photo-1494453271936-0b0ef42c1b5d?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Ofertas do mes']::text[],
  true,
  null,
  '{"34": 3, "35": 5, "36": 9, "37": 13, "38": 16, "39": 12, "40": 8, "41": 5, "42": 2}'::jsonb
),

-- 9 ─ Puma RS-X ───────────────────────────────────────────────────────────────
(
  'Puma RS-X Reinvention Branco e Rosa',
  'Puma',
  '36 / 37 / 38 / 39 / 40 / 41',
  389.90,
  499.90,
  22,
  'https://images.unsplash.com/photo-1579338834997-01adf9a4f9ef?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Novidades']::text[],
  true,
  null,
  '{"36": 6, "37": 9, "38": 12, "39": 10, "40": 7, "41": 4}'::jsonb
),

-- 10 ─ Reebok Classic ─────────────────────────────────────────────────────────
(
  'Reebok Classic Leather Branco',
  'Reebok',
  '37 / 38 / 39 / 40 / 41 / 42 / 43',
  329.90,
  429.90,
  23,
  'https://images.unsplash.com/photo-1520372220997-94f5dd51f508?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Novidades']::text[],
  true,
  null,
  '{"37": 5, "38": 9, "39": 11, "40": 13, "41": 9, "42": 6, "43": 3}'::jsonb
);
