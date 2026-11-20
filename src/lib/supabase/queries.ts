import "server-only";

import { supabasePublic } from "@/lib/supabase/server";
import type {
  FamilyRole,
  PublicListFilter,
  ServiceType,
  ShopCommentDTO,
  ShopDetailDTO,
  ShopImageDTO,
  ShopListItemDTO,
  ShopStatus,
} from "@/types/shop";

interface ShopRow {
  id: string;
  name: string;
  status: ShopStatus;
  region: string;
  address: string;
  venue_distance_note: string;
  service_type: ServiceType;
  price_summary: string;
  parking_info: string;
  business_hours: string;
  highlights: string[] | null;
  pros: string;
  cons: string;
  summary_note: string;
  naver_map_url: string | null;
  instagram_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ShopImageRow {
  id: string;
  shop_id: string;
  storage_path: string;
  public_url: string;
  caption: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

interface ShopVoteRow {
  id: string;
  shop_id: string;
  family_role: FamilyRole;
  created_at: string;
}

interface ShopCommentRow {
  id: string;
  shop_id: string;
  family_role: FamilyRole;
  content: string;
  created_at: string;
}

function compareFinalistThenCreatedDesc(
  a: Pick<ShopListItemDTO, "status" | "created_at">,
  b: Pick<ShopListItemDTO, "status" | "created_at">
): number {
  const aRank = a.status === "finalist" ? 0 : 1;
  const bRank = b.status === "finalist" ? 0 : 1;
  if (aRank !== bRank) return aRank - bRank;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function listPublicShops(
  filter: PublicListFilter = "all"
): Promise<ShopListItemDTO[]> {
  const client = supabasePublic();

  let shopQuery = client
    .from("shops")
    .select(
      "id, name, status, region, venue_distance_note, service_type, price_summary, highlights, created_at"
    )
    .in("status", ["candidate", "finalist"])
    .order("created_at", { ascending: false });

  if (filter === "shop") {
    shopQuery = shopQuery.in("service_type", ["shop", "both"]);
  } else if (filter === "onsite") {
    shopQuery = shopQuery.in("service_type", ["onsite", "both"]);
  }

  const { data: shopsData, error: shopsError } = await shopQuery;
  if (shopsError) {
    throw new Error(`Failed to list public shops: ${shopsError.message}`);
  }

  const shops = (shopsData ?? []) as Array<
    Pick<
      ShopRow,
      | "id"
      | "name"
      | "status"
      | "region"
      | "venue_distance_note"
      | "service_type"
      | "price_summary"
      | "highlights"
      | "created_at"
    >
  >;

  if (shops.length === 0) {
    return [];
  }

  const shopIds = shops.map((s) => s.id);

  const [imagesRes, votesRes, commentsRes] = await Promise.all([
    client
      .from("shop_images")
      .select("id, shop_id, public_url, caption, is_cover, sort_order, created_at")
      .in("shop_id", shopIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("shop_votes")
      .select("shop_id, family_role, created_at")
      .in("shop_id", shopIds)
      .order("created_at", { ascending: true }),
    client
      .from("shop_comments")
      .select("shop_id")
      .in("shop_id", shopIds),
  ]);

  if (imagesRes.error) {
    throw new Error(`Failed to list shop images: ${imagesRes.error.message}`);
  }
  if (votesRes.error) {
    throw new Error(`Failed to list shop votes: ${votesRes.error.message}`);
  }
  if (commentsRes.error) {
    throw new Error(`Failed to list shop comments: ${commentsRes.error.message}`);
  }

  const imagesByShop = new Map<string, Array<Pick<ShopImageRow, "public_url" | "caption" | "is_cover">>>();
  for (const img of (imagesRes.data ?? []) as Array<
    Pick<ShopImageRow, "shop_id" | "public_url" | "caption" | "is_cover">
  >) {
    const bucket = imagesByShop.get(img.shop_id) ?? [];
    bucket.push(img);
    imagesByShop.set(img.shop_id, bucket);
  }

  const votersByShop = new Map<string, FamilyRole[]>();
  for (const vote of (votesRes.data ?? []) as Array<
    Pick<ShopVoteRow, "shop_id" | "family_role">
  >) {
    const bucket = votersByShop.get(vote.shop_id) ?? [];
    bucket.push(vote.family_role);
    votersByShop.set(vote.shop_id, bucket);
  }

  const commentCountByShop = new Map<string, number>();
  for (const comment of (commentsRes.data ?? []) as Array<
    Pick<ShopCommentRow, "shop_id">
  >) {
    commentCountByShop.set(
      comment.shop_id,
      (commentCountByShop.get(comment.shop_id) ?? 0) + 1
    );
  }

  const items: ShopListItemDTO[] = shops.map((shop) => {
    const shopImages = imagesByShop.get(shop.id) ?? [];
    const cover =
      shopImages.find((img) => img.is_cover) ?? shopImages[0] ?? null;
    const voters = votersByShop.get(shop.id) ?? [];

    return {
      id: shop.id,
      name: shop.name,
      status: shop.status,
      region: shop.region,
      venue_distance_note: shop.venue_distance_note,
      service_type: shop.service_type,
      price_summary: shop.price_summary,
      highlights: shop.highlights ?? [],
      cover_image: cover
        ? {
            public_url: cover.public_url,
            caption: cover.caption,
          }
        : null,
      image_count: shopImages.length,
      vote_count: voters.length,
      voters,
      comment_count: commentCountByShop.get(shop.id) ?? 0,
      created_at: shop.created_at,
    };
  });

  if (filter === "popular") {
    items.sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      return compareFinalistThenCreatedDesc(a, b);
    });
  } else {
    items.sort(compareFinalistThenCreatedDesc);
  }

  return items;
}

export async function getPublicShopById(
  id: string
): Promise<ShopDetailDTO | null> {
  const client = supabasePublic();

  const { data: shopData, error: shopError } = await client
    .from("shops")
    .select(
      "id, name, status, region, address, venue_distance_note, service_type, price_summary, parking_info, business_hours, highlights, pros, cons, summary_note, naver_map_url, instagram_url, created_at, updated_at"
    )
    .eq("id", id)
    .in("status", ["candidate", "finalist"])
    .maybeSingle();

  if (shopError) {
    throw new Error(`Failed to fetch public shop: ${shopError.message}`);
  }

  if (!shopData) {
    return null;
  }

  const shop = shopData as ShopRow;

  const [imagesRes, votesRes, commentsRes] = await Promise.all([
    client
      .from("shop_images")
      .select("id, storage_path, public_url, caption, is_cover, sort_order")
      .eq("shop_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("shop_votes")
      .select("family_role")
      .eq("shop_id", id)
      .order("created_at", { ascending: true }),
    client
      .from("shop_comments")
      .select("id, shop_id, family_role, content, created_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (imagesRes.error) {
    throw new Error(`Failed to fetch shop images: ${imagesRes.error.message}`);
  }
  if (votesRes.error) {
    throw new Error(`Failed to fetch shop votes: ${votesRes.error.message}`);
  }
  if (commentsRes.error) {
    throw new Error(
      `Failed to fetch shop comments: ${commentsRes.error.message}`
    );
  }

  const images = (imagesRes.data ?? []) as ShopImageDTO[];
  const voters = ((votesRes.data ?? []) as Array<Pick<ShopVoteRow, "family_role">>).map(
    (v) => v.family_role
  );
  const comments = (commentsRes.data ?? []) as ShopCommentDTO[];

  return {
    id: shop.id,
    name: shop.name,
    status: shop.status,
    region: shop.region,
    address: shop.address,
    venue_distance_note: shop.venue_distance_note,
    service_type: shop.service_type,
    price_summary: shop.price_summary,
    parking_info: shop.parking_info,
    business_hours: shop.business_hours,
    highlights: shop.highlights ?? [],
    pros: shop.pros,
    cons: shop.cons,
    summary_note: shop.summary_note,
    naver_map_url: shop.naver_map_url,
    instagram_url: shop.instagram_url,
    images,
    vote_count: voters.length,
    voters,
    comments,
    created_at: shop.created_at,
    updated_at: shop.updated_at,
  };
}
