-- ============================================================================
-- Honju Lookbook (혼주 룩북) - Initial PostgreSQL Schema, RLS & Storage Setup
-- Target: Supabase PostgreSQL (ap-northeast-2 Seoul)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Core Tables
-- ----------------------------------------------------------------------------

-- 1.1 Candidate Makeup & Hair Shops
CREATE TABLE IF NOT EXISTS public.shops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  status              TEXT NOT NULL DEFAULT 'candidate'
                        CHECK (status IN ('candidate', 'finalist', 'excluded')),
  region              TEXT NOT NULL DEFAULT '' CHECK (char_length(region) <= 60),
  address             TEXT NOT NULL DEFAULT '' CHECK (char_length(address) <= 240),
  venue_distance_note TEXT NOT NULL DEFAULT '' CHECK (char_length(venue_distance_note) <= 160),
  service_type        TEXT NOT NULL DEFAULT 'shop'
                        CHECK (service_type IN ('shop', 'onsite', 'both')),
  price_summary       TEXT NOT NULL DEFAULT '' CHECK (char_length(price_summary) <= 160),
  parking_info        TEXT NOT NULL DEFAULT '' CHECK (char_length(parking_info) <= 240),
  business_hours      TEXT NOT NULL DEFAULT '' CHECK (char_length(business_hours) <= 200),
  highlights          TEXT[] NOT NULL DEFAULT '{}'
                        CHECK (coalesce(array_length(highlights, 1), 0) <= 8),
  pros                TEXT NOT NULL DEFAULT '' CHECK (char_length(pros) <= 1000),
  cons                TEXT NOT NULL DEFAULT '' CHECK (char_length(cons) <= 1000),
  summary_note        TEXT NOT NULL DEFAULT '' CHECK (char_length(summary_note) <= 1000),
  naver_map_url       TEXT CHECK (naver_map_url IS NULL OR naver_map_url ~* '^https?://'),
  instagram_url       TEXT CHECK (instagram_url IS NULL OR instagram_url ~* '^https?://'),
  raw_source_text     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Reference Images (Stored in Supabase Storage, never hotlinked)
CREATE TABLE IF NOT EXISTS public.shop_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL UNIQUE,
  public_url    TEXT NOT NULL CHECK (public_url ~* '^https?://'),
  caption       TEXT NOT NULL DEFAULT '' CHECK (char_length(caption) <= 80),
  is_cover      BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Family Likes / Votes (1 vote per family role per shop)
CREATE TABLE IF NOT EXISTS public.shop_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  family_role  TEXT NOT NULL CHECK (
                 family_role IN (
                   '신랑',
                   '신부',
                   '신부측 어머니',
                   '신부측 아버지',
                   '신랑측 어머니',
                   '신랑측 아버지',
                   '형제·자매'
                 )
               ),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_shop_votes_shop_role UNIQUE (shop_id, family_role)
);

-- 1.4 Family Comments
CREATE TABLE IF NOT EXISTS public.shop_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  family_role  TEXT NOT NULL CHECK (
                 family_role IN (
                   '신랑',
                   '신부',
                   '신부측 어머니',
                   '신부측 아버지',
                   '신랑측 어머니',
                   '신랑측 아버지',
                   '형제·자매'
                 )
               ),
  content      TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Indexes & Triggers
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_shops_status_created
  ON public.shops (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shops_service_type
  ON public.shops (service_type);

CREATE INDEX IF NOT EXISTS idx_shop_images_shop_sort
  ON public.shop_images (shop_id, sort_order ASC, created_at ASC);

-- Enforce at most ONE cover image per shop at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_images_single_cover
  ON public.shop_images (shop_id)
  WHERE (is_cover = true);

CREATE INDEX IF NOT EXISTS idx_shop_votes_shop_id
  ON public.shop_votes (shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_comments_shop_created
  ON public.shop_comments (shop_id, created_at ASC);

-- Auto-update shops.updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shops_set_updated_at ON public.shops;
CREATE TRIGGER trg_shops_set_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- Design: Public roles (anon/authenticated) are strictly SELECT-only for
-- visible shops ('candidate', 'finalist'). ALL writes (votes, comments, admin
-- CRUD) execute exclusively through Next.js API Routes using service_role
-- after Zod validation and PIN/role verification.
-- ----------------------------------------------------------------------------

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_comments ENABLE ROW LEVEL SECURITY;

-- Public read of non-excluded shops
DROP POLICY IF EXISTS "public_select_visible_shops" ON public.shops;
CREATE POLICY "public_select_visible_shops"
  ON public.shops
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('candidate', 'finalist'));

-- Public read of images belonging to visible shops
DROP POLICY IF EXISTS "public_select_visible_shop_images" ON public.shop_images;
CREATE POLICY "public_select_visible_shop_images"
  ON public.shop_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_images.shop_id
        AND s.status IN ('candidate', 'finalist')
    )
  );

-- Public read of votes belonging to visible shops
DROP POLICY IF EXISTS "public_select_visible_shop_votes" ON public.shop_votes;
CREATE POLICY "public_select_visible_shop_votes"
  ON public.shop_votes
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_votes.shop_id
        AND s.status IN ('candidate', 'finalist')
    )
  );

-- Public read of comments belonging to visible shops
DROP POLICY IF EXISTS "public_select_visible_shop_comments" ON public.shop_comments;
CREATE POLICY "public_select_visible_shop_comments"
  ON public.shop_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_comments.shop_id
        AND s.status IN ('candidate', 'finalist')
    )
  );

-- Note: No INSERT/UPDATE/DELETE policies are granted to anon/authenticated.
-- Supabase service_role bypasses RLS inside server-side Next.js API routes.

-- ----------------------------------------------------------------------------
-- 4. Supabase Storage Bucket & Policies (`shop-images`)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images',
  'shop-images',
  true,
  5242880, -- 5 MB hard server limit
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_shop_images_bucket" ON storage.objects;
CREATE POLICY "public_read_shop_images_bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'shop-images');

-- Uploads and deletions execute exclusively via server-side service_role key
-- through /api/admin/upload and /api/admin/shops/[id].

-- ----------------------------------------------------------------------------
-- 5. Table Privileges (GRANT) for PostgREST Roles
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.shops, public.shop_images, public.shop_votes, public.shop_comments
  TO anon, authenticated;

GRANT ALL PRIVILEGES ON public.shops, public.shop_images, public.shop_votes, public.shop_comments
  TO service_role;
