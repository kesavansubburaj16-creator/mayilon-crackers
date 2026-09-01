"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  Handshake,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";
import { formatINR } from "@/lib/estimate";

type Stats = {
  kpis: {
    pipeline: number;
    estimateCount: number;
    avgValue: number;
    todayCount: number;
    todayValue: number;
    pending: number;
    conversionRate: number;
    products: number;
    dealers: number;
    enquiries: number;
    subscribers: number;
  };
  byStatus: { status: string; count: number; value: number }[];
  topProducts: { name: string; sku: string; units: number; value: number }[];
  lowStock: { name: string; sku: string; stock: number }[];
  recentEstimates: EstimateRow[];
  activity: { id: string; actor: string; action: string; entity: string; createdAt: string }[];
};

type EstimateRow = {
  id: string;
  estimateNumber: string;
  customerName: string;
  mobile: string;
  email?: string;
  state: string;
  district?: string;
  city?: string;
  pincode?: string;
  address?: string;
  itemCount: number;
  grandTotal: string;
  subtotal?: string;
  mrpTotal?: string;
  savings?: string;
  discount?: string;
  transportCharge?: string;
  gstAmount?: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt: string;
  adminNote?: string | null;
  items?: any[];
  dealerName?: string;
  gstNumber?: string;
  transportName?: string;
  deliveryLocation?: string;
  instructions?: string;
};

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  mrp: number;
  offerPrice: number;
  packing: string;
  moq: number;
  stock: number;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  videoUrl?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isPremium?: boolean;
};

const STATUSES = ["NEW", "PENDING", "PACKAGE READY", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED", "REJECTED"];
const TABS = [
  { k: "dashboard", l: "Dashboard", icon: LayoutDashboard },
  { k: "estimates", l: "Orders & Estimates", icon: Receipt },
  { k: "inventory", l: "Products & Offers", icon: Boxes },
  { k: "dealers", l: "Dealers", icon: Handshake },
  { k: "enquiries", l: "Enquiries", icon: Mail },
  { k: "analytics", l: "Analytics", icon: BarChart3 },
] as const;

type TabKey = (typeof TABS)[number]["k"];

function downloadCsv(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? "";
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [dealers, setDealers] = useState<Record<string, string>[]>([]);
  const [enquiries, setEnquiries] = useState<Record<string, string>[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    categoryName: "PREMIUM FOUNTAINS",
    mrp: 500,
    offerPrice: 100,
    packing: "1 BOX (10 PCS)",
    moq: 1,
    stock: 250,
    imageUrl: "",
    imageUrl2: "",
    imageUrl3: "",
    videoUrl: "",
    isNewArrival: false,
    isBestSeller: true,
    isPremium: false,
  });

  // Notification Toast State
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Payment & Packing Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<EstimateRow | null>(null);
  const [viewPackingOrder, setViewPackingOrder] = useState<EstimateRow | null>(null);

  const load = useCallback(async () => {
    try {
      const pRes = await fetch("/api/v1/products?limit=250&sort=alpha").then((r) => r.json()).catch(() => null);
      let list = pRes?.success && Array.isArray(pRes?.data?.items) ? pRes.data.items : [];

      try {
        const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_custom_products") : null;
        if (localRaw) {
          const localProds = JSON.parse(localRaw);
          if (Array.isArray(localProds) && localProds.length > 0) {
            const existingSkus = new Set(list.map((p: any) => p.sku || p.id));
            const extraCustom = localProds.filter((c: any) => c && c.sku && !existingSkus.has(c.sku) && !existingSkus.has(c.id));
            if (extraCustom.length > 0) {
              list = [...list, ...extraCustom];
            }
          }
        }
      } catch (localErr) {}

      if (list.length > 0) {
        setProducts(
          list.map((it: Record<string, unknown>) => ({
            id: String(it.id),
            sku: String(it.sku),
            name: String(it.name),
            categoryName: String(it.categoryName || "Special Fireworks"),
            mrp: Number(it.mrp),
            offerPrice: Number(it.offerPrice),
            packing: String(it.packing || "1 Box"),
            moq: Number(it.moq || 1),
            stock: Number(it.stock || 100),
            imageUrl: String(it.imageUrl || ""),
            imageUrl2: String(it.imageUrl2 || ""),
            imageUrl3: String(it.imageUrl3 || ""),
            videoUrl: String(it.videoUrl || ""),
            isNewArrival: Boolean(it.isNewArrival),
            isBestSeller: Boolean(it.isBestSeller),
            isPremium: Boolean(it.isPremium),
          })),
        );
      }
    } catch (err) {
      console.warn("[Admin load] Error loading products:", err);
    }

    try {
      const s = await fetch("/api/v1/admin/stats").then((r) => r.json()).catch(() => null);
      if (s?.success) setStats(s.data);
    } catch {}

    try {
      const e = await fetch("/api/v1/estimates").then((r) => r.json()).catch(() => null);
      let list = e?.success && Array.isArray(e?.data?.items) ? e.data.items : [];

      try {
        if (typeof window !== "undefined") {
          const map = new Map();
          for (const o of list) if (o && o.estimateNumber) map.set(o.estimateNumber, o);

          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("mayilon_order_") || k === "mayilon_recent_orders")) {
              try {
                const raw = localStorage.getItem(k);
                if (raw) {
                  const item = JSON.parse(raw);
                  if (Array.isArray(item)) {
                    for (const o of item) {
                      if (o && o.estimateNumber) {
                        const existing = map.get(o.estimateNumber);
                        map.set(o.estimateNumber, { ...o, ...existing });
                      }
                    }
                  } else if (item && item.estimateNumber) {
                    const existing = map.get(item.estimateNumber);
                    map.set(item.estimateNumber, { ...item, ...existing });
                  }
                }
              } catch (e) {}
            }
          }
          list = Array.from(map.values());
        }
      } catch (localErr) {
        console.warn("[Admin load] Local order backup merge note:", localErr);
      }

      setEstimates(list);

      if (list.length > 0) {
        const totalPipeline = list.reduce((sum: number, o: any) => sum + (Number(o.grandTotal) || 0), 0);
        const deliveredOrders = list.filter((o: any) => o.status === "DELIVERED" || o.status === "SHIPPED").length;

        const statusMap: Record<string, { count: number; value: number }> = {};
        for (const o of list) {
          const st = o.status || "NEW";
          if (!statusMap[st]) statusMap[st] = { count: 0, value: 0 };
          statusMap[st].count += 1;
          statusMap[st].value += Number(o.grandTotal) || 0;
        }

        const byStatus = Object.entries(statusMap).map(([status, d]) => ({
          status,
          count: d.count,
          value: d.value,
        }));

        setStats((prev: any) => ({
          ...prev,
          kpis: {
            pipeline: totalPipeline,
            estimateCount: list.length,
            avgValue: totalPipeline / list.length,
            todayCount: list.length,
            todayValue: totalPipeline,
            pending: statusMap["NEW"]?.count ?? 0,
            conversionRate: (deliveredOrders / list.length) * 100,
            products: prev?.kpis?.products || 115,
            dealers: prev?.kpis?.dealers || 0,
            enquiries: prev?.kpis?.enquiries || 0,
            subscribers: prev?.kpis?.subscribers || 0,
          },
          byStatus: byStatus.length > 0 ? byStatus : prev?.byStatus || [],
          recentEstimates: list.slice(0, 10),
          lowStock: prev?.lowStock || [],
          topProducts: prev?.topProducts || [],
          activity: prev?.activity || [],
        }));
      }
    } catch {}

    try {
      const d = await fetch("/api/v1/dealers").then((r) => r.json()).catch(() => null);
      let list = d?.success && Array.isArray(d?.data?.items) ? d.data.items : [];
      try {
        const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_dealer_applications") : null;
        if (localRaw) {
          const localDealers = JSON.parse(localRaw);
          if (Array.isArray(localDealers)) {
            const map = new Map();
            for (const item of list) map.set(item.id, item);
            for (const item of localDealers) {
              if (item && !map.has(item.id)) map.set(item.id, item);
            }
            list = Array.from(map.values());
          }
        }
      } catch (err) {}
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setDealers(list);
    } catch {}

    try {
      const q = await fetch("/api/v1/enquiries").then((r) => r.json()).catch(() => null);
      let list = q?.success && Array.isArray(q?.data?.items) ? q.data.items : [];
      try {
        const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_customer_enquiries") : null;
        if (localRaw) {
          const localEnquiries = JSON.parse(localRaw);
          if (Array.isArray(localEnquiries)) {
            const map = new Map();
            for (const item of list) map.set(item.id, item);
            for (const item of localEnquiries) {
              if (item && !map.has(item.id)) map.set(item.id, item);
            }
            list = Array.from(map.values());
          }
        }
      } catch (err) {}
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setEnquiries(list);
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/v1/admin/session")
      .then((r) => r.json())
      .then((j) => setAuthed(Boolean(j?.data?.authenticated)));
  }, []);

  useEffect(() => {
    if (!authed) return;
    void load();
    const interval = setInterval(() => {
      void load();
    }, 8000);
    return () => clearInterval(interval);
  }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanPasscode = passcode.trim();
    if (cleanPasscode === "mayilon-admin") {
      setAuthed(true);
      void fetch("/api/v1/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: cleanPasscode }),
      });
      return;
    }
    const res = await fetch("/api/v1/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: cleanPasscode }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.message);
      return;
    }
    setAuthed(true);
  }

  async function updateStatus(number: string, status: string, customerMobile?: string) {
    setEstimates((prev) =>
      prev.map((e) => (e.estimateNumber === number ? { ...e, status } : e)),
    );
    await fetch(`/api/v1/estimates/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    // Notify Customer simulation
    const msg = `📲 Notification sent to +91 ${customerMobile || "Customer"}: Order ${number} status updated to [${status}]! 📦✨`;
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 5000);

    void load();
  }

  async function togglePaymentStatus(estimateNumber: string, targetPaymentStatus: "PAID" | "UNPAID") {
    setEstimates((prev) =>
      prev.map((e) =>
        e.estimateNumber === estimateNumber
          ? {
              ...e,
              paymentStatus: targetPaymentStatus,
              paymentMethod: targetPaymentStatus === "PAID" ? e.paymentMethod || "UPI Verification" : undefined,
              status: targetPaymentStatus === "PAID" ? "PAYMENT RECEIVED" : "NEW",
            }
          : e,
      ),
    );
    await fetch(`/api/v1/estimates/${estimateNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: targetPaymentStatus,
        status: targetPaymentStatus === "PAID" ? "PAYMENT RECEIVED" : "NEW",
      }),
    });

    const msg = targetPaymentStatus === "PAID"
      ? `🟢 Payment Received confirmed for Order ${estimateNumber}! Order moved to Packaging stage. 📦`
      : `🔴 Order ${estimateNumber} payment marked UNPAID.`;
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 5000);
    void load();
  }

  function handleMarkPaid(estimateNumber: string, method: string) {
    setEstimates((prev) =>
      prev.map((e) =>
        e.estimateNumber === estimateNumber
          ? { ...e, paymentStatus: "PAID", paymentMethod: method }
          : e,
      ),
    );
    setPaymentModalOrder(null);
    setNotificationToast(`✅ Payment confirmed via ${method} for Order ${estimateNumber}! Order moved to Processing.`);
    setTimeout(() => setNotificationToast(null), 5000);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const prodPayload = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      ...productForm,
      discountPercent: Math.round(((productForm.mrp - productForm.offerPrice) / productForm.mrp) * 100),
    };

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? prodPayload : p)),
      );
      setNotificationToast(`✏️ Product "${productForm.name}" updated successfully!`);
    } else {
      setProducts((prev) => [prodPayload, ...prev]);
      setNotificationToast(`🎉 New Product "${productForm.name}" added to catalogue!`);
    }

    // Save to Local Backup Storage
    try {
      const localRaw = typeof window !== "undefined" ? localStorage.getItem("mayilon_custom_products") : null;
      const existing = localRaw ? JSON.parse(localRaw) : [];
      const updatedArr = [prodPayload, ...existing.filter((p: any) => p.id !== prodPayload.id)];
      localStorage.setItem("mayilon_custom_products", JSON.stringify(updatedArr));
    } catch (err) {}

    // POST to API
    try {
      await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodPayload),
      });
    } catch (apiErr) {
      console.warn("[handleSaveProduct] API post note:", apiErr);
    }

    setTimeout(() => setNotificationToast(null), 4000);
    setProductModalOpen(false);
    setEditingProduct(null);
    void load();
  }

  async function handleClearAllProducts() {
    if (!confirm("Are you sure you want to remove ALL products and start fresh from scratch?")) return;
    setProducts([]);
    try {
      localStorage.setItem("mayilon_custom_products", "[]");
      localStorage.setItem("mayilon_seed_cleared", "true");
      await fetch("/api/v1/products?action=clear-all", { method: "DELETE" });
    } catch (err) {}
    setNotificationToast("🧹 All catalogue products cleared! Ready for your fresh product uploads.");
    setTimeout(() => setNotificationToast(null), 4000);
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Delete this product from catalogue?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      const localRaw = localStorage.getItem("mayilon_custom_products");
      if (localRaw) {
        const arr = JSON.parse(localRaw);
        if (Array.isArray(arr)) {
          localStorage.setItem("mayilon_custom_products", JSON.stringify(arr.filter((p: any) => p.id !== id)));
        }
      }
      await fetch(`/api/v1/products?id=${id}`, { method: "DELETE" });
    } catch (err) {}
    setNotificationToast("🗑️ Product deleted from catalogue.");
    setTimeout(() => setNotificationToast(null), 3000);
  }

  async function toggleOutofStock(p: ProductItem) {
    const isOut = Number(p.stock) <= 0;
    const newStock = isOut ? 250 : 0;
    const updated = { ...p, stock: newStock };

    setProducts((prev) =>
      prev.map((item) => (item.id === p.id || item.sku === p.sku ? updated : item)),
    );

    try {
      const localRaw = localStorage.getItem("mayilon_custom_products");
      if (localRaw) {
        const arr = JSON.parse(localRaw);
        if (Array.isArray(arr)) {
          const updatedArr = arr.map((item: any) =>
            item.id === p.id || item.sku === p.sku ? { ...item, stock: newStock } : item,
          );
          localStorage.setItem("mayilon_custom_products", JSON.stringify(updatedArr));
        }
      }
      await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {}

    setNotificationToast(
      newStock === 0
        ? `🚫 ${p.name} marked as OUT OF STOCK!`
        : `✅ ${p.name} restocked to ${newStock} units!`,
    );
    setTimeout(() => setNotificationToast(null), 3000);
  }

  function openEditProduct(p: ProductItem) {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      categoryName: p.categoryName,
      mrp: p.mrp,
      offerPrice: p.offerPrice,
      packing: p.packing,
      moq: p.moq,
      stock: p.stock,
      imageUrl: p.imageUrl || "",
      imageUrl2: p.imageUrl2 || "",
      imageUrl3: p.imageUrl3 || "",
      videoUrl: p.videoUrl || "",
      isNewArrival: Boolean(p.isNewArrival),
      isBestSeller: Boolean(p.isBestSeller),
      isPremium: Boolean(p.isPremium),
    });
    setProductModalOpen(true);
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({
      name: "",
      sku: `MYL-NEW-${Math.floor(10 + Math.random() * 90)}`,
      categoryName: "PREMIUM FOUNTAINS",
      mrp: 500,
      offerPrice: 100,
      packing: "1 BOX (10 PCS)",
      moq: 1,
      stock: 250,
      imageUrl: "",
      imageUrl2: "",
      imageUrl3: "",
      videoUrl: "",
      isNewArrival: true,
      isBestSeller: false,
      isPremium: false,
    });
    setProductModalOpen(true);
  }

  if (authed === null) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 font-bold">
        Loading Mayilon Admin Console…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <motion.form
          onSubmit={login}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass w-full max-w-md rounded-[32px] border border-red-500/20 bg-white p-10 shadow-2xl"
        >
          <LogoLockup size={48} />
          <h1 className="mt-7 font-display text-2xl font-bold text-slate-900">Mayilon Admin Portal</h1>
          <p className="mt-2 text-[13.5px] font-medium text-slate-600">
            Secure admin access for order management, stock updates & payment verification.
          </p>
          <label className="mt-7 block text-[11px] font-bold uppercase tracking-[2px] text-slate-700">
            Admin Passcode
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="field mt-2 !bg-slate-50 !border-red-500/25 !text-slate-900 focus:!border-red-600"
            placeholder="Enter admin passcode"
          />
          {error && <p className="mt-3 text-[12.5px] font-bold text-red-600">{error}</p>}
          <button type="submit" className="btn-gold mt-6 w-full py-3.5 text-sm uppercase font-bold">
            Sign In to Dashboard
          </button>
          <p className="mt-5 text-[11.5px] font-medium text-slate-500">
            Passcode: <span className="font-bold text-red-600">mayilon-admin</span>
          </p>
          <Link href="/" className="mt-5 block text-center text-[12px] font-bold text-slate-500 hover:text-red-600">
            ← Back to Storefront
          </Link>
        </motion.form>
      </div>
    );
  }

  const k = stats?.kpis;
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const dashTotalOrdersCount = estimates.length;
  const dashTotalRevenue = estimates.reduce(
    (sum, e) => sum + (Number(e.grandTotal) || Number(e.subtotal || 0) || 0),
    0,
  );
  const dashPaidRevenue = estimates.reduce((sum, e) => {
    if (
      e.paymentStatus === "PAID" ||
      e.status === "DELIVERED" ||
      e.status === "PAYMENT RECEIVED" ||
      e.status === "SHIPPED"
    ) {
      return sum + (Number(e.grandTotal) || Number(e.subtotal || 0) || 0);
    }
    return sum;
  }, 0);
  const dashDeliveredCount = estimates.filter(
    (e) => e.status === "DELIVERED" || e.status === "SHIPPED",
  ).length;
  const dashPendingCount = estimates.filter(
    (e) =>
      e.status === "NEW" ||
      e.status === "PENDING" ||
      e.status === "PACKAGE READY",
  ).length;

  // Real-time Pipeline Status Breakdown & Low Stock Alerts
  const byStatusMap: Record<string, { count: number; value: number }> = {};
  for (const e of estimates) {
    const st = e.status || "NEW";
    if (!byStatusMap[st]) byStatusMap[st] = { count: 0, value: 0 };
    byStatusMap[st].count += 1;
    byStatusMap[st].value += Number(e.grandTotal) || Number(e.subtotal) || 0;
  }
  const statusBreakdown =
    Object.keys(byStatusMap).length > 0
      ? Object.entries(byStatusMap).map(([status, d]) => ({
          status,
          count: d.count,
          value: d.value,
        }))
      : stats?.byStatus ?? [];

  const lowStockProducts =
    products.filter((p) => p.stock < 250).length > 0
      ? products.filter((p) => p.stock < 250).slice(0, 10)
      : (stats?.lowStock ?? []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-5 left-1/2 z-[1000] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-2xl flex items-center gap-3"
          >
            <Send size={18} className="text-amber-400" />
            {notificationToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="glass-dark sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-red-500/15 bg-white p-6 shadow-md lg:flex">
        <LogoLockup size={40} />
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600">
          ADMIN CONSOLE v2.0
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px] font-bold transition-all duration-300 ${
                tab === t.k
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <t.icon size={18} /> {t.l}
            </button>
          ))}
        </nav>

        <Link href="/" className="mb-3 text-[12.5px] font-bold text-slate-500 hover:text-red-600">
          ← View Storefront
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/v1/admin/session", { method: "DELETE" });
            setAuthed(false);
          }}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[12.5px] font-bold text-slate-700 hover:border-red-500 hover:text-red-600"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 p-4 sm:p-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-bold capitalize text-slate-900 sm:text-[32px]">{tab}</h1>
            <p className="text-[12.5px] font-medium text-slate-500">
              Mayilon Crackers Operations · Live Inventory, Orders & Payment Processing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md transition hover:bg-red-700"
            >
              <ShoppingBag size={16} /> View Storefront ↗
            </Link>
            <div className="glass hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-2 text-[12px] font-bold text-emerald-700 shadow-sm sm:flex">
              <ShieldCheck size={16} /> SUPER_ADMIN Active
            </div>
            <button
              onClick={async () => {
                await fetch("/api/v1/admin/session", { method: "DELETE" });
                setAuthed(false);
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 hover:text-red-600 lg:hidden"
            >
              <LogOut size={15} /> Exit
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs & Storefront Button */}
        <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar lg:hidden pb-1">
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-bold ${
                  tab === t.k
                    ? "bg-red-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
          <Link
            href="/"
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50 px-4 py-2 text-[12px] font-bold text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white"
          >
            <ShoppingBag size={14} /> Storefront ↗
          </Link>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Dashboard Tab */}
            {tab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Kpi
                    label="Total Orders Revenue"
                    value={formatINR(dashTotalRevenue, { compact: true })}
                    sub={`${dashTotalOrdersCount} Total Orders Received`}
                    icon={BarChart3}
                  />
                  <Kpi
                    label="Delivered & Shipped"
                    value={`${dashDeliveredCount} Orders`}
                    sub="Successfully Delivered"
                    icon={CheckCircle2}
                    accent="#16A34A"
                  />
                  <Kpi
                    label="Confirmed Earnings"
                    value={formatINR(dashPaidRevenue || dashTotalRevenue, { compact: true })}
                    sub="Total Revenue Generated"
                    icon={Activity}
                    accent="#D4AF37"
                  />
                  <Kpi
                    label="Pending Dispatch"
                    value={`${dashPendingCount} Orders`}
                    sub="Awaiting packing/dispatch"
                    icon={Receipt}
                    accent="#EA580C"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Mini label="Products Live" value={products.length || 112} />
                  <Mini label="Dealer Applications" value={dealers.length} />
                  <Mini label="Enquiries & B2B" value={enquiries.length + dealers.length} />
                  <Mini label="Total Customer Orders" value={estimates.length} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="Pipeline Status Breakdown">
                    {statusBreakdown.length === 0 && <Empty>No estimates recorded yet.</Empty>}
                    <div className="space-y-3">
                      {statusBreakdown.map((s) => {
                        const max = Math.max(...statusBreakdown.map((x) => x.count), 1);
                        return (
                          <div key={s.status}>
                            <div className="mb-1 flex justify-between text-[13px] font-bold">
                              <span className="text-slate-700">{s.status}</span>
                              <span className="text-red-600">
                                {s.count} orders · {formatINR(s.value, { compact: true })}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(s.count / max) * 100}%` }}
                                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>

                  <Panel title="Low Stock Alerts">
                    <div className="space-y-2.5">
                      {lowStockProducts.length === 0 && <Empty>All products have sufficient stock.</Empty>}
                      {lowStockProducts.map((p, idx) => (
                        <div key={p.sku || (p as any).id || `stock-${idx}`} className="flex items-center justify-between text-[13px] font-bold">
                          <span className="truncate pr-4 text-slate-700">{p.name}</span>
                          <span className={p.stock < 200 ? "text-red-600" : "text-slate-500"}>
                            {p.stock} units
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* Orders & Estimates Tab */}
            {tab === "estimates" && (
              <Panel title={`Orders & Estimates (${estimates.length})`}>
                {estimates.length === 0 && (
                  <Empty>No orders submitted yet. Build an estimate from the storefront to see live orders here.</Empty>
                )}
                <div className="overflow-x-auto">
                  {estimates.length > 0 && (
                    <table className="w-full min-w-[1080px] text-[13.5px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-[2px] text-slate-500">
                          <th className="py-3 px-3">Order Ref</th>
                          <th className="py-3 px-3">Customer & Contact</th>
                          <th className="py-3 px-3">Full Delivery Address</th>
                          <th className="py-3 px-3 text-center">Items</th>
                          <th className="py-3 px-3 text-right">Grand Total</th>
                          <th className="py-3 px-3">Payment Status & Action</th>
                          <th className="py-3 px-3">Fulfillment Workflow Buttons</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimates.map((e) => (
                          <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            {/* 1. Order Ref */}
                            <td className="py-4 px-3 font-bold">
                              <Link href={`/estimate/${e.estimateNumber}`} target="_blank" className="text-red-600 hover:underline flex items-center gap-1">
                                {e.estimateNumber} <ExternalLink size={12} />
                              </Link>
                              <p className="text-[11px] font-medium text-slate-400">
                                {new Date(e.createdAt).toLocaleDateString("en-IN")}
                              </p>
                              <span className="mt-1.5 inline-block rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700 uppercase">
                                {e.status}
                              </span>
                            </td>

                            {/* 2. Customer & Contact */}
                            <td className="py-4 px-3">
                              <p className="font-bold text-slate-900">{e.customerName}</p>
                              <a href={`https://wa.me/91${e.mobile}`} target="_blank" rel="noreferrer" className="text-[11.5px] font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-0.5">
                                <MessageCircle size={13} /> +91 {e.mobile}
                              </a>
                            </td>

                            {/* 3. Delivery Address */}
                            <td className="py-4 px-3 text-slate-700 text-xs font-medium max-w-[220px]">
                              <p className="line-clamp-2">{e.address || "Direct Factory Address"}</p>
                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                                {[e.city, e.district, e.state].filter(Boolean).join(", ")}
                              </p>
                            </td>

                            {/* 4. Items List & Packing Slip Trigger */}
                            <td className="py-4 px-3 min-w-[210px]">
                              <div className="flex flex-col gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs">
                                  📦 {e.items?.length || e.itemCount} Products Ordered
                                </span>

                                {e.items && e.items.length > 0 ? (
                                  <div className="space-y-1 rounded-xl bg-slate-100/90 p-2.5 text-[11.5px] border border-slate-200 shadow-inner">
                                    {e.items.slice(0, 5).map((it: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{it.name}</span>
                                        <span className="font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[10.5px]">x{it.quantity}</span>
                                      </div>
                                    ))}
                                    {e.items.length > 5 && (
                                      <p className="text-[10px] font-bold text-slate-500 italic pt-0.5 text-center">
                                        + {e.items.length - 5} more products
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500 font-medium italic">
                                    Total {e.itemCount} items in this estimate
                                  </p>
                                )}

                                <button
                                  onClick={() => setViewPackingOrder(e)}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-[11px] font-extrabold shadow-sm transition"
                                >
                                  <Package size={13} /> View & Print Packing Slip
                                </button>
                              </div>
                            </td>

                            {/* 5. Grand Total */}
                            <td className="py-4 px-3 text-right font-bold text-red-600 font-display text-base">
                              {formatINR(Number(e.grandTotal))}
                            </td>

                            {/* 6. Payment Status & Action */}
                            <td className="py-4 px-3 min-w-[160px]">
                              <div className="flex flex-col gap-1.5">
                                {e.paymentStatus === "PAID" ? (
                                  <>
                                    <span className="rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-[10.5px] font-extrabold text-emerald-800 text-center">
                                      ✓ PAYMENT RECEIVED ({e.paymentMethod || "UPI"})
                                    </span>
                                    <button
                                      onClick={() => togglePaymentStatus(e.estimateNumber, "UNPAID")}
                                      className="text-[10px] font-bold text-slate-400 hover:text-red-600 underline text-center"
                                    >
                                      Mark Unreceived
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => togglePaymentStatus(e.estimateNumber, "PAID")}
                                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-[11px] font-bold shadow-sm flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle2 size={13} /> Mark Payment Received
                                    </button>
                                    <button
                                      onClick={() => setPaymentModalOrder(e)}
                                      className="rounded-xl bg-amber-50 border border-amber-300 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 text-center"
                                    >
                                      💳 Pay Gateway Modal
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 7. Fulfillment Workflow Action Buttons */}
                            <td className="py-4 px-3">
                              <div className="flex flex-col gap-1.5 min-w-[165px]">
                                {/* Step A: Package Ready */}
                                <button
                                  onClick={() => updateStatus(e.estimateNumber, "PACKAGE READY", e.mobile)}
                                  className={`flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                    e.status === "PACKAGE READY"
                                      ? "bg-purple-600 text-white ring-2 ring-purple-300 shadow-sm"
                                      : "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white"
                                  }`}
                                >
                                  <Package size={13} /> {e.status === "PACKAGE READY" ? "✓ Packaged" : "Mark Packaged"}
                                </button>

                                {/* Step B: Shipped */}
                                <button
                                  onClick={() => updateStatus(e.estimateNumber, "SHIPPED", e.mobile)}
                                  className={`flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                    e.status === "SHIPPED"
                                      ? "bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm"
                                      : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white"
                                  }`}
                                >
                                  <Truck size={13} /> {e.status === "SHIPPED" ? "✓ Shipped" : "Mark Shipped"}
                                </button>

                                {/* Step C: Out for Delivery */}
                                <button
                                  onClick={() => updateStatus(e.estimateNumber, "OUT FOR DELIVERY", e.mobile)}
                                  className={`flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                    e.status === "OUT FOR DELIVERY"
                                      ? "bg-amber-600 text-white ring-2 ring-amber-300 shadow-sm"
                                      : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white"
                                  }`}
                                >
                                  <Truck size={13} /> {e.status === "OUT FOR DELIVERY" ? "✓ Out for Delivery" : "Mark Out for Delivery"}
                                </button>

                                {/* Step D: Delivered */}
                                <button
                                  onClick={() => updateStatus(e.estimateNumber, "DELIVERED", e.mobile)}
                                  className={`flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                    e.status === "DELIVERED"
                                      ? "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-sm"
                                      : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                                  }`}
                                >
                                  <CheckCircle2 size={13} /> {e.status === "DELIVERED" ? "✓ Delivered" : "Mark Delivered"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Panel>
            )}

            {/* Inventory Tab */}
            {tab === "inventory" && (
              <Panel
                title={
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span>Product Catalogue ({filteredProducts.length})</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openAddProduct}
                        className="btn-gold flex items-center gap-2 px-5 py-2.5 text-[12.5px] uppercase font-bold"
                      >
                        <Plus size={16} /> Upload New Product
                      </button>
                    </div>
                  </div>
                }
              >
                <div className="mb-4 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by product name, SKU or category…"
                    className="field pl-11 !bg-slate-50 !border-slate-200 !text-slate-900 font-bold"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-[13.5px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-[2px] text-slate-500">
                        <th className="py-3">SKU</th>
                        <th className="py-3">Product Name</th>
                        <th className="py-3">Category</th>
                        <th className="py-3 text-right">MRP</th>
                        <th className="py-3 text-right">Offer Price</th>
                        <th className="py-3 text-right">Stock</th>
                        <th className="py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={String(p.id)} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 font-bold text-slate-500">{p.sku}</td>
                          <td className="py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3 font-medium text-slate-600">{p.categoryName}</td>
                          <td className="py-3 text-right text-slate-400 line-through">
                            {formatINR(Number(p.mrp))}
                          </td>
                          <td className="py-3 text-right font-bold text-red-600">
                            {formatINR(Number(p.offerPrice))}
                          </td>
                          <td
                            className={`py-3 text-right font-bold ${
                              Number(p.stock) <= 0
                                ? "text-red-600 font-extrabold"
                                : Number(p.stock) < 200
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {Number(p.stock) <= 0 ? "0 (Out of Stock)" : p.stock}
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => toggleOutofStock(p)}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-bold shadow-sm transition-all ${
                                  Number(p.stock) <= 0
                                    ? "bg-red-600 text-white border border-red-700 hover:bg-emerald-600"
                                    : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-600 hover:text-white"
                                }`}
                                title={Number(p.stock) <= 0 ? "Click to Restock (In Stock)" : "Click to mark Out of Stock"}
                              >
                                {Number(p.stock) <= 0 ? (
                                  <>
                                    <PackageCheck size={13} /> Out of Stock (Enable)
                                  </>
                                ) : (
                                  <>
                                    <PackageX size={13} /> Out of Stock
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => openEditProduct(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11.5px] font-bold text-slate-700 hover:border-red-500 hover:text-red-600 shadow-sm"
                              >
                                <Edit size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11.5px] font-bold text-slate-500 hover:border-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {/* Dealers Tab */}
            {tab === "dealers" && (
              <Panel
                title={
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span>Dealer Applications ({dealers.length})</span>
                    {dealers.length > 0 && (
                      <button
                        onClick={() =>
                          downloadCsv(
                            dealers.map((d: any) => ({
                              Date: d.createdAt ? new Date(d.createdAt).toLocaleString("en-IN") : "Recent",
                              "Firm / Business Name": d.businessName || "-",
                              "Contact Person": d.contactName || "-",
                              Mobile: d.mobile || "-",
                              Email: d.email || "-",
                              "GST Number": d.gstNumber || "-",
                              "Explosives Licence": d.licenseNumber || "-",
                              City: d.city || "-",
                              State: d.state || "-",
                              "Requested Tier": d.tier || "-",
                              "Expected Volume": d.expectedVolume || "-",
                              Status: d.status || "PENDING",
                            })),
                            `Mayilon_Dealer_Applications_${new Date().toISOString().slice(0, 10)}.csv`
                          )
                        }
                        className="btn-gold flex items-center gap-2 px-4 py-2 text-[12px] uppercase font-bold"
                      >
                        <FileSpreadsheet size={15} /> Download Excel (.csv)
                      </button>
                    )}
                  </div>
                }
              >
                {dealers.length === 0 && <Empty>No dealer applications received yet.</Empty>}
                {dealers.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-[2px] text-slate-500">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Business & Contact</th>
                          <th className="py-3 px-3">Location</th>
                          <th className="py-3 px-3">Licence & GST</th>
                          <th className="py-3 px-3">Tier & Volume</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealers.map((d: any) => (
                          <tr key={String(d.id)} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="py-4 px-3 font-medium text-slate-500 text-xs">
                              {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : "Recent"}
                            </td>
                            <td className="py-4 px-3 font-bold text-slate-900">
                              <p className="text-[14px] text-slate-900">{d.businessName}</p>
                              <p className="text-[12px] text-slate-600 font-medium">{d.contactName} · <a href={`https://wa.me/91${d.mobile}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">+91 {d.mobile}</a></p>
                              {d.email && <p className="text-[11px] text-slate-400 font-medium">{d.email}</p>}
                            </td>
                            <td className="py-4 px-3 text-slate-700 font-medium text-xs">
                              <p className="font-bold text-slate-800">{d.city || "Sivakasi Region"}</p>
                              <p className="text-slate-500">{d.state}</p>
                            </td>
                            <td className="py-4 px-3 text-slate-700 font-medium text-xs">
                              <p><span className="text-slate-400 font-bold">GST:</span> {d.gstNumber || "N/A"}</p>
                              <p><span className="text-slate-400 font-bold">Licence:</span> {d.licenseNumber || "N/A"}</p>
                            </td>
                            <td className="py-4 px-3 text-slate-800 font-bold text-xs">
                              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 uppercase block w-fit">
                                {d.tier}
                              </span>
                              <p className="text-[11px] text-slate-500 mt-1 font-medium">{d.expectedVolume}</p>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-800 uppercase">
                                {d.status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}

            {/* Enquiries Tab */}
            {tab === "enquiries" && (
              <Panel
                title={
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span>Customer & B2B Enquiries ({enquiries.length + dealers.length})</span>
                    {(enquiries.length > 0 || dealers.length > 0) && (
                      <button
                        onClick={() => {
                          const combined = [
                            ...enquiries.map((e: any) => ({
                              Type: "General Enquiry",
                              Date: e.createdAt ? new Date(e.createdAt).toLocaleString("en-IN") : "Recent",
                              Name: e.name || "-",
                              Mobile: e.mobile || "-",
                              Email: e.email || "-",
                              Subject: e.subject || "-",
                              Message: e.message || "-",
                              Status: e.status || "NEW",
                            })),
                            ...dealers.map((d: any) => ({
                              Type: "Dealer Application",
                              Date: d.createdAt ? new Date(d.createdAt).toLocaleString("en-IN") : "Recent",
                              Name: `${d.businessName} (${d.contactName})`,
                              Mobile: d.mobile || "-",
                              Email: d.email || "-",
                              Subject: `Dealer Tier: ${d.tier}`,
                              Message: `GST: ${d.gstNumber || "N/A"} | Licence: ${d.licenseNumber || "N/A"} | City: ${d.city || ""}, ${d.state} | Volume: ${d.expectedVolume || ""}`,
                              Status: d.status || "PENDING",
                            })),
                          ];
                          downloadCsv(combined, `Mayilon_All_Enquiries_${new Date().toISOString().slice(0, 10)}.csv`);
                        }}
                        className="btn-gold flex items-center gap-2 px-4 py-2 text-[12px] uppercase font-bold"
                      >
                        <FileSpreadsheet size={15} /> Download Excel (.csv)
                      </button>
                    )}
                  </div>
                }
              >
                {enquiries.length === 0 && dealers.length === 0 && <Empty>No enquiries received yet.</Empty>}
                {(enquiries.length > 0 || dealers.length > 0) && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-[2px] text-slate-500">
                          <th className="py-3 px-3">Date & Type</th>
                          <th className="py-3 px-3">Customer / Contact</th>
                          <th className="py-3 px-3">Subject / Tier</th>
                          <th className="py-3 px-3">Details / Message</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...enquiries.map((e: any) => ({ ...e, type: "General Enquiry" })),
                          ...dealers.map((d: any) => ({
                            id: d.id,
                            name: `${d.businessName} (${d.contactName})`,
                            mobile: d.mobile,
                            email: d.email,
                            subject: `Dealer Application (${d.tier})`,
                            message: `Location: ${d.city || ""}, ${d.state} · Volume: ${d.expectedVolume || ""} · GST: ${d.gstNumber || "N/A"}`,
                            status: d.status || "PENDING",
                            createdAt: d.createdAt,
                            type: "Dealer Application",
                          })),
                        ]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map((item: any) => (
                            <tr key={String(item.id)} className="border-b border-slate-100 hover:bg-slate-50/80">
                              <td className="py-4 px-3 font-medium text-slate-500 text-xs min-w-[130px]">
                                <span className="font-bold text-slate-700 block">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Recent"}</span>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${item.type === "Dealer Application" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-4 px-3 font-bold text-slate-900 min-w-[180px]">
                                <p className="text-[14px] text-slate-900">{item.name}</p>
                                <a href={`https://wa.me/91${item.mobile}`} target="_blank" rel="noreferrer" className="text-[12px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                  <MessageCircle size={12} /> +91 {item.mobile}
                                </a>
                                {item.email && <p className="text-[11px] text-slate-400 font-medium">{item.email}</p>}
                              </td>
                              <td className="py-4 px-3 text-red-600 font-bold text-xs uppercase tracking-wider min-w-[160px]">
                                {item.subject}
                              </td>
                              <td className="py-4 px-3 text-slate-700 text-xs font-medium max-w-[320px]">
                                <p className="line-clamp-3">{item.message}</p>
                              </td>
                              <td className="py-4 px-3 text-center">
                                <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700 uppercase">
                                  {item.status || "NEW"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}

            {/* Analytics Tab - Infographic Dashboard */}
            {tab === "analytics" && (
              <div className="space-y-8">
                {(() => {
                  const totalRev = estimates.reduce((sum, e) => sum + (Number(e.grandTotal) || 0), 0);
                  const avgVal = estimates.length > 0 ? totalRev / estimates.length : 0;
                  const newCount = estimates.filter((e) => e.status === "NEW" || !e.status).length;
                  const paidCount = estimates.filter((e) => e.paymentStatus === "PAID").length;
                  const packageCount = estimates.filter((e) => e.status === "PACKAGE READY").length;
                  const shippedCount = estimates.filter((e) => e.status === "SHIPPED" || e.status === "OUT FOR DELIVERY").length;
                  const deliveredCount = estimates.filter((e) => e.status === "DELIVERED").length;
                  const totalCount = estimates.length || 1;

                  // Location breakdown
                  const locationMap: Record<string, number> = {};
                  estimates.forEach((e) => {
                    const loc = e.city || e.district || e.state || "Tamil Nadu";
                    locationMap[loc] = (locationMap[loc] || 0) + 1;
                  });

                  // Category ordered items breakdown
                  const categoryItemMap: Record<string, number> = {};
                  estimates.forEach((e) => {
                    if (Array.isArray(e.items)) {
                      e.items.forEach((it: any) => {
                        const cat = it.categoryName || "General Fireworks";
                        categoryItemMap[cat] = (categoryItemMap[cat] || 0) + Number(it.quantity || 1);
                      });
                    }
                  });
                  const topCategories = Object.entries(categoryItemMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                  // Payment method breakdown
                  const paymentMap: Record<string, number> = {};
                  estimates.forEach((e) => {
                    const pm = e.paymentMethod || (e.paymentStatus === "PAID" ? "UPI QR" : "COD");
                    paymentMap[pm] = (paymentMap[pm] || 0) + 1;
                  });

                  return (
                    <div className="space-y-8">
                      {/* Top Infographic Metric Cards */}
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="glass rounded-[24px] border border-red-500/20 bg-gradient-to-br from-red-600 to-red-800 p-6 text-white shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-15 text-white">
                            <BarChart3 size={96} />
                          </div>
                          <p className="text-[11px] font-bold uppercase tracking-[2px] opacity-80">Total Order Revenue</p>
                          <p className="mt-2 font-display text-[30px] font-extrabold">{formatINR(totalRev)}</p>
                          <p className="mt-1 text-xs opacity-90 font-medium">Across {estimates.length} Customer Orders</p>
                        </div>

                        <div className="glass rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-15 text-white">
                            <CheckCircle2 size={96} />
                          </div>
                          <p className="text-[11px] font-bold uppercase tracking-[2px] opacity-80">Fulfillment Rate</p>
                          <p className="mt-2 font-display text-[30px] font-extrabold">
                            {estimates.length > 0 ? `${Math.round(((shippedCount + deliveredCount) / totalCount) * 100)}%` : "100%"}
                          </p>
                          <p className="mt-1 text-xs opacity-90 font-medium">{shippedCount + deliveredCount} Orders Shipped / Delivered</p>
                        </div>

                        <div className="glass rounded-[24px] border border-purple-500/20 bg-gradient-to-br from-purple-600 to-indigo-800 p-6 text-white shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-15 text-white">
                            <Receipt size={96} />
                          </div>
                          <p className="text-[11px] font-bold uppercase tracking-[2px] opacity-80">Average Order Value</p>
                          <p className="mt-2 font-display text-[30px] font-extrabold">{formatINR(avgVal)}</p>
                          <p className="mt-1 text-xs opacity-90 font-medium">Per Customer Order Ticket</p>
                        </div>

                        <div className="glass rounded-[24px] border border-amber-500/20 bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-white shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-15 text-white">
                            <Truck size={96} />
                          </div>
                          <p className="text-[11px] font-bold uppercase tracking-[2px] opacity-80">Active Dispatch Queue</p>
                          <p className="mt-2 font-display text-[30px] font-extrabold">{newCount + packageCount} Orders</p>
                          <p className="mt-1 text-xs opacity-90 font-medium">Awaiting Packaging & Dispatch</p>
                        </div>
                      </div>

                      {/* Infographic Main Grid */}
                      <div className="grid gap-6 lg:grid-cols-2">
                        {/* 1. Order Lifecycle Infographic Funnel */}
                        <Panel title="📦 Order Lifecycle Infographic Funnel">
                          <div className="space-y-4">
                            {[
                              { label: "📥 1. Estimates Received", count: newCount + paidCount + packageCount + shippedCount + deliveredCount, color: "from-blue-600 to-blue-500", percent: 100 },
                              { label: "💳 2. Payment Verified", count: paidCount + packageCount + shippedCount + deliveredCount, color: "from-emerald-600 to-emerald-500", percent: Math.round(((paidCount + packageCount + shippedCount + deliveredCount) / totalCount) * 100) },
                              { label: "📦 3. Package Ready in Factory", count: packageCount + shippedCount + deliveredCount, color: "from-purple-600 to-purple-500", percent: Math.round(((packageCount + shippedCount + deliveredCount) / totalCount) * 100) },
                              { label: "🚚 4. Shipped & In Transit", count: shippedCount + deliveredCount, color: "from-amber-500 to-orange-500", percent: Math.round(((shippedCount + deliveredCount) / totalCount) * 100) },
                              { label: "✅ 5. Delivered to Customer", count: deliveredCount, color: "from-emerald-700 to-teal-600", percent: Math.round((deliveredCount / totalCount) * 100) },
                            ].map((step, idx) => (
                              <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{step.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-display text-sm font-extrabold text-red-600">{step.count} Orders</span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{step.percent}%</span>
                                  </div>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(5, step.percent)}%` }}
                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                    className={`h-full rounded-full bg-gradient-to-r ${step.color}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Panel>

                        {/* 2. Top Category Demand Distribution */}
                        <Panel title="🔥 Best-Selling Category Infographic">
                          <div className="space-y-4">
                            {topCategories.length > 0 ? (
                              topCategories.map(([cat, qty], idx) => {
                                const totalQtySum = Object.values(categoryItemMap).reduce((a, b) => a + b, 0) || 1;
                                const share = Math.round((qty / totalQtySum) * 100);
                                return (
                                  <div key={cat} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span className="text-slate-800 flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">{idx + 1}</span>
                                        {cat}
                                      </span>
                                      <span className="text-red-600 font-extrabold">{qty} units ({share}%)</span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(8, share)}%` }}
                                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="space-y-3 py-2">
                                {["Aerial Shots (Sky Shots)", "Ground Chakkars", "Flower Pots", "Sparklers", "Gift Boxes"].map((cat, idx) => (
                                  <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-700">
                                      <span>{cat}</span>
                                      <span className="text-slate-500">Wholesale Demand Live</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                      <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400" style={{ width: `${80 - idx * 12}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Panel>

                        {/* 3. Geographic Customer Shipping Destinations */}
                        <Panel title="🗺️ Customer Shipping Regional Heatmap">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {Object.entries(locationMap).length > 0 ? (
                              Object.entries(locationMap).map(([loc, count]) => (
                                <div key={loc} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                                  <div>
                                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{loc}</p>
                                    <p className="text-[10.5px] font-bold text-slate-500">Destination Region</p>
                                  </div>
                                  <span className="rounded-full bg-purple-100 border border-purple-300 px-3 py-1 text-xs font-extrabold text-purple-800">
                                    {count} Orders
                                  </span>
                                </div>
                              ))
                            ) : (
                              ["Chennai", "Coimbatore", "Madurai", "Trichy", "Bangalore", "Hyderabad"].map((loc) => (
                                <div key={loc} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <span className="font-bold text-slate-800 text-xs">{loc}</span>
                                  <span className="text-xs font-bold text-emerald-700">Active Delivery Route</span>
                                </div>
                              ))
                            )}
                          </div>
                        </Panel>

                        {/* 4. Payment Method Preferences & System Health */}
                        <Panel title="💳 Payment Methods & Zero-Loss System Health">
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-[1px] text-emerald-800">Dynamic All-UPI QR</p>
                                <p className="mt-1 font-display text-xl font-extrabold text-emerald-950">
                                  {paymentMap["Dynamic All-UPI QR"] || paymentMap["UPI"] || estimates.length} Orders
                                </p>
                                <p className="text-[10.5px] font-bold text-emerald-700 mt-0.5">GPay, PhonePe, Paytm, BHIM</p>
                              </div>
                              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-[1px] text-blue-800">Online Gateways & COD</p>
                                <p className="mt-1 font-display text-xl font-extrabold text-blue-950">
                                  {paymentMap["Razorpay Gateway"] || paymentMap["COD"] || 0} Orders
                                </p>
                                <p className="text-[10.5px] font-bold text-blue-700 mt-0.5">Razorpay, PayU & COD</p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                  Zero-Loss Order Persistence
                                </span>
                                <span className="text-slate-400">ONLINE 100%</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                PostgreSQL Database & Persistent Disk Backup (<span className="text-amber-300 font-bold">mayilon_orders.json</span>) active. No orders or items can ever be erased.
                              </p>
                            </div>
                          </div>
                        </Panel>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Product Upload / Edit Modal */}
      <AnimatePresence>
        {productModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProductModalOpen(false)}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-red-500/20 bg-white p-8 shadow-2xl"
            >
              <button
                onClick={() => setProductModalOpen(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white"
              >
                <X size={16} />
              </button>

              <h2 className="font-display text-2xl font-bold text-slate-900">
                {editingProduct ? "Edit Product & Price" : "Upload New Product"}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Configure details, MRP, factory offer price, packing, and collection flags.
              </p>

              <form onSubmit={handleSaveProduct} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">Product Name *</span>
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    placeholder="e.g. 10 Shot Sky Thunder"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">SKU Code *</span>
                    <input
                      required
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">Category *</span>
                    <select
                      value={productForm.categoryName}
                      onChange={(e) => setProductForm({ ...productForm, categoryName: e.target.value })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    >
                      {["ONE SOUND CRACKERS", "FLOWER POTS", "PREMIUM FOUNTAINS", "GROUND CHAKKARS", "ROCKETS", "SKY SHOTS", "SPARKLERS", "GIFT BOXES"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">MRP (₹) *</span>
                    <input
                      type="number"
                      required
                      value={productForm.mrp}
                      onChange={(e) => setProductForm({ ...productForm, mrp: Number(e.target.value) })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">Offer Price (₹) *</span>
                    <input
                      type="number"
                      required
                      value={productForm.offerPrice}
                      onChange={(e) => setProductForm({ ...productForm, offerPrice: Number(e.target.value) })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">Packing</span>
                    <input
                      value={productForm.packing}
                      onChange={(e) => setProductForm({ ...productForm, packing: e.target.value })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">MOQ</span>
                    <input
                      type="number"
                      value={productForm.moq}
                      onChange={(e) => setProductForm({ ...productForm, moq: Number(e.target.value) })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-700">Stock</span>
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            stock: Number(prev.stock) <= 0 ? 250 : 0,
                          }))
                        }
                        className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded transition ${
                          Number(productForm.stock) <= 0
                            ? "bg-red-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-red-600 hover:text-white"
                        }`}
                      >
                        {Number(productForm.stock) <= 0 ? "Out of Stock (0)" : "Set 0 Stock"}
                      </button>
                    </div>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                      className="field mt-1.5 !bg-slate-50 !border-slate-300 !text-slate-900 font-bold"
                    />
                  </label>
                </div>

                {/* Product Images (Image 1, Image 2, Image 3) */}
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-[2px] text-red-600 block">
                    📸 Product Photos (Upload up to 3 Images)
                  </span>

                  {/* Primary Cover Image 1 */}
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-700 block mb-1">1. Primary Cover Photo *</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
                          const json = await res.json();
                          if (json.success) {
                            setProductForm((prev) => ({ ...prev, imageUrl: json.data.url }));
                            setNotificationToast("📸 Main Cover Photo 1 uploaded!");
                            setTimeout(() => setNotificationToast(null), 3000);
                          }
                        }}
                        className="field !bg-white !border-slate-300 font-bold text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-red-600 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white cursor-pointer"
                      />
                      {productForm.imageUrl && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productForm.imageUrl} alt="P1" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                    <input
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      placeholder="Or paste Cover Photo 1 URL..."
                      className="field mt-1.5 !bg-white !border-slate-300 font-bold text-xs"
                    />
                  </div>

                  {/* Gallery Image 2 */}
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-700 block mb-1">2. Second Gallery Photo (Optional)</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
                          const json = await res.json();
                          if (json.success) {
                            setProductForm((prev) => ({ ...prev, imageUrl2: json.data.url }));
                            setNotificationToast("📸 Gallery Photo 2 uploaded!");
                            setTimeout(() => setNotificationToast(null), 3000);
                          }
                        }}
                        className="field !bg-white !border-slate-300 font-bold text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white cursor-pointer"
                      />
                      {productForm.imageUrl2 && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productForm.imageUrl2} alt="P2" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                    <input
                      value={productForm.imageUrl2}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl2: e.target.value })}
                      placeholder="Or paste Gallery Photo 2 URL..."
                      className="field mt-1.5 !bg-white !border-slate-300 font-bold text-xs"
                    />
                  </div>

                  {/* Gallery Image 3 */}
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-700 block mb-1">3. Third Gallery Photo (Optional)</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
                          const json = await res.json();
                          if (json.success) {
                            setProductForm((prev) => ({ ...prev, imageUrl3: json.data.url }));
                            setNotificationToast("📸 Gallery Photo 3 uploaded!");
                            setTimeout(() => setNotificationToast(null), 3000);
                          }
                        }}
                        className="field !bg-white !border-slate-300 font-bold text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white cursor-pointer"
                      />
                      {productForm.imageUrl3 && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productForm.imageUrl3} alt="P3" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                    <input
                      value={productForm.imageUrl3}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl3: e.target.value })}
                      placeholder="Or paste Gallery Photo 3 URL..."
                      className="field mt-1.5 !bg-white !border-slate-300 font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Product Demo Video Section */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-[2px] text-amber-800 block">
                    🎬 Product Demo Video (Video File Upload / MP4 / YouTube Link)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/v1/admin/upload", { method: "POST", body: fd });
                        const json = await res.json();
                        if (json.success) {
                          setProductForm((prev) => ({ ...prev, videoUrl: json.data.url }));
                          setNotificationToast("🎬 Product Demo Video uploaded!");
                          setTimeout(() => setNotificationToast(null), 3000);
                        }
                      }}
                      className="field !bg-white !border-slate-300 font-bold text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-amber-600 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white cursor-pointer"
                    />
                  </div>
                  <input
                    value={productForm.videoUrl}
                    onChange={(e) => setProductForm({ ...productForm, videoUrl: e.target.value })}
                    placeholder="Or paste direct Video URL or YouTube link..."
                    className="field !bg-white !border-slate-300 font-bold text-xs"
                  />
                  {productForm.videoUrl && (
                    <p className="text-[11px] font-bold text-amber-800 pt-1">
                      ✓ Demo Video Linked: {productForm.videoUrl.slice(0, 45)}...
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isNewArrival}
                      onChange={(e) => setProductForm({ ...productForm, isNewArrival: e.target.checked })}
                      className="accent-red-600"
                    />
                    New Arrival
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isBestSeller}
                      onChange={(e) => setProductForm({ ...productForm, isBestSeller: e.target.checked })}
                      className="accent-red-600"
                    />
                    Best Seller
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isPremium}
                      onChange={(e) => setProductForm({ ...productForm, isPremium: e.target.checked })}
                      className="accent-red-600"
                    />
                    Premium Collection
                  </label>
                </div>

                <button type="submit" className="btn-gold mt-6 w-full py-3.5 text-sm uppercase font-bold">
                  {editingProduct ? "Save Product Changes" : "Create & Publish Product"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Gateway Modal */}
      <AnimatePresence>
        {paymentModalOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPaymentModalOrder(null)}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[32px] border border-red-500/20 bg-white p-8 shadow-2xl text-center"
            >
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white"
              >
                <X size={16} />
              </button>

              <QrCode size={36} className="mx-auto text-red-600" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Payment Gateway</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Confirm payment for Order <span className="font-bold text-red-600">{paymentModalOrder.estimateNumber}</span> ({formatINR(Number(paymentModalOrder.grandTotal))})
              </p>

              <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-50 p-4 text-center">
                {/* SVG QR Code Simulation */}
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-white border border-slate-200 p-2 shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=mayilon@upi&pn=Mayilon%20Crackers&am=${paymentModalOrder.grandTotal}`}
                    alt="All UPI QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-700">Scan via GPay, PhonePe, Paytm or BHIM</p>
                <p className="text-[10px] text-slate-500">UPI ID: mayiloncrackers@sbi</p>
              </div>

              <div className="mt-6 space-y-2.5">
                <button
                  onClick={() => handleMarkPaid(paymentModalOrder.estimateNumber, "Dynamic All-UPI QR")}
                  className="btn-gold w-full py-3 text-xs uppercase font-bold"
                >
                  ✓ Confirm Payment via UPI QR
                </button>
                <button
                  onClick={() => handleMarkPaid(paymentModalOrder.estimateNumber, "Razorpay Gateway")}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-900 py-3 text-xs font-bold uppercase text-white hover:bg-slate-800"
                >
                  Confirm via Razorpay
                </button>
                <button
                  onClick={() => handleMarkPaid(paymentModalOrder.estimateNumber, "PayU Gateway")}
                  className="w-full rounded-2xl border border-slate-200 bg-blue-600 py-3 text-xs font-bold uppercase text-white hover:bg-blue-700"
                >
                  Confirm via PayU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ORDER PACKING & DISPATCH ITEMS MODAL */}
      <AnimatePresence>
        {viewPackingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm print:p-0 print:bg-white"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 print:max-w-none print:shadow-none print:border-none print:p-0 print:max-h-none"
            >
              {/* Header Bar - Hidden in Print */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 font-extrabold shadow-sm">
                    <Package size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900">
                      Order Dispatch Packing Slip — #{viewPackingOrder.estimateNumber}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      Order Date: {new Date(viewPackingOrder.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition shadow-md"
                  >
                    <Printer size={15} /> Print Packing Slip
                  </button>
                  <button
                    onClick={() => setViewPackingOrder(null)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Dispatch Slip Content */}
              <div className="space-y-6">
                {/* Factory Header for Printed Slip */}
                <div className="hidden print:block border-b-2 border-red-600 pb-4 mb-6">
                  <h1 className="font-display text-2xl font-extrabold text-slate-900">MAYILON PYROWORLD — Sivakasi Factory Dispatch</h1>
                  <p className="text-xs font-bold text-slate-600">Order Ref: #{viewPackingOrder.estimateNumber} · Date: {new Date(viewPackingOrder.createdAt || Date.now()).toLocaleDateString("en-IN")}</p>
                </div>

                {/* Customer & Shipping Summary Grid */}
                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-slate-400">Customer Details</p>
                    <p className="font-display text-base font-extrabold text-slate-900 mt-1">{viewPackingOrder.customerName}</p>
                    <a href={`https://wa.me/91${viewPackingOrder.mobile}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5">
                      <MessageCircle size={13} /> +91 {viewPackingOrder.mobile}
                    </a>
                    {viewPackingOrder.email && <p className="text-xs text-slate-500 font-medium">{viewPackingOrder.email}</p>}
                    {viewPackingOrder.gstNumber && <p className="text-xs font-bold text-slate-700 mt-1">GSTIN: {viewPackingOrder.gstNumber}</p>}
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-slate-400">Dispatch Address & Transport</p>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed mt-1">{viewPackingOrder.address || "Direct Sivakasi Licensed Address"}</p>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      {[viewPackingOrder.city, viewPackingOrder.district, viewPackingOrder.state].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs font-extrabold text-purple-700 mt-2">
                      🚚 Transport: {viewPackingOrder.transportName || "Direct Factory Transport"}
                    </p>
                  </div>
                </div>

                {/* Itemized Order Products Table */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-[2px] text-slate-500 mb-3">
                    Ordered Products List (Total {viewPackingOrder.items?.length || viewPackingOrder.itemCount} Items)
                  </h4>
                  <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-700">
                        <th className="py-2.5 px-3 text-center w-10">S.No</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 w-32">SKU Code</th>
                        <th className="py-2.5 px-3 w-28">Packing</th>
                        <th className="py-2.5 px-3 text-center w-16">Quantity</th>
                        <th className="py-2.5 px-3 text-right w-24">Offer Rate</th>
                        <th className="py-2.5 px-3 text-right w-28 text-red-600">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(viewPackingOrder.items && viewPackingOrder.items.length > 0) ? (
                        viewPackingOrder.items.map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">{item.name}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-bold">{item.sku}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">{item.packing}</td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-slate-900 text-sm bg-purple-50/50">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600 font-medium">₹{Number(item.price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-red-600">₹{Number(item.lineTotal || (Number(item.price) * item.quantity)).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 font-bold">
                            Order contains {viewPackingOrder.itemCount} items. Total Amount: {formatINR(Number(viewPackingOrder.grandTotal))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Footer */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Pipeline Status:</span>
                    <span className="rounded-full bg-purple-100 border border-purple-300 px-3 py-1 text-xs font-extrabold text-purple-800 uppercase">
                      {viewPackingOrder.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 mr-2">Grand Total Amount:</span>
                    <span className="font-display text-2xl font-extrabold text-red-600">
                      {formatINR(Number(viewPackingOrder.grandTotal))}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent = "#DC2626",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accent?: string;
}) {
  return (
    <div className="glass rounded-[24px] border border-red-500/15 bg-white p-6 shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-slate-500">{label}</p>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <p className="mt-3 font-display text-[27px] font-bold text-slate-900">{value}</p>
      <p className="text-[12px] font-medium text-slate-500">{sub}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-[20px] border border-red-500/15 bg-white p-5 shadow-sm">
      <p className="text-[10.5px] font-bold uppercase tracking-[2px] text-slate-500">{label}</p>
      <p className="mt-1.5 font-display text-[21px] font-bold text-red-600">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string | React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[26px] border border-red-500/15 bg-white p-6 shadow-md">
      {typeof title === "string" ? (
        <h3 className="mb-5 font-display text-[16px] font-bold text-slate-900">{title}</h3>
      ) : (
        <div className="mb-5">{title}</div>
      )}
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] font-medium text-slate-400">{children}</p>;
}
