import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { CreateShopInput, ShopImageInput, UpdateShopInput } from "@/lib/validators";
import type {
  AdminShopDetailDTO,
  FamilyRole,
  ServiceType,
  ShopCommentDTO,
  ShopImageDTO,
  ShopStatus,
} from "@/types/shop";

const SHOP_IMAGES_BUCKET = "shop-images";

interface AdminShopRow {
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
  raw_source_text: string | null;
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
  shop_id: string;
  family_role: FamilyRole;
}

interface ShopCommentRow {
  id: string;
  shop_id: string;
  family_role: FamilyRole;
  content: string;
  created_at: string;
}

export interface NormalizedImageInsert {
  storage_path: string;
  public_url: string;
  caption: string;
  is_cover: boolean;
  sort_order: number;
}

export function normalizeShopImages(
  images: ShopImageInput[]
): NormalizedImageInsert[] {
  const deduped: ShopImageInput[] = [];
  const seenPaths = new Set<string>();

  for (const img of images) {
    if (seenPaths.has(img.storage_path)) continue;
    seenPaths.add(img.storage_path);
    deduped.push(img);
  }

  if (deduped.length === 0) {
    return [];
  }

  let coverIndex = deduped.findIndex((img) => img.is_cover);
  if (coverIndex === -1) {
    coverIndex = 0;
  }

  return deduped.map((img, index) => ({
    storage_path: img.storage_path,
    public_url: img.public_url,
    caption: img.caption,
    is_cover: index === coverIndex,
    sort_order: index,
  }));
}

export async function removeStoragePathsBestEffort(
  paths: string[]
): Promise<void> {
  const uniquePaths = Array.from(
    new Set(paths.map((p) => p.trim()).filter((p) => p.length > 0))
  );
  if (uniquePaths.length === 0) return;

  try {
    const admin = supabaseAdmin();
    await admin.storage.from(SHOP_IMAGES_BUCKET).remove(uniquePaths);
  } catch {
    // Best-effort cleanup so DB mutations remain consistent even if storage delete fails
  }
}

function mapAdminShopRow(
  shop: AdminShopRow,
  images: ShopImageDTO[],
  voters: FamilyRole[],
  comments: ShopCommentDTO[]
): AdminShopDetailDTO {
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
    raw_source_text: shop.raw_source_text,
    images,
    vote_count: voters.length,
    voters,
    comments,
    comment_count: comments.length,
    created_at: shop.created_at,
    updated_at: shop.updated_at,
  };
}

const ADMIN_SHOP_SELECT =
  "id, name, status, region, address, venue_distance_note, service_type, price_summary, parking_info, business_hours, highlights, pros, cons, summary_note, naver_map_url, instagram_url, raw_source_text, created_at, updated_at";

export async function listAdminShops(): Promise<AdminShopDetailDTO[]> {
  const admin = supabaseAdmin();

  const { data: shopsData, error: shopsError } = await admin
    .from("shops")
    .select(ADMIN_SHOP_SELECT)
    .order("updated_at", { ascending: false });

  if (shopsError) {
    throw new Error(`Failed to list admin shops: ${shopsError.message}`);
  }

  const shops = (shopsData ?? []) as AdminShopRow[];
  if (shops.length === 0) {
    return [];
  }

  const shopIds = shops.map((s) => s.id);

  const [imagesRes, votesRes, commentsRes] = await Promise.all([
    admin
      .from("shop_images")
      .select("id, shop_id, storage_path, public_url, caption, is_cover, sort_order, created_at")
      .in("shop_id", shopIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin
      .from("shop_votes")
      .select("shop_id, family_role")
      .in("shop_id", shopIds)
      .order("created_at", { ascending: true }),
    admin
      .from("shop_comments")
      .select("id, shop_id, family_role, content, created_at")
      .in("shop_id", shopIds)
      .order("created_at", { ascending: true }),
  ]);

  if (imagesRes.error) {
    throw new Error(`Failed to list admin shop images: ${imagesRes.error.message}`);
  }
  if (votesRes.error) {
    throw new Error(`Failed to list admin shop votes: ${votesRes.error.message}`);
  }
  if (commentsRes.error) {
    throw new Error(`Failed to list admin shop comments: ${commentsRes.error.message}`);
  }

  const imagesByShop = new Map<string, ShopImageDTO[]>();
  for (const img of (imagesRes.data ?? []) as ShopImageRow[]) {
    const bucket = imagesByShop.get(img.shop_id) ?? [];
    bucket.push({
      id: img.id,
      storage_path: img.storage_path,
      public_url: img.public_url,
      caption: img.caption,
      is_cover: img.is_cover,
      sort_order: img.sort_order,
    });
    imagesByShop.set(img.shop_id, bucket);
  }

  const votersByShop = new Map<string, FamilyRole[]>();
  for (const vote of (votesRes.data ?? []) as ShopVoteRow[]) {
    const bucket = votersByShop.get(vote.shop_id) ?? [];
    bucket.push(vote.family_role);
    votersByShop.set(vote.shop_id, bucket);
  }

  const commentsByShop = new Map<string, ShopCommentDTO[]>();
  for (const comment of (commentsRes.data ?? []) as ShopCommentRow[]) {
    const bucket = commentsByShop.get(comment.shop_id) ?? [];
    bucket.push({
      id: comment.id,
      shop_id: comment.shop_id,
      family_role: comment.family_role,
      content: comment.content,
      created_at: comment.created_at,
    });
    commentsByShop.set(comment.shop_id, bucket);
  }

  return shops.map((shop) =>
    mapAdminShopRow(
      shop,
      imagesByShop.get(shop.id) ?? [],
      votersByShop.get(shop.id) ?? [],
      commentsByShop.get(shop.id) ?? []
    )
  );
}

export async function getAdminShopById(
  id: string
): Promise<AdminShopDetailDTO | null> {
  const admin = supabaseAdmin();

  const { data: shopData, error: shopError } = await admin
    .from("shops")
    .select(ADMIN_SHOP_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (shopError) {
    throw new Error(`Failed to get admin shop: ${shopError.message}`);
  }

  if (!shopData) {
    return null;
  }

  const shop = shopData as AdminShopRow;

  const [imagesRes, votesRes, commentsRes] = await Promise.all([
    admin
      .from("shop_images")
      .select("id, shop_id, storage_path, public_url, caption, is_cover, sort_order, created_at")
      .eq("shop_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin
      .from("shop_votes")
      .select("family_role")
      .eq("shop_id", id)
      .order("created_at", { ascending: true }),
    admin
      .from("shop_comments")
      .select("id, shop_id, family_role, content, created_at")
      .eq("shop_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (imagesRes.error) {
    throw new Error(`Failed to fetch admin shop images: ${imagesRes.error.message}`);
  }
  if (votesRes.error) {
    throw new Error(`Failed to fetch admin shop votes: ${votesRes.error.message}`);
  }
  if (commentsRes.error) {
    throw new Error(`Failed to fetch admin shop comments: ${commentsRes.error.message}`);
  }

  const images = ((imagesRes.data ?? []) as ShopImageRow[]).map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
    public_url: img.public_url,
    caption: img.caption,
    is_cover: img.is_cover,
    sort_order: img.sort_order,
  }));

  const voters = (
    (votesRes.data ?? []) as Array<Pick<ShopVoteRow, "family_role">>
  ).map((v) => v.family_role);

  const comments = (commentsRes.data ?? []) as ShopCommentDTO[];

  return mapAdminShopRow(shop, images, voters, comments);
}

export class StorageConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConflictError";
  }
}

export async function createAdminShop(
  input: CreateShopInput
): Promise<AdminShopDetailDTO> {
  const admin = supabaseAdmin();
  const normalizedImages = normalizeShopImages(input.images);

  if (normalizedImages.length > 0) {
    const incomingPaths = normalizedImages.map((img) => img.storage_path);
    const { data: existingRefs, error: refCheckError } = await admin
      .from("shop_images")
      .select("storage_path")
      .in("storage_path", incomingPaths);

    if (refCheckError) {
      throw new Error(`Failed to verify image paths: ${refCheckError.message}`);
    }
    if ((existingRefs ?? []).length > 0) {
      throw new StorageConflictError(
        "이미 다른 업체에 연결된 이미지가 포함되어 있습니다."
      );
    }
  }

  const { data: insertedShop, error: insertShopError } = await admin
    .from("shops")
    .insert({
      name: input.name,
      status: input.status,
      region: input.region,
      address: input.address,
      venue_distance_note: input.venue_distance_note,
      service_type: input.service_type,
      price_summary: input.price_summary,
      parking_info: input.parking_info,
      business_hours: input.business_hours,
      highlights: input.highlights,
      pros: input.pros,
      cons: input.cons,
      summary_note: input.summary_note,
      naver_map_url: input.naver_map_url,
      instagram_url: input.instagram_url,
      raw_source_text: input.raw_source_text,
    })
    .select("id")
    .single();

  if (insertShopError || !insertedShop) {
    throw new Error(
      `Failed to create shop: ${insertShopError?.message ?? "unknown"}`
    );
  }

  const createdId = (insertedShop as { id: string }).id;

  if (normalizedImages.length > 0) {
    const { error: insertImagesError } = await admin
      .from("shop_images")
      .insert(
        normalizedImages.map((img) => ({
          shop_id: createdId,
          storage_path: img.storage_path,
          public_url: img.public_url,
          caption: img.caption,
          is_cover: img.is_cover,
          sort_order: img.sort_order,
        }))
      );

    if (insertImagesError) {
      await admin.from("shops").delete().eq("id", createdId);
      throw new Error(
        `Failed to save shop images: ${insertImagesError.message}`
      );
    }
  }

  const created = await getAdminShopById(createdId);
  if (!created) {
    throw new Error("Created shop could not be retrieved.");
  }

  return created;
}

export async function updateAdminShop(
  id: string,
  input: UpdateShopInput
): Promise<AdminShopDetailDTO | null> {
  const admin = supabaseAdmin();

  const { data: existingShop, error: existingError } = await admin
    .from("shops")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check shop existence: ${existingError.message}`);
  }
  if (!existingShop) {
    return null;
  }

  const metadataPatch: Record<string, unknown> = {};
  if (input.name !== undefined) metadataPatch.name = input.name;
  if (input.status !== undefined) metadataPatch.status = input.status;
  if (input.region !== undefined) metadataPatch.region = input.region;
  if (input.address !== undefined) metadataPatch.address = input.address;
  if (input.venue_distance_note !== undefined)
    metadataPatch.venue_distance_note = input.venue_distance_note;
  if (input.service_type !== undefined)
    metadataPatch.service_type = input.service_type;
  if (input.price_summary !== undefined)
    metadataPatch.price_summary = input.price_summary;
  if (input.parking_info !== undefined)
    metadataPatch.parking_info = input.parking_info;
  if (input.business_hours !== undefined)
    metadataPatch.business_hours = input.business_hours;
  if (input.highlights !== undefined)
    metadataPatch.highlights = input.highlights;
  if (input.pros !== undefined) metadataPatch.pros = input.pros;
  if (input.cons !== undefined) metadataPatch.cons = input.cons;
  if (input.summary_note !== undefined)
    metadataPatch.summary_note = input.summary_note;
  if (input.naver_map_url !== undefined)
    metadataPatch.naver_map_url = input.naver_map_url;
  if (input.instagram_url !== undefined)
    metadataPatch.instagram_url = input.instagram_url;
  if (input.raw_source_text !== undefined)
    metadataPatch.raw_source_text = input.raw_source_text;

  let removedStoragePaths: string[] = [];

  if (input.images !== undefined) {
    const normalizedImages = normalizeShopImages(input.images);
    const incomingPaths = normalizedImages.map((img) => img.storage_path);

    if (incomingPaths.length > 0) {
      const { data: conflictingRefs, error: conflictError } = await admin
        .from("shop_images")
        .select("storage_path, shop_id")
        .in("storage_path", incomingPaths)
        .neq("shop_id", id);

      if (conflictError) {
        throw new Error(
          `Failed to validate image ownership: ${conflictError.message}`
        );
      }
      if ((conflictingRefs ?? []).length > 0) {
        throw new StorageConflictError(
          "이미 다른 업체에 연결된 이미지가 포함되어 있습니다."
        );
      }
    }

    const { data: currentImagesData, error: currentImagesError } = await admin
      .from("shop_images")
      .select("storage_path")
      .eq("shop_id", id);

    if (currentImagesError) {
      throw new Error(
        `Failed to load existing shop images: ${currentImagesError.message}`
      );
    }

    const currentPaths = (
      (currentImagesData ?? []) as Array<{ storage_path: string }>
    ).map((row) => row.storage_path);
    const incomingSet = new Set(incomingPaths);
    removedStoragePaths = currentPaths.filter((p) => !incomingSet.has(p));

    const { error: deleteImagesError } = await admin
      .from("shop_images")
      .delete()
      .eq("shop_id", id);

    if (deleteImagesError) {
      throw new Error(
        `Failed to reset shop images: ${deleteImagesError.message}`
      );
    }

    if (normalizedImages.length > 0) {
      const { error: insertImagesError } = await admin
        .from("shop_images")
        .insert(
          normalizedImages.map((img) => ({
            shop_id: id,
            storage_path: img.storage_path,
            public_url: img.public_url,
            caption: img.caption,
            is_cover: img.is_cover,
            sort_order: img.sort_order,
          }))
        );

      if (insertImagesError) {
        throw new Error(
          `Failed to insert updated shop images: ${insertImagesError.message}`
        );
      }
    }

    if (Object.keys(metadataPatch).length === 0) {
      metadataPatch.updated_at = new Date().toISOString();
    }
  }

  if (Object.keys(metadataPatch).length > 0) {
    const { error: updateError } = await admin
      .from("shops")
      .update(metadataPatch)
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update shop: ${updateError.message}`);
    }
  }

  if (removedStoragePaths.length > 0) {
    await removeStoragePathsBestEffort(removedStoragePaths);
  }

  return getAdminShopById(id);
}

export async function deleteAdminShop(id: string): Promise<boolean> {
  const admin = supabaseAdmin();

  const { data: existingShop, error: existingError } = await admin
    .from("shops")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check shop existence: ${existingError.message}`);
  }
  if (!existingShop) {
    return false;
  }

  const { data: imagesData, error: imagesError } = await admin
    .from("shop_images")
    .select("storage_path")
    .eq("shop_id", id);

  if (imagesError) {
    throw new Error(`Failed to list shop image paths: ${imagesError.message}`);
  }

  const storagePaths = (
    (imagesData ?? []) as Array<{ storage_path: string }>
  ).map((row) => row.storage_path);

  const { error: deleteError } = await admin
    .from("shops")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(`Failed to delete shop: ${deleteError.message}`);
  }

  await removeStoragePathsBestEffort(storagePaths);
  return true;
}
