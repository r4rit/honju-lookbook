import { PublicHeader } from "@/components/layout/PublicHeader";

export default function ShopDetailLoading() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader backHref="/" backLabel="목록" />

      <main className="flex-1 w-full max-w-[1040px] mx-auto px-4 md:px-6 pt-6 pb-14 animate-pulse">
        <div className="md:editorial-card md:rounded-3xl md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          <div className="md:col-span-6 space-y-3">
            <div className="aspect-[4/3] w-full rounded-2xl bg-surface-subtle border border-border" />
            <div className="hidden md:grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl bg-surface-subtle"
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-6 space-y-5">
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-full bg-border/60" />
              <div className="h-7 w-24 rounded-full bg-border/50" />
            </div>
            <div className="h-9 w-2/3 rounded-xl bg-border/70" />
            <div className="h-24 w-full rounded-2xl bg-surface border border-border" />
            <div className="h-52 w-full rounded-2xl bg-surface border border-border" />
          </div>
        </div>
      </main>
    </div>
  );
}
