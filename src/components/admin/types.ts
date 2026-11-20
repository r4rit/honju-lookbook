import type {
  AdminShopDetailDTO,
  ServiceType,
  ShopStatus,
} from "@/types/shop";

export interface AdminDraftImage {
  id?: string;
  storage_path: string;
  public_url: string;
  caption: string;
  is_cover: boolean;
  sort_order: number;
  persisted: boolean;
}

export interface PendingUploadTile {
  tempId: string;
  fileName: string;
}

export interface AdminShopFormState {
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
  naver_map_url: string;
  instagram_url: string;
  raw_source_text: string;
}

export function createEmptyFormState(): AdminShopFormState {
  return {
    name: "",
    status: "candidate",
    region: "",
    address: "",
    venue_distance_note: "",
    service_type: "shop",
    price_summary: "",
    parking_info: "",
    business_hours: "",
    highlights: [],
    pros: "",
    cons: "",
    summary_note: "",
    naver_map_url: "",
    instagram_url: "",
    raw_source_text: "",
  };
}

export function shopDtoToFormState(shop: AdminShopDetailDTO): {
  form: AdminShopFormState;
  images: AdminDraftImage[];
} {
  return {
    form: {
      name: shop.name,
      status: shop.status,
      region: shop.region,
      address: shop.address,
      venue_distance_note: shop.venue_distance_note,
      service_type: shop.service_type,
      price_summary: shop.price_summary,
      parking_info: shop.parking_info,
      business_hours: shop.business_hours,
      highlights: [...shop.highlights],
      pros: shop.pros,
      cons: shop.cons,
      summary_note: shop.summary_note,
      naver_map_url: shop.naver_map_url ?? "",
      instagram_url: shop.instagram_url ?? "",
      raw_source_text: shop.raw_source_text ?? "",
    },
    images: shop.images.map((img, index) => ({
      id: img.id,
      storage_path: img.storage_path,
      public_url: img.public_url,
      caption: img.caption,
      is_cover: img.is_cover,
      sort_order: index,
      persisted: true,
    })),
  };
}
