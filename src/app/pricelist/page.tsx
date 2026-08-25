"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FileText, ArrowLeft, Printer, MessageCircle, Phone, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/estimate";
import { SITE, waLink } from "@/lib/slug";

export default function PriceListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    setTodayDate(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
    async function load() {
      try {
        const res = await fetch("/api/v1/products?limit=300&sort=alpha");
        const json = await res.json();
        let list = json?.data?.items || [];
        
        // Merge Local Storage Backup for instant offline/custom products
        try {
          const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_custom_products") : null;
          if (localRaw) {
            const localProds = JSON.parse(localRaw);
            if (Array.isArray(localProds)) {
              const map = new Map();
              for (const p of list) if (p && p.id) map.set(p.id, p);
              for (const p of localProds) if (p && p.id) map.set(p.id, p);
              list = Array.from(map.values());
            }
          }
        } catch (err) {}

        setProducts(list);
      } catch (err) {
        console.error("Failed to load price list:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const downloadExcelCsv = () => {
    if (!products || products.length === 0) return;
    const headers = ["S.No", "Category", "Product Code (SKU)", "Product Name", "Packing", "MRP (INR)", "Wholesale Offer Price (INR)"];
    
    let serial = 1;
    const rows: string[] = [];
    rows.push(`"MAYILON PYROWORLD - Sivakasi Wholesale Fireworks Factory Price List 2026"`);
    rows.push(`"Date: ${todayDate} | Flat 80% Off Factory Direct Wholesale Rates"`);
    rows.push("");
    rows.push(headers.map((h) => `"${h}"`).join(","));

    products.forEach((p) => {
      const cat = (p.categoryName || "General Fireworks").replace(/"/g, '""');
      const sku = (p.sku || "").replace(/"/g, '""');
      const name = (p.name || "").replace(/"/g, '""');
      const packing = (p.packing || "").replace(/"/g, '""');
      const mrp = Number(p.mrp || 0).toFixed(2);
      const offerPrice = Number(p.offerPrice || 0).toFixed(2);

      rows.push(`"${serial++}","${cat}","${sku}","${name}","${packing}","${mrp}","${offerPrice}"`);
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Mayilon_Crackers_Sivakasi_Wholesale_Price_List_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group products by category
  const categoriesMap: Record<string, any[]> = {};
  products.forEach((p) => {
    const cat = p.categoryName || "General Fireworks";
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(p);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top Action Bar - Hidden in Print PDF */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600">
            <ArrowLeft size={16} /> Back to Website
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={waLink("Hi Mayilon Crackers, I checked your Price List and would like to place an order.")}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white transition shadow-sm"
            >
              <MessageCircle size={15} /> Order on WhatsApp
            </a>
            <button
              onClick={downloadExcelCsv}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md"
            >
              <Download size={15} /> Download Excel (.csv)
            </button>
            <button
              onClick={handlePrint}
              className="btn-gold flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase shadow-md"
            >
              <Printer size={16} /> Download / Print PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Printable Container */}
      <main className="mx-auto max-w-5xl bg-white p-6 sm:p-10 shadow-lg my-6 rounded-3xl border border-slate-200 print:m-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        {/* Printable Letterhead Header */}
        <div className="border-b-2 border-red-600 pb-6 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-[11px] font-extrabold uppercase text-red-700 mb-2">
              <Sparkles size={13} /> Official PESO Factory Direct Price List
            </div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
              MAYILON <span className="text-red-600">PYROWORLD</span>
            </h1>
            <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-wider">
              Sivakasi Wholesale Crackers Factory Direct · ISO 9001:2015 PESO Certified
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              142/3A Viswanatham Road, Sivakasi, Tamil Nadu - 626123 · Phone: +91 94888 88888
            </p>
          </div>

          <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-center sm:text-right shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-red-600 block">Season Offer 2026</span>
            <p className="text-2xl font-extrabold text-red-600">FLAT 80% OFF</p>
            <p className="text-[11px] font-bold text-slate-700 mt-1">Price List Date: {todayDate}</p>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="my-6 rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-700 border border-slate-200">
          💥 All prices listed below are after 80% Sivakasi Factory Discount. Minimum order for wholesale packing is ₹3,000. Free transport booking to all towns across South India!
        </div>

        {loading ? (
          <div className="py-20 text-center font-bold text-slate-500">Loading Price List Data...</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(categoriesMap).map(([category, items], catIdx) => (
              <div key={category} className="break-inside-avoid">
                <div className="flex items-center gap-2 border-b border-red-600/30 pb-2 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-extrabold text-white">
                    {catIdx + 1}
                  </span>
                  <h2 className="font-display text-lg font-bold uppercase tracking-wider text-slate-900">
                    {category}
                  </h2>
                  <span className="ml-auto text-xs font-bold text-slate-500">({items.length} Items)</span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-bold uppercase text-slate-700">
                      <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 w-28">Packing</th>
                      <th className="py-2.5 px-3 w-24 text-right">MRP (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right text-red-600">Offer Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                        <td className="py-2 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.name}
                          <span className="ml-2 text-[10px] font-normal text-slate-500">({item.sku})</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{item.packing}</td>
                        <td className="py-2 px-3 text-right text-slate-400 line-through font-medium">
                          {formatINR(Number(item.mrp))}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-red-600 text-sm">
                          {formatINR(Number(item.offerPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Footer Terms & Contact */}
        <div className="mt-12 border-t-2 border-slate-300 pt-6 text-center text-xs text-slate-600 space-y-2 break-inside-avoid">
          <p className="font-bold text-slate-900">
            MAYILON PYROWORLD · 100% Genuine Sivakasi Fireworks Factory Outlet
          </p>
          <p>
            For Bulk Enquiries & Custom Quotations: Call <span className="font-bold text-red-600">+91 94888 88888</span> / WhatsApp <span className="font-bold text-emerald-600">+91 94888 88888</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Legal Note: As per Supreme Court directive & PESO guidelines, fireworks orders are packed for door delivery through licensed transport carriers. Price List valid for 2026 season.
          </p>
        </div>
      </main>
    </div>
  );
}
