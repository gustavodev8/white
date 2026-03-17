-- ============================================================
--  Seed: 7 produtos de Bolsas
--  Execute no SQL Editor do Supabase
-- ============================================================

INSERT INTO products (
  id,
  name,
  brand,
  quantity,
  price,
  original_price,
  discount,
  image_url,
  category,
  sections,
  is_active,
  stock,
  size_stock,
  created_at,
  updated_at
) VALUES

  -- 1. Bolsa Tote Canvas Bege
  (
    gen_random_uuid(),
    'Bolsa Tote Canvas Bege',
    'Arezzo',
    'Único',
    189.90,
    249.90,
    24,
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    'Bolsas',
    ARRAY['Novidades', 'Destaques'],
    true,
    12,
    null,
    now(),
    now()
  ),

  -- 2. Bolsa Tiracolo Couro Caramelo
  (
    gen_random_uuid(),
    'Bolsa Tiracolo Couro Caramelo',
    'Schutz',
    'Único',
    299.90,
    399.90,
    25,
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80',
    'Bolsas',
    ARRAY['Novidades'],
    true,
    7,
    null,
    now(),
    now()
  ),

  -- 3. Clutch Verniz Preta
  (
    gen_random_uuid(),
    'Clutch Verniz Preta',
    'Via Mia',
    'Único',
    129.90,
    179.90,
    28,
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
    'Bolsas',
    ARRAY['Destaques', 'Mais Vendidos'],
    true,
    15,
    null,
    now(),
    now()
  ),

  -- 4. Mochila Couro Eco Marrom
  (
    gen_random_uuid(),
    'Mochila Couro Eco Marrom',
    'Dumond',
    'Único',
    349.90,
    449.90,
    22,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    'Bolsas',
    ARRAY['Novidades'],
    true,
    5,
    null,
    now(),
    now()
  ),

  -- 5. Bolsa Envelope Vinho
  (
    gen_random_uuid(),
    'Bolsa Envelope Vinho',
    'Loucos & Santos',
    'Único',
    159.90,
    219.90,
    27,
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80',
    'Bolsas',
    ARRAY['Mais Vendidos'],
    true,
    10,
    null,
    now(),
    now()
  ),

  -- 6. Bolsa Hobo Couro Nude
  (
    gen_random_uuid(),
    'Bolsa Hobo Couro Nude',
    'Bottero',
    'Único',
    219.90,
    299.90,
    27,
    'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&q=80',
    'Bolsas',
    ARRAY['Destaques'],
    true,
    9,
    null,
    now(),
    now()
  ),

  -- 7. Bolsa Satchel Estruturada Preta
  (
    gen_random_uuid(),
    'Bolsa Satchel Estruturada Preta',
    'Capodarte',
    'Único',
    279.90,
    379.90,
    26,
    'https://images.unsplash.com/photo-1614179818511-8b14d5ca6f4f?w=600&q=80',
    'Bolsas',
    ARRAY['Novidades', 'Mais Vendidos'],
    true,
    6,
    null,
    now(),
    now()
  );
