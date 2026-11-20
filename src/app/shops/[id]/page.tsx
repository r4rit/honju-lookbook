import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopDetailView } from "@/components/detail/ShopDetailView";
import { requireAdminSession } from "@/lib/admin-auth";
import { getPublicShopById } from "@/lib/supabase/queries";
import { uuidSchema } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) {
    return { title: "업체를 찾을 수 없어요" };
  }

  try {
    const shop = await getPublicShopById(idCheck.data);
    if (!shop) {
      return { title: "업체를 찾을 수 없어요" };
    }

    const coverImage =
      shop.images.find((img) => img.is_cover) ?? shop.images[0] ?? null;

    const descriptionParts = [
      shop.price_summary,
      shop.pros || shop.summary_note,
      shop.region,
    ].filter((part) => part.trim().length > 0);

    const description =
      descriptionParts.join(" · ").slice(0, 150) ||
      "혼주 메이크업·헤어 후보 상세 정보입니다.";

    const ogTitle = `${shop.name} | 혼주 룩북`;

    return {
      title: shop.name,
      description,
      openGraph: {
        title: ogTitle,
        description,
        siteName: "혼주 룩북",
        type: "article",
        locale: "ko_KR",
        url: `/shops/${shop.id}`,
        ...(coverImage
          ? {
              images: [
                {
                  url: coverImage.public_url,
                  alt: coverImage.caption || shop.name,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: coverImage ? "summary_large_image" : "summary",
        title: ogTitle,
        description,
        ...(coverImage ? { images: [coverImage.public_url] } : {}),
      },
    };
  } catch {
    return { title: "업체 상세 정보" };
  }
}

export default async function ShopDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) {
    notFound();
  }

  const [shop, isAdmin] = await Promise.all([
    getPublicShopById(idCheck.data),
    requireAdminSession(),
  ]);

  if (!shop) {
    notFound();
  }

  return <ShopDetailView initialShop={shop} isAdmin={isAdmin} />;
}
