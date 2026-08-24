"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone, Receipt } from "lucide-react";
import { useEstimate } from "@/components/estimate/EstimateProvider";
import { formatINR } from "@/lib/estimate";
import { SITE, waLink } from "@/lib/slug";

export function MobileDock() {
  const pathname = usePathname();
  const { items, totals } = useEstimate();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-[280] flex items-center gap-2 rounded-2xl border border-red-500/20 bg-white/95 p-2 shadow-2xl backdrop-blur-md md:hidden print:hidden">
        <a
          href={`tel:${SITE.phoneRaw}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-red-50 hover:text-red-600 shadow-sm"
        >
          <Phone size={15} className="text-red-600 font-bold" /> Call
        </a>
        <a
          href={waLink("Hi Mayilon Crackers, I need a quotation.")}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-600 hover:text-white shadow-sm"
        >
          <MessageCircle size={15} className="text-emerald-600 font-bold" /> WhatsApp
        </a>
        <Link href="/estimate" className="btn-gold flex flex-[1.4] items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase shadow-md">
          <Receipt size={15} />
          {items.length ? formatINR(totals.subtotal, { compact: true }) : "Estimate"}
        </Link>
      </div>

      <a
        href={waLink("Hi Mayilon Crackers, I would like the latest price list.")}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-8 left-6 z-[280] hidden h-13 w-13 items-center justify-center rounded-full border border-emerald-400 bg-emerald-600 p-3.5 text-white shadow-[0_0_30px_-6px_rgba(22,163,74,0.6)] transition-all duration-500 hover:scale-110 md:flex"
      >
        <MessageCircle size={22} />
      </a>
    </>
  );
}
