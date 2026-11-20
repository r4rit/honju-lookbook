import { PublicHeader } from "@/components/layout/PublicHeader";
import { ShopLookbookClient } from "@/components/lookbook/ShopLookbookClient";
import { listPublicShops } from "@/lib/supabase/queries";
import { publicListFilterSchema } from "@/lib/validators";
import type { PublicListFilter, ShopListItemDTO } from "@/types/shop";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export default async function HomePage(props: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const resolvedSearchParams = await props.searchParams;
  const parsedFilter = publicListFilterSchema.safeParse(
    resolvedSearchParams.filter
  );
  const initialFilter: PublicListFilter = parsedFilter.success
    ? parsedFilter.data
    : "all";

  let initialShops: ShopListItemDTO[] = [];
  let loadError: string | null = null;

  try {
    initialShops = await listPublicShops("all");
  } catch {
    loadError =
      "업체 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader />

      <main className="flex-1 w-full max-w-[960px] xl:max-w-[1120px] mx-auto px-4 md:px-6 pt-6 pb-12 safe-bottom">
        <section className="mb-5">
          <h1 className="font-serif text-page-title text-text-primary">
            어머님·가족 메이크업 후보
          </h1>
          <p className="text-body text-text-secondary mt-1.5">
            사진과 가격, 식장 거리를 편하게 살펴보시고 마음에 드는 곳에 하트를 눌러 주세요.
          </p>
        </section>

        <ShopLookbookClient
          initialShops={initialShops}
          initialFilter={initialFilter}
          loadError={loadError}
        />
      </main>
    </div>
  );
}
