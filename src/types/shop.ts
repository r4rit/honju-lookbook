export const FAMILY_ROLES = [
  "신랑",
  "신부",
  "신부측 어머니",
  "신부측 아버지",
  "신랑측 어머니",
  "신랑측 아버지",
  "형제·자매",
] as const;

export type FamilyRole = (typeof FAMILY_ROLES)[number];

export const SHOP_STATUSES = ["candidate", "finalist", "excluded"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const SHOP_STATUS_LABELS: Record<ShopStatus, string> = {
  candidate: "후보",
  finalist: "최종 후보",
  excluded: "제외",
};

export const SERVICE_TYPES = ["shop", "onsite", "both"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  shop: "샵 방문",
  onsite: "출장 가능",
  both: "샵·출장 모두",
};

export const PUBLIC_LIST_FILTERS = ["all", "shop", "onsite", "popular"] as const;
export type PublicListFilter = (typeof PUBLIC_LIST_FILTERS)[number];

export type FontScale = "normal" | "large";

export interface ShopImageDTO {
  id: string;
  storage_path: string;
  public_url: string;
  caption: string;
  is_cover: boolean;
  sort_order: number;
}

export interface ShopCommentDTO {
  id: string;
  shop_id: string;
  family_role: FamilyRole;
  content: string;
  created_at: string;
}

export interface ShopListItemDTO {
  id: string;
  name: string;
  status: ShopStatus;
  region: string;
  venue_distance_note: string;
  service_type: ServiceType;
  price_summary: string;
  highlights: string[];
  cover_image: Pick<ShopImageDTO, "public_url" | "caption"> | null;
  image_count: number;
  vote_count: number;
  voters: FamilyRole[];
  comment_count: number;
  created_at: string;
}

export interface ShopDetailDTO {
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
  highlights: string[];
  pros: string;
  cons: string;
  summary_note: string;
  naver_map_url: string | null;
  instagram_url: string | null;
  images: ShopImageDTO[];
  vote_count: number;
  voters: FamilyRole[];
  comments: ShopCommentDTO[];
  created_at: string;
  updated_at: string;
}

export interface AdminShopDetailDTO extends ShopDetailDTO {
  raw_source_text: string | null;
  comment_count: number;
}

export interface ParsedShopDraftDTO {
  name: string;
  region: string;
  address: string;
  price_summary: string;
  service_type: ServiceType;
  parking_info: string;
  business_hours: string;
  highlights: string[];
  pros: string;
  cons: string;
  summary_note: string;
  detected_naver_map_url: string | null;
  detected_instagram_url: string | null;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
