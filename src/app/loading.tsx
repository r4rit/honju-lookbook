import { PublicHeader } from "@/components/layout/PublicHeader";

export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader />

      <main className="flex-1 w-full max-w-[960px] xl:max-w-[1120px] mx-auto px-4 md:px-6 pt-6 pb-12 safe-bottom">
        <div className="mb-5 space-y-2 animate-pulse">
          <div className="h-8 w-64 max-w-full rounded-xl bg-border/70" />
          <div className="h-5 w-80 max-w-full rounded-lg bg-border/50" />
        </div>

        <div className="flex items-center gap-2 mb-6 animate-pulse">
          <div className="h-12 w-20 rounded-full bg-border/70" />
          <div className="h-12 w-24 rounded-full bg-border/50" />
          <div className="h-12 w-24 rounded-full bg-border/50" />
          <div className="h-12 w-32 rounded-full bg-border/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 animate-pulse">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="editorial-card rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] w-full bg-surface-subtle" />
              <div className="p-5 space-y-3">
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-border/60" />
                  <div className="h-6 w-20 rounded-full bg-border/50" />
                </div>
                <div className="h-6 w-3/4 rounded-lg bg-border/70" />
                <div className="h-5 w-1/2 rounded-lg bg-border/50" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
