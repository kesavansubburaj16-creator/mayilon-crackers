"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { EstimateActions } from "@/components/estimate/EstimateActions";
import { formatINR } from "@/lib/estimate";
import { SITE } from "@/lib/slug";

const STAGES = ["NEW", "PENDING", "PACKAGE READY", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED"];

export function OrderInvoiceView({
  number,
  initialEstimate,
  initialItems,
}: {
  number: string;
  initialEstimate?: any;
  initialItems?: any[];
}) {
  const [estimate, setEstimate] = useState<any>(initialEstimate);
  const [items, setItems] = useState<any[]>(initialItems || []);

  useEffect(() => {
    let timerId: any;

    async function syncLiveStatus() {
      try {
        const res = await fetch(`/api/v1/estimates/${number}`);
        const json = await res.json();
        if (json?.success && json?.data?.estimate) {
          const liveEst = json.data.estimate;
          const liveItems = json.data.items;

          setEstimate(liveEst);
          if (Array.isArray(liveItems) && liveItems.length > 0) {
            setItems(liveItems);
          }

          // Keep local storage updated with live server status
          try {
            localStorage.setItem(`mayilon_order_${number}`, JSON.stringify(liveEst));
          } catch (e) {}
        }
      } catch (err) {
        // Fallback to localStorage if offline
        try {
          const localRaw = localStorage.getItem(`mayilon_order_${number}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (parsed) {
              setEstimate((prev: any) => ({ ...parsed, status: prev?.status || parsed.status }));
              if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                setItems(parsed.items);
              }
            }
          }
        } catch (lErr) {}
      }
    }

    // Run live sync immediately
    syncLiveStatus();

    // Poll live status every 4 seconds for instant tracker updates
    timerId = setInterval(syncLiveStatus, 4000);

    return () => clearInterval(timerId);
  }, [number]);

  const activeEst = estimate || {
    id: "est-fallback",
    estimateNumber: number,
    customerName: "Valued Customer",
    mobile: "9876543210",
    email: "customer@mayilon.com",
    state: "Tamil Nadu",
    city: "Sivakasi",
    pincode: "626123",
    address: "Direct Sivakasi Licensed Dispatch Address",
    status: "NEW",
    mrpTotal: "7500.00",
    subtotal: "1500.00",
    savings: "6000.00",
    discount: "150.00",
    transportCharge: "0.00",
    gstAmount: "243.00",
    grandTotal: "1593.00",
    createdAt: new Date(),
  };

  const activeItems = items.length
    ? items
    : [
        {
          id: "item-1",
          name: "Sivakasi Premium Fireworks Pack",
          categoryName: "PREMIUM FOUNTAINS",
          packing: "1 Box (10 pcs)",
          sku: "MYL-FTN-01",
          mrp: "500.00",
          price: "100.00",
          quantity: 15,
          lineTotal: "1500.00",
        },
      ];

  const stageIndex = Math.max(0, STAGES.indexOf(activeEst.status));

  return (
    <div className="shell py-10">
      <div className="glass mb-8 flex flex-wrap items-center gap-4 rounded-[26px] border border-emerald-500/30 bg-emerald-50 p-6 shadow-md print:hidden">
        <CheckCircle2 size={32} className="text-emerald-600" />
        <div className="flex-1">
          <p className="font-display text-[21px] font-bold text-slate-900">
            Order Placed Successfully! 🎉
          </p>
          <p className="text-[14px] font-medium text-slate-700 mt-1">
            Order Ref <span className="font-bold text-red-600">{activeEst.estimateNumber}</span> — Instant SMS & WhatsApp receipt has been sent to +91 {activeEst.mobile}. Our Sivakasi packing team is preparing your dispatch!
          </p>
        </div>
        <Link href="/products" className="btn-gold px-6 py-3 text-[12.5px] uppercase font-bold">
          Continue Shopping
        </Link>
      </div>

      {/* Saram Pattasu Animated Delivery Tracker */}
      <div className="glass mb-8 rounded-[30px] p-6 sm:p-8 border border-red-500/20 bg-gradient-to-b from-white via-red-50/20 to-white shadow-xl relative overflow-hidden print:hidden">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white text-xs font-black shadow-md">
              🎆
            </span>
            <p className="text-[12px] font-extrabold uppercase tracking-[3px] text-red-600">
              Saram Pattasu Order Delivery Tracker
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md border border-red-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Live Status: {activeEst.status === "NEW" ? "1. ORDER PLACED" : activeEst.status}
            </span>
          </div>
        </div>

        {/* Saram Pattasu Garland Strand */}
        <div className="relative pt-4 pb-2">
          {/* Fuse line background */}
          <div className="absolute top-1/2 left-4 right-4 h-2 -translate-y-1/2 rounded-full bg-slate-200 shadow-inner" />

          {/* Animated burning fuse progress bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(12, ((stageIndex + 1) / STAGES.length) * 100))}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-1/2 left-4 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
          />

          {/* Stepper Cracker Nodes */}
          <div className="relative z-10 flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
            {STAGES.map((s, i) => {
              const isCompleted = i <= stageIndex;
              const isCurrent = i === stageIndex;

              return (
                <div key={s} className="flex flex-col items-center text-center min-w-[100px] flex-1">
                  {/* Pattasu Red/Gold Cracker Cylinder Node */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: isCurrent ? 1.15 : 1 }}
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl font-black text-xs transition-all duration-300 shadow-md ${
                      isCompleted
                        ? "bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-500/40 ring-4 ring-emerald-100"
                        : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 border border-slate-300"
                    }`}
                  >
                    {/* Fuse tip flame for current step */}
                    {isCurrent && (
                      <span className="absolute -top-3 flex h-4 w-4 items-center justify-center text-xs animate-bounce">
                        🔥
                      </span>
                    )}

                    {isCompleted ? (
                      <span className="text-sm font-extrabold">✓</span>
                    ) : (
                      <span>0{i + 1}</span>
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <span
                    className={`mt-3 text-[11px] font-extrabold uppercase tracking-wide leading-snug ${
                      isCompleted ? "text-emerald-800 font-extrabold" : "text-slate-400 font-bold"
                    }`}
                  >
                    {s === "PACKAGE READY" ? "PACKAGE READY" : s === "OUT FOR DELIVERY" ? "OUT FOR DELIVERY" : s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* document */}
      <div className="glass overflow-hidden rounded-[30px] border border-red-500/15 bg-white shadow-xl print:border-0 print:bg-white print:text-black">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 p-8">
          <div className="flex items-center gap-4">
            <LogoMark size={54} />
            <div>
              <p className="font-display text-[20px] font-bold uppercase tracking-[3px] text-slate-900 print:text-black">
                Mayilon Crackers
              </p>
              <p className="text-[12px] font-medium text-slate-600 print:text-black">{SITE.address}</p>
              <p className="text-[12px] font-medium text-slate-600 print:text-black">
                GSTIN {SITE.gst} · {SITE.phone}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-red-600">Official Order Invoice</p>
            <p className="font-display text-[22px] font-bold text-slate-900 print:text-black">
              {activeEst.estimateNumber}
            </p>
            <p className="text-[12px] font-medium text-slate-500 print:text-black">
              {new Date(activeEst.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <span className="mt-2 inline-block rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[2px] text-red-600">
              {activeEst.status}
            </span>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-200 p-8 sm:grid-cols-3">
          <Block title="Customer Details">
            {activeEst.customerName}
            <br />
            +91 {activeEst.mobile}
            {activeEst.email ? <><br />{activeEst.email}</> : null}
            {activeEst.gstNumber ? <><br />GST: {activeEst.gstNumber}</> : null}
          </Block>
          <Block title="Delivery Address">
            {activeEst.address || "—"}
            <br />
            {[activeEst.city, activeEst.district, activeEst.state, activeEst.pincode]
              .filter(Boolean)
              .join(", ")}
          </Block>
          <Block title="Transport & Billing">
            {activeEst.transportName || "Direct Factory Transport"}
            <br />
            {activeEst.deliveryLocation || "Sivakasi Licensed Dispatch"}
            {activeEst.instructions ? <><br />Note: {activeEst.instructions}</> : null}
          </Block>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-[2px] text-slate-500 print:text-black">
                <th className="px-8 py-3">#</th>
                <th className="py-3">Product Name</th>
                <th className="py-3">SKU</th>
                <th className="py-3 text-right">MRP</th>
                <th className="py-3 text-right">Offer Price</th>
                <th className="py-3 text-center">Qty</th>
                <th className="px-8 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((it, i) => (
                <tr key={it.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-8 py-3.5 font-medium text-slate-400 print:text-black">{i + 1}</td>
                  <td className="py-3.5">
                    <p className="font-bold text-slate-900 print:text-black">{it.name}</p>
                    <p className="text-[11.5px] font-medium text-slate-500 print:text-black">
                      {it.categoryName} · {it.packing}
                    </p>
                  </td>
                  <td className="py-3.5 font-medium text-slate-600 print:text-black">{it.sku}</td>
                  <td className="py-3.5 text-right text-slate-400 line-through print:text-black">
                    {formatINR(Number(it.mrp))}
                  </td>
                  <td className="py-3.5 text-right font-bold text-red-600">{formatINR(Number(it.price))}</td>
                  <td className="py-3.5 text-center font-bold text-slate-900 print:text-black">{it.quantity}</td>
                  <td className="px-8 py-3.5 text-right font-bold text-slate-900 print:text-black">
                    {formatINR(Number(it.lineTotal || Number(it.price) * Number(it.quantity)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-2 border-t border-slate-200 p-8 text-[13.5px]">
          <Line label="Gross MRP value" value={formatINR(Number(activeEst.mrpTotal))} />
          <Line label="Factory offer subtotal" value={formatINR(Number(activeEst.subtotal))} />
          <Line label="Total savings" value={`- ${formatINR(Number(activeEst.savings))}`} accent />
          {Number(activeEst.discount) > 0 && (
            <Line label={`Coupon ${activeEst.couponCode ?? ""}`} value={`- ${formatINR(Number(activeEst.discount))}`} accent />
          )}
          <Line
            label="Transport Freight Charge"
            value={Number(activeEst.transportCharge) > 0 ? formatINR(Number(activeEst.transportCharge)) : "Payable on Delivery"}
          />
          <p className="text-[11px] font-bold text-amber-800 bg-amber-50 rounded-lg p-1.5 my-1">
            🚚 Transport Freight Charge: Payable by Customer directly to parcel carrier upon arrival at destination transport hub.
          </p>
          <Line
            label="GST (18%)"
            value={Number(activeEst.gstAmount) > 0 ? formatINR(Number(activeEst.gstAmount)) : "₹0 (Applied only for Orders > ₹50,000)"}
          />
          <div className="mt-3 flex w-full max-w-sm items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-[12px] font-bold uppercase tracking-[2px] text-slate-500 print:text-black">
              Grand Total
            </span>
            <span className="font-display text-[26px] font-bold text-red-600">
              {formatINR(Number(activeEst.grandTotal))}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-200 p-8 text-[12px] font-medium leading-relaxed text-slate-600 print:text-black">
          <p className="mb-2 font-bold uppercase tracking-[2px] text-red-600">Terms & Shipping Guarantee</p>
          1. Official order invoice generated from Mayilon Crackers Sivakasi facility. 2. Goods are packed under strict PESO quality control and dispatched via licensed explosives transport. 3. Direct transport track link and waybill will be updated on your order page within 24 hours.
        </div>
      </div>

      <div className="mt-8">
        <EstimateActions
          estimateNumber={activeEst.estimateNumber}
          total={formatINR(Number(activeEst.grandTotal))}
          items={activeItems.length}
        />
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[3px] text-red-600">{title}</p>
      <p className="text-[13.5px] font-medium leading-relaxed text-slate-700 print:text-black">{children}</p>
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex w-full max-w-sm items-center justify-between">
      <span className="font-medium text-slate-600 print:text-black">{label}</span>
      <span className={accent ? "font-bold text-emerald-600" : "font-bold text-slate-900 print:text-black"}>{value}</span>
    </div>
  );
}
