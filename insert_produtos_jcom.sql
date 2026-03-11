-- ================================================================
-- PRODUTOS INICIAIS — J.com Modas
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ── Seções do carrossel ─────────────────────────────────────────
INSERT INTO sections (name, display_order, is_active)
VALUES
  ('Destaques',  1, true),
  ('Novidades',  2, true),
  ('Promoções',  3, true)
ON CONFLICT (name) DO NOTHING;


-- ── Produtos ────────────────────────────────────────────────────
INSERT INTO products
  (name, brand, quantity, price, original_price, discount, image_url, category, sections, is_active, stock, stock_min)
VALUES

-- ── CAMISAS (4) ─────────────────────────────────────────────────
(
  'Camisa Básica Branca',
  'J.com', 'P / M / G / GG',
  69.90, 69.90, 0,
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  'Camisas', ARRAY['Destaques', 'Novidades'], true, 30, 5
),
(
  'Camisa Polo Preta Slim',
  'J.com', 'P / M / G / GG',
  89.90, 119.90, 25,
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80',
  'Camisas', ARRAY['Destaques', 'Promoções'], true, 20, 5
),
(
  'Camisa Social Slim Fit',
  'J.com', 'P / M / G / GG / XGG',
  129.90, 129.90, 0,
  'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80',
  'Camisas', ARRAY['Novidades'], true, 15, 3
),
(
  'Camiseta Oversized Estampada',
  'J.com', 'M / G / GG',
  79.90, 99.90, 20,
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80',
  'Camisas', ARRAY['Destaques', 'Promoções'], true, 25, 5
),

-- ── TÊNIS (3) ───────────────────────────────────────────────────
(
  'Tênis Casual Branco',
  'J.com', '36 / 37 / 38 / 39 / 40 / 41 / 42 / 43',
  199.90, 249.90, 20,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  'Calçados', ARRAY['Destaques'], true, 18, 3
),
(
  'Tênis Esportivo Preto',
  'J.com', '37 / 38 / 39 / 40 / 41 / 42 / 43',
  229.90, 229.90, 0,
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80',
  'Calçados', ARRAY['Novidades'], true, 12, 3
),
(
  'Tênis Chunky Platform',
  'J.com', '35 / 36 / 37 / 38 / 39 / 40 / 41',
  279.90, 349.90, 20,
  'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80',
  'Calçados', ARRAY['Novidades', 'Destaques'], true, 10, 2
),

-- ── SHORTS (4) ──────────────────────────────────────────────────
(
  'Short Jeans Feminino',
  'J.com', 'PP / P / M / G / GG',
  89.90, 89.90, 0,
  'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600&q=80',
  'Shorts', ARRAY['Novidades'], true, 22, 5
),
(
  'Short Moletom Masculino',
  'J.com', 'P / M / G / GG',
  69.90, 89.90, 22,
  'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=600&q=80',
  'Shorts', ARRAY['Promoções'], true, 30, 5
),
(
  'Short Esportivo Feminino',
  'J.com', 'PP / P / M / G',
  59.90, 59.90, 0,
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80',
  'Shorts', ARRAY['Novidades'], true, 20, 5
),
(
  'Short Sarja Masculino',
  'J.com', 'P / M / G / GG / XGG',
  99.90, 129.90, 23,
  'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&q=80',
  'Shorts', ARRAY['Promoções', 'Destaques'], true, 15, 3
),

-- ── PERFUMES (2) ────────────────────────────────────────────────
(
  'Perfume Masculino Gold 100ml',
  'J.com', '100ml',
  249.90, 299.90, 17,
  'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&q=80',
  'Perfumes', ARRAY['Destaques'], true, 8, 2
),
(
  'Perfume Feminino Rosé 50ml',
  'J.com', '50ml',
  199.90, 199.90, 0,
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80',
  'Perfumes', ARRAY['Novidades', 'Destaques'], true, 10, 2
);
