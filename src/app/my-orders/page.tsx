"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  Phone,
  Receipt,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import { formatINR } from "@/lib/estimate";

export default function MyOrdersPage() {
  const [userMobile, setUserMobile] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMobile, setSearchMobile] = useState("");

  useEffect(() => {
    const mob = typeof window !== "undefined" ? localStorage.getItem("mayilon_user_mobile") : null;
    const name = typeof window !== "undefined" ? localStorage.getItem("mayilon_user_name") : null;
    if (mob) {
      setUserMobile(mob);
      setSearchMobile(mob);
    }
    if (name) setUserName(name);
  }, []);

  useEffect(() => {
    async function loadUserOrders() {
      setLoading(true);
      const targetMob = userMobile || searchMobile;
      let matchedOrders: any[] = [];

      try {
        const res = await fetch("/api/v1/estimates").then((r) => r.json()).catch(() => null);
        const all = res?.success && Array.isArray(res?.data?.items) ? res.data.items : [];

        // Scan local storage for order backups
        const localOrders: any[] = [];
        if (typeof window !== "undefined") {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("mayilon_order_") || k === "mayilon_recent_orders")) {
              try {
                const raw = localStorage.getItem(k);
                if (raw) {
                  const item = JSON.parse(raw);
                  if (Array.isArray(item)) localOrders.push(...item);
                  else if (item && item.estimateNumber) localOrders.push(item);
                }
              } catch (e) {}
            }
          }
        }

        const combined = [...all, ...localOrders];
        const map = new Map();
        for (const o of combined) {
          if (o && o.estimateNumber) {
            const existing = map.get(o.estimateNumber);
            map.set(o.estimateNumber, { ...o, ...existing });
          }
        }
        const unique = Array.from(map.values());

        if (targetMob && targetMob.trim().replace(/\D/g, "").length >= 10) {
          const clean = targetMob.replace(/\D/g, "").slice(-10);
          matchedOrders = unique.filter((o: any) => {
            const mobClean = String(o.mobile || "").replace(/\D/g, "").slice(-10);
            return mobClean === clean;
          });
        } else {
          matchedOrders = [];
        }
      } catch (err) {
        console.warn("[MyOrders] Error loading orders:", err);
      } finally {
        matchedOrders.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
        setOrders(matchedOrders);
        setLoading(false);
      }
    }

    void loadUserOrders();
  }, [userMobile, searchMobile]);

  return (
    <div className="shell py-8 sm:py-12">
      {/* Breadcrumb & Title */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-gold mb-3 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Store
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[3px] text-red-600">
              Customer Orders Portal
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              My Fireworks Orders & Tracking 🎆
            </h1>
          </div>

          {userMobile && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 font-extrabold">
                <User size={20} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">{userName || "Valued Customer"}</p>
                <p className="text-xs font-bold text-slate-500">+91 {userMobile}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* If not logged in, offer search by mobile */}
      {!userMobile && (
        <div className="glass mb-8 rounded-[28px] border border-red-500/20 bg-white p-6 sm:p-8 shadow-lg max-w-xl">
          <p className="font-display text-lg font-bold text-slate-900">
            Track Orders by Mobile Number 📱
          </p>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            Enter your 10-digit mobile number to view all your Deepavali orders & live delivery status:
          </p>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">+91</span>
              <input
                type="tel"
                maxLength={10}
                value={searchMobile}
                onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 10-digit mobile number"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="glass rounded-[28px] p-12 text-center border border-slate-200 bg-white">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-slate-600">Loading your Sivakasi orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-[28px] p-12 text-center border border-slate-200 bg-white shadow-md">
          <ShoppingBag size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-display text-xl font-bold text-slate-900">No Orders Found</h3>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-md mx-auto">
            {userMobile
              ? `No active orders found for +91 ${userMobile}. Ready to order Sivakasi crackers at 80% off MRP?`
              : "Enter your mobile number above or log in to view your orders."}
          </p>
          <Link
            href="/products"
            className="btn-gold mt-6 inline-block px-6 py-3 text-xs font-bold uppercase tracking-wider"
          >
            Browse Products & Order
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((ord) => {
            const isDelivered = ord.status === "DELIVERED";
            const isShipped = ord.status === "SHIPPED" || ord.status === "OUT FOR DELIVERY";
            const isPaid = ord.paymentStatus === "PAID";

            return (
              <div
                key={ord.estimateNumber || ord.id}
                className="glass lift-card overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-lg transition-all hover:border-red-500/30"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400 block">
                      Order Reference
                    </span>
                    <span className="font-display text-lg font-extrabold text-slate-900">
                      {ord.estimateNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
                        isDelivered
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isShipped
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : isPaid
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {ord.status || "NEW"}
                    </span>

                    <Link
                      href={`/estimate/${ord.estimateNumber}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-sm transition-all"
                    >
                      <Truck size={14} /> Live Delivery Tracker <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Body Row */}
                <div className="p-6">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">
                        Date & Customer
                      </p>
                      <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Calendar size={13} className="text-red-500" />
                        {ord.createdAt
                          ? new Date(ord.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Recent Order"}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-1">
                        {ord.customerName} · +91 {ord.mobile}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">
                        Delivery Address
                      </p>
                      <p className="text-xs font-medium text-slate-700 mt-1 line-clamp-2">
                        {ord.address || ord.city || "Sivakasi Licensed Direct Transport"}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">
                        Total Amount
                      </p>
                      <p className="font-display text-xl font-extrabold text-red-600 mt-0.5">
                        {formatINR(Number(ord.grandTotal) || 0)}
                      </p>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        {ord.itemCount || (ord.items ? ord.items.length : 1)} Products Ordered
                      </span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {Array.isArray(ord.items) && ord.items.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <p className="text-[10.5px] font-bold uppercase tracking-[1px] text-slate-400 mb-2">
                        Ordered Items Preview:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ord.items.map((it: any, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm"
                          >
                            <span>{it.name}</span>
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-700">
                              x{it.quantity}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
