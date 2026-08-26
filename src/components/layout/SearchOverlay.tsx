"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/estimate";

type Hit = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  offerPrice: string;
  mrp: string;
  imageUrl: string | null;
  categoryName: string;
};

const QUICK = ["Sky Shot", "Rocket", "Flower Pot", "Sparklers", "Gift Box", "Chakkar"];

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        let list: Hit[] = json?.data?.products ?? [];

        // Merge custom products from local storage so newly added admin products (e.g. karam) appear immediately!
        try {
          const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_custom_products") : null;
          if (localRaw) {
            const customArr = JSON.parse(localRaw);
            if (Array.isArray(customArr)) {
              const lowerTerm = term.toLowerCase();
              const customMatches = customArr
                .filter(
                  (c: any) =>
                    c &&
                    (String(c.name || "").toLowerCase().includes(lowerTerm) ||
                      String(c.sku || "").toLowerCase().includes(lowerTerm) ||
                      String(c.categoryName || "").toLowerCase().includes(lowerTerm)),
                )
                .map((c: any) => ({
                  id: String(c.id || `prod-${Date.now()}`),
                  name: String(c.name || "Item"),
                  slug: String(c.slug || "item"),
                  sku: String(c.sku || "MYL-PROD"),
                  offerPrice: String(c.offerPrice || c.mrp || "100"),
                  mrp: String(c.mrp || "100"),
                  imageUrl: c.imageUrl ? String(c.imageUrl) : null,
                  categoryName: String(c.categoryName || "Special Fireworks"),
                }));

              const existingSkus = new Set(list.map((h: any) => h.sku || h.id));
              const extraMatches = customMatches.filter((cm: any) => !existingSkus.has(cm.sku) && !existingSkus.has(cm.id));
              if (extraMatches.length > 0) {
                list = [...list, ...extraMatches];
              }
            }
          }
        } catch (err) {}

        setHits(list);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [q, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[600] flex items-start justify-center bg-black/80 px-4 pt-24 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-red-500/25 bg-white p-3 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4 rounded-[24px]">
              <Search size={20} className="text-red-600 shrink-0 font-bold" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 60+ products, SKU codes or categories…"
                className="flex-1 bg-transparent text-[16px] font-bold text-slate-900 outline-none placeholder:text-slate-400"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-slate-400 hover:text-red-600 p-1">
                  <X size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-red-600 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-3 hide-scrollbar">
              {q.trim().length < 2 && (
                <div className="p-3">
                  <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[2.5px] text-slate-700">
                    Popular Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((k) => (
                      <button
                        key={k}
                        onClick={() => setQ(k)}
                        className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition hover:border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && <p className="p-6 text-center text-sm font-bold text-slate-600">Searching products…</p>}

              {!loading && q.trim().length >= 2 && hits.length === 0 && (
                <p className="p-6 text-center text-sm font-bold text-slate-600">
                  No products matched &quot;{q}&quot;.
                </p>
              )}

              {hits.map((h) => (
                <Link
                  key={h.id}
                  href={`/products/${h.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-4 rounded-2xl border border-transparent p-3 transition hover:border-red-200 hover:bg-red-50/70"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={h.imageUrl ?? "/images/placeholder.jpg"}
                    alt={h.name}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{h.name}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">
                      {h.sku} · {h.categoryName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatINR(Number(h.offerPrice))}</p>
                    <p className="text-[11px] font-medium text-slate-400 line-through">{formatINR(Number(h.mrp))}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
