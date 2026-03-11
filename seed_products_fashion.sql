-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Produtos Fashion — J.com
-- Execute no Supabase: projeto → SQL Editor → New Query → Run
--
-- Inclui a migração da coluna size_stock automaticamente.
-- Fotos: Unsplash editorial portrait 600×800px (proporção 3:4)
-- Todas no mesmo padrão: fundo neutro/branco, luz limpa, representação real
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Passo 1: Garantir que a coluna size_stock existe ──────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_stock JSONB DEFAULT NULL;

-- (Opcional) Remover produtos de demonstração anteriores da marca J.com
-- DELETE FROM products WHERE brand = 'J.com';

INSERT INTO products
  (name, brand, quantity, price, original_price, discount,
   image_url, category, sections, is_active, stock, size_stock)
VALUES

-- ── MAIS COMPRADOS ─────────────────────────────────────────────────────────────
-- Foto padrão: modelo usando a peça, fundo branco/neutro, 3:4 portrait

(
  'Camiseta Básica Feminina Off-White',
  'J.com', 'P / M / G / GG',
  49.90, 69.90, 29,
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&h=800&q=80',
  'Camisas',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"P": 18, "M": 25, "G": 22, "GG": 10}'::jsonb
),
(
  'Calça Jeans Skinny Preta',
  'J.com', '36 / 38 / 40 / 42 / 44',
  119.90, 159.90, 25,
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&h=800&q=80',
  'Calças',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"36": 8, "38": 15, "40": 18, "42": 12, "44": 6}'::jsonb
),
(
  'Vestido Midi Floral Decote V',
  'J.com', 'P / M / G',
  139.90, 189.90, 26,
  'https://images.unsplash.com/photo-1515886657613-9a6b03b7f2d1?auto=format&fit=crop&w=600&h=800&q=80',
  'Vestidos',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"P": 12, "M": 20, "G": 14}'::jsonb
),
(
  'Tênis Chunky Feminino Branco',
  'J.com', '35 / 36 / 37 / 38 / 39',
  189.90, 249.90, 24,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"35": 6, "36": 10, "37": 14, "38": 12, "39": 8}'::jsonb
),
(
  'Camiseta Masculina Essentials Preta',
  'J.com', 'P / M / G / GG / XGG',
  59.90, 79.90, 25,
  'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=600&h=800&q=80',
  'Camisas',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"P": 14, "M": 28, "G": 30, "GG": 18, "XGG": 8}'::jsonb
),
(
  'Bolsa Tote Canvas Bege',
  'J.com', 'Único',
  99.90, 129.90, 23,
  'https://images.unsplash.com/photo-1548036161-b4a1fb154df3?auto=format&fit=crop&w=600&h=800&q=80',
  'Bolsas',
  ARRAY['Mais comprados']::text[],
  true, 35, null
),
(
  'Blazer Oversized Feminino Bege',
  'J.com', 'P / M / G',
  219.90, 289.90, 24,
  'https://images.unsplash.com/photo-1487744480471-9ca2eb97dab7?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"P": 10, "M": 16, "G": 12}'::jsonb
),
(
  'Shorts Jeans Feminino Desfiado',
  'J.com', '36 / 38 / 40 / 42',
  79.90, 109.90, 27,
  'https://images.unsplash.com/photo-1594938298603-5b46b0c89558?auto=format&fit=crop&w=600&h=800&q=80',
  'Shorts',
  ARRAY['Mais comprados']::text[],
  true, null,
  '{"36": 10, "38": 18, "40": 15, "42": 7}'::jsonb
),

-- ── OFERTAS DO MÊS ────────────────────────────────────────────────────────────

(
  'Top Cropped Ribana Verde Oliva',
  'J.com', 'P / M / G',
  39.90, 59.90, 33,
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"P": 20, "M": 30, "G": 18}'::jsonb
),
(
  'Calça Cargo Masculina Caqui',
  'J.com', '38 / 40 / 42 / 44 / 46',
  149.90, 199.90, 25,
  'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=600&h=800&q=80',
  'Calças',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"38": 8, "40": 14, "42": 16, "44": 10, "46": 5}'::jsonb
),
(
  'Sandália Rasteira de Tiras Nude',
  'J.com', '35 / 36 / 37 / 38 / 39 / 40',
  89.90, 119.90, 25,
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"35": 8, "36": 12, "37": 15, "38": 14, "39": 10, "40": 6}'::jsonb
),
(
  'Mochila Casual Feminina Preta',
  'J.com', 'Único',
  129.90, 179.90, 28,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&h=800&q=80',
  'Bolsas',
  ARRAY['Ofertas do mes']::text[],
  true, 22, null
),
(
  'Camisa Social Slim Fit Masculina Branca',
  'J.com', 'P / M / G / GG',
  119.90, 159.90, 25,
  'https://images.unsplash.com/photo-1516257984-b1b44aa95845?auto=format&fit=crop&w=600&h=800&q=80',
  'masculino',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"P": 10, "M": 22, "G": 20, "GG": 12}'::jsonb
),
(
  'Saia Midi Plissada Rosa Antigo',
  'J.com', 'P / M / G',
  99.90, 139.90, 28,
  'https://images.unsplash.com/photo-1558171814-b76f06b5a0b7?auto=format&fit=crop&w=600&h=800&q=80',
  'Vestidos',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"P": 14, "M": 20, "G": 12}'::jsonb
),
(
  'Óculos de Sol Cat Eye Preto',
  'J.com', 'Único',
  69.90, 99.90, 30,
  'https://images.unsplash.com/photo-1535268250944-2a3f5a63cb1e?auto=format&fit=crop&w=600&h=800&q=80',
  'acessorios',
  ARRAY['Ofertas do mes']::text[],
  true, 40, null
),
(
  'Regata Dry Fit Feminina Azul Royal',
  'J.com', 'P / M / G / GG',
  44.90, 64.90, 31,
  'https://images.unsplash.com/photo-1495385533842-acfbe9c5e7c5?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Ofertas do mes']::text[],
  true, null,
  '{"P": 16, "M": 24, "G": 20, "GG": 10}'::jsonb
),

-- ── MAIS VISTOS ───────────────────────────────────────────────────────────────

(
  'Vestido Longo Boho Estampado',
  'J.com', 'P / M / G',
  169.90, 219.90, 23,
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80',
  'Vestidos',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"P": 10, "M": 16, "G": 12}'::jsonb
),
(
  'Jeans Wide Leg Feminino Azul Médio',
  'J.com', '36 / 38 / 40 / 42',
  149.90, 199.90, 25,
  'https://images.unsplash.com/photo-1551537177-be47777a2ba3?auto=format&fit=crop&w=600&h=800&q=80',
  'Calças',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"36": 8, "38": 14, "40": 16, "42": 8}'::jsonb
),
(
  'Tênis Running Masculino Preto',
  'J.com', '38 / 39 / 40 / 41 / 42 / 43',
  219.90, 289.90, 24,
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"38": 6, "39": 10, "40": 14, "41": 12, "42": 10, "43": 6}'::jsonb
),
(
  'Bolsa Tiracolo Couro Legítimo Preta',
  'J.com', 'Único',
  179.90, 239.90, 25,
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&h=800&q=80',
  'Bolsas',
  ARRAY['Mais Vistos']::text[],
  true, 18, null
),
(
  'Cropped Manga Longa Canelado Marfim',
  'J.com', 'P / M / G',
  54.90, 74.90, 27,
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"P": 16, "M": 22, "G": 14}'::jsonb
),
(
  'Camisa Linho Masculina Off-White',
  'J.com', 'P / M / G / GG',
  129.90, 169.90, 24,
  'https://images.unsplash.com/photo-1434389677669-e1b4f789f80a?auto=format&fit=crop&w=600&h=800&q=80',
  'masculino',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"P": 10, "M": 18, "G": 20, "GG": 10}'::jsonb
),
(
  'Calça Jogger Masculina Cinza Mescla',
  'J.com', 'P / M / G / GG',
  109.90, 149.90, 27,
  'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&w=600&h=800&q=80',
  'Calças',
  ARRAY['Mais Vistos']::text[],
  true, null,
  '{"P": 12, "M": 20, "G": 18, "GG": 10}'::jsonb
),
(
  'Colar Delicado Folheado Ouro 18k',
  'J.com', 'Único',
  59.90, 89.90, 33,
  'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=600&h=800&q=80',
  'acessorios',
  ARRAY['Mais Vistos']::text[],
  true, 50, null
),

-- ── NOVIDADES ─────────────────────────────────────────────────────────────────

(
  'Conjunto Alfaiataria Feminino Preto',
  'J.com', 'P / M / G',
  289.90, 389.90, 26,
  'https://images.unsplash.com/photo-1512436991641-6745cae08f8e?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Novidades']::text[],
  true, null,
  '{"P": 8, "M": 14, "G": 10}'::jsonb
),
(
  'Sapatilha Bico Fino Caramelo',
  'J.com', '35 / 36 / 37 / 38 / 39',
  149.90, 199.90, 25,
  'https://images.unsplash.com/photo-1519415510-9f249e6c7b2b?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Novidades']::text[],
  true, null,
  '{"35": 6, "36": 10, "37": 12, "38": 10, "39": 6}'::jsonb
),
(
  'Bolsa Envelope Verniz Vinho',
  'J.com', 'Único',
  119.90, 169.90, 29,
  'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=600&h=800&q=80',
  'Bolsas',
  ARRAY['Novidades']::text[],
  true, 20, null
),
(
  'Bermuda Tactel Masculina Azul Marinho',
  'J.com', 'P / M / G / GG',
  69.90, 99.90, 30,
  'https://images.unsplash.com/photo-1564859228273-274232fdb516?auto=format&fit=crop&w=600&h=800&q=80',
  'Shorts',
  ARRAY['Novidades']::text[],
  true, null,
  '{"P": 12, "M": 20, "G": 18, "GG": 8}'::jsonb
),
(
  'Brinco Argola Dourado Grande',
  'J.com', 'Único',
  39.90, 59.90, 33,
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&h=800&q=80',
  'acessorios',
  ARRAY['Novidades']::text[],
  true, 60, null
),
(
  'Regata Listrada Manga Canoa',
  'J.com', 'P / M / G',
  49.90, 69.90, 29,
  'https://images.unsplash.com/photo-1496217590455-aa63a8350eea?auto=format&fit=crop&w=600&h=800&q=80',
  'feminino',
  ARRAY['Novidades']::text[],
  true, null,
  '{"P": 14, "M": 22, "G": 16}'::jsonb
),
(
  'Tênis Slip-On Unissex Preto',
  'J.com', '35 / 36 / 37 / 38 / 39 / 40 / 41 / 42',
  159.90, 209.90, 24,
  'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=600&h=800&q=80',
  'Calçados',
  ARRAY['Novidades']::text[],
  true, null,
  '{"35": 6, "36": 8, "37": 10, "38": 12, "39": 12, "40": 10, "41": 8, "42": 6}'::jsonb
),
(
  'Perfume Feminino Floral Intenso 100ml',
  'J.com', '100ml',
  189.90, 249.90, 24,
  'https://images.unsplash.com/photo-1541643600914-78b084683702?auto=format&fit=crop&w=600&h=800&q=80',
  'Perfumes',
  ARRAY['Novidades']::text[],
  true, 25, null
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Verificação: confira os produtos inseridos
-- SELECT name, category, sections, price FROM products ORDER BY created_at DESC LIMIT 32;
-- ══════════════════════════════════════════════════════════════════════════════
