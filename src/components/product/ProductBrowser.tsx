"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { BrowserControls } from "./BrowserControls";
import { ProductCard, type CardProduct } from "./ProductCard";
import { useEstimate } from "@/components/estimate/EstimateProvider";
import { formatINR } from "@/lib/estimate";
import type { CategorySummary } from "@/lib/data";

export function ProductBrowser({
  items,
  categories,
  total,
}: {
  items: CardProduct[];
  categories: CategorySummary[];
  total: number;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [displayItems, setDisplayItems] = useState<CardProduct[]>(items);
  const { add } = useEstimate();

  useEffect(() => {
    setDisplayItems(items);

    // Fetch live items directly from API to ensure multi-device sync (PC <-> Mobile)
    async function syncLiveProducts() {
      try {
        const res = await fetch("/api/v1/products?limit=350&sort=alpha");
        const json = await res.json();
        let apiItems = json?.data?.items || [];

        // Merge with local backup if available
        const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_custom_products") : null;
        if (localRaw) {
          const customArr = JSON.parse(localRaw);
          if (Array.isArray(customArr) && customArr.length > 0) {
            const map = new Map<string, any>(apiItems.map((p: any) => [String(p.id), p]));
            for (const c of customArr) {
              if (!c) continue;
              const targetId = String(c.id || `prod-${Date.now()}`);
              const existing = map.get(targetId);
              const merged = {
                ...(existing || {}),
                ...c,
                id: targetId,
                mrp: String(c.mrp),
                offerPrice: String(c.offerPrice),
              };
              map.set(targetId, merged);
            }
            apiItems = Array.from(map.values());
          }
        }
        if (apiItems.length > 0) setDisplayItems(apiItems);
      } catch (err) {}
    }
    syncLiveProducts();
  }, [items]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[270px_1fr]">
      <BrowserControls
        categories={categories}
        total={displayItems.length}
        view={view}
        onViewChange={setView}
      />

      <div>
        <p className="mb-5 text-[12.5px] font-bold uppercase tracking-[2px] text-slate-500">
          Showing {displayItems.length} of {displayItems.length} products
        </p>

        {displayItems.length === 0 && (
          <div className="glass rounded-[28px] p-14 text-center border border-red-500/15 bg-white shadow-md">
            <p className="font-display text-xl font-bold text-slate-900">No products matched your filters</p>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Try widening the price range or clearing the collection filter.
            </p>
            <Link href="/products" className="btn-gold mt-6 inline-block px-6 py-3 text-sm uppercase font-bold">
              Reset Filters
            </Link>
          </div>
        )}

        {view === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {displayItems.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {displayItems.map((p) => (
              <div
                key={p.id}
                className="glass lift-card flex flex-col gap-5 rounded-[26px] p-4 border border-red-500/15 bg-white shadow-md sm:flex-row sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl ?? ""}
                  alt={p.name}
                  loading="lazy"
                  className={`h-32 w-full rounded-[20px] object-cover border border-slate-200 sm:h-24 sm:w-32 ${
                    Number(p.stock) <= 0 ? "grayscale opacity-60" : ""
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-red-600">
                    {p.categoryName} · {p.sku}
                  </p>
                  <Link href={`/products/${p.slug}`}>
                    <h3 className="mt-1 font-display text-[17px] font-bold text-slate-900 hover:text-red-600">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-[12.5px] text-slate-500 font-medium">
                    {p.packing} · MOQ {p.moq} ·{" "}
                    {Number(p.stock) <= 0 ? (
                      <span className="font-bold text-red-600">Out of Stock</span>
                    ) : (
                      `${p.stock} in stock`
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[11.5px] text-slate-400 line-through">
                      {formatINR(Number(p.mrp))}
                    </p>
                    <p className="font-display text-[21px] font-bold text-red-600">
                      {formatINR(Number(p.offerPrice))}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-600">{p.discountPercent}% off</p>
                  </div>
                  <button
                    disabled={Number(p.stock) <= 0}
                    onClick={() => {
                      if (Number(p.stock) <= 0) return;
                      add({
                        id: p.id,
                        sku: p.sku,
                        slug: p.slug,
                        name: p.name,
                        categoryName: p.categoryName,
                        packing: p.packing,
                        imageUrl: p.imageUrl,
                        mrp: Number(p.mrp),
                        price: Number(p.offerPrice),
                        moq: p.moq,
                      });
                    }}
                    className={`flex h-11 items-center justify-center rounded-2xl text-xs font-bold uppercase ${
                      Number(p.stock) <= 0
                        ? "!bg-slate-200 !text-slate-400 !border-slate-300 cursor-not-allowed pointer-events-none shadow-none px-3"
                        : "btn-gold w-11"
                    }`}
                    aria-label={`Add ${p.name} to estimate`}
                  >
                    {Number(p.stock) <= 0 ? "Out of Stock" : <Plus size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
