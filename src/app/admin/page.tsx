"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  PackageCheck,
  PackageX,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";
import { formatINR } from "@/lib/estimate";

type OrderItem = {
  id: string;
  sku: string;
  name: string;
  categoryName?: string;
  packing?: string;
  mrp: string | number;
  price: string | number;
  quantity: number;
  lineTotal: string | number;
};

type Order = {
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
  gstNumber?: string;
  transportName?: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  itemCount: number;
  mrpTotal: string | number;
  subtotal: string | number;
  grandTotal: string | number;
  createdAt: string;
  items: OrderItem[];
};

type Product = {
  id: string;
  sku: string;
  name: string;
  nameTa?: string;
  categoryName: string;
  packing: string;
  mrp: number;
  offerPrice: number;
  stock: number;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  videoUrl?: string;
  status: string;
};

type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: any;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "payments" | "customers" | "analytics" | "audit">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [kpis, setKpis] = useState({
    pipeline: 0,
    estimateCount: 0,
    paidOrdersCount: 0,
    paidOrdersRevenue: 0,
    todayCount: 0,
    todayValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);
  
  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNewProduct, setIsAddingNewProduct] = useState(false);
  const [editingSku, setEditingSku] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingNameTa, setEditingNameTa] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingPacking, setEditingPacking] = useState("");
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [editingImageUrl2, setEditingImageUrl2] = useState("");
  const [editingImageUrl3, setEditingImageUrl3] = useState("");
  const [editingVideoUrl, setEditingVideoUrl] = useState("");
  const [editingPrice, setEditingPrice] = useState("");
  const [editingMrp, setEditingMrp] = useState("");
  const [editingStock, setEditingStock] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function uploadFile(file: File, setUrl: (url: string) => void, fieldName: string) {
    setUploadingField(fieldName);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setUrl(json.data.url);
        setNotificationToast(`Uploaded file for ${fieldName} successfully!`);
      } else {
        alert(json.error || "File upload failed");
      }
    } catch (err: any) {
      alert("File upload failed: " + (err.message || err));
    } finally {
      setUploadingField(null);
      setTimeout(() => setNotificationToast(null), 3000);
    }
  }

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Orders
      const estRes = await fetch("/api/v1/estimates");
      const estJson = await estRes.json();
      if (estJson.success && Array.isArray(estJson.data?.items)) {
        setOrders(estJson.data.items);
      }

      // 2. Fetch KPIs
      const statsRes = await fetch("/api/v1/admin/stats");
      const statsJson = await statsRes.json();
      if (statsJson.success && statsJson.data?.kpis) {
        setKpis(statsJson.data.kpis);
      }

      // 3. Fetch Products Catalog
      const prodRes = await fetch("/api/v1/products");
      const prodJson = await prodRes.json();
      const rawProds = Array.isArray(prodJson.data?.items)
        ? prodJson.data.items
        : Array.isArray(prodJson.data)
        ? prodJson.data
        : [];

      if (rawProds.length > 0) {
        setProducts(
          rawProds.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            nameTa: p.nameTa || "",
            categoryName: p.categoryName || "Fireworks",
            packing: p.packing || "1 Box",
            mrp: parseFloat(String(p.mrp || p.offerPrice || 0)) || 0,
            offerPrice: parseFloat(String(p.offerPrice || p.mrp || 0)) || 0,
            stock: parseInt(String(p.stock || 500)),
            imageUrl: p.imageUrl || "",
            imageUrl2: p.imageUrl2 || "",
            imageUrl3: p.imageUrl3 || "",
            videoUrl: p.videoUrl || "",
            status: p.status || "ACTIVE",
          })),
        );
      }

      // 4. Fetch Audit Logs if in Audit Tab
      const auditRes = await fetch("/api/v1/admin/audit-logs");
      const auditJson = await auditRes.json();
      if (auditJson.success && Array.isArray(auditJson.data?.logs)) {
        setAuditLogs(auditJson.data.logs);
      }
    } catch (err) {
      console.warn("[AdminDashboard] Error loading live data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/v1/admin/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  async function updateOrderStatus(estimateNumber: string, status: string, paymentStatus?: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.estimateNumber === estimateNumber
          ? {
              ...o,
              status,
              paymentStatus: paymentStatus || o.paymentStatus,
            }
          : o,
      ),
    );

    const body: Record<string, any> = { status };
    if (paymentStatus) body.paymentStatus = paymentStatus;

    await fetch(`/api/v1/estimates/${estimateNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const msg = `Updated Order ${estimateNumber} to status [${status}]`;
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 4000);
    void loadData();
  }

  function openEditModal(p: Product) {
    setEditingProduct(p);
    setIsAddingNewProduct(false);
    setEditingSku(p.sku);
    setEditingName(p.name);
    setEditingNameTa(p.nameTa || "");
    setEditingCategoryName(p.categoryName || "Fireworks");
    setEditingPacking(p.packing || "1 Box");
    setEditingImageUrl(p.imageUrl || "");
    setEditingImageUrl2(p.imageUrl2 || "");
    setEditingImageUrl3(p.imageUrl3 || "");
    setEditingVideoUrl(p.videoUrl || "");
    setEditingMrp(String(p.mrp));
    setEditingPrice(String(p.offerPrice));
    setEditingStock(String(p.stock));
  }

  function openAddModal() {
    const newSku = `MYL-NEW-${Math.floor(100 + Math.random() * 900)}`;
    setEditingProduct({
      id: `prod-${Date.now()}`,
      sku: newSku,
      name: "",
      categoryName: "Special Fireworks",
      packing: "1 Box",
      mrp: 500,
      offerPrice: 100,
      stock: 500,
      status: "ACTIVE",
    });
    setIsAddingNewProduct(true);
    setEditingSku(newSku);
    setEditingName("");
    setEditingNameTa("");
    setEditingCategoryName("Special Fireworks");
    setEditingPacking("1 Box");
    setEditingImageUrl("");
    setEditingImageUrl2("");
    setEditingImageUrl3("");
    setEditingVideoUrl("");
    setEditingMrp("500");
    setEditingPrice("100");
    setEditingStock("500");
  }

  async function handleProductSave() {
    if (!editingName.trim()) return;
    const newPrice = parseFloat(editingPrice) || 100;
    const newMrp = parseFloat(editingMrp) || newPrice;
    const newStock = parseInt(editingStock) || 500;

    await fetch("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: editingSku || `MYL-PROD-${Date.now()}`,
        name: editingName,
        nameTa: editingNameTa,
        categoryName: editingCategoryName || "Special Fireworks",
        packing: editingPacking || "1 Box",
        imageUrl: editingImageUrl,
        imageUrl2: editingImageUrl2,
        imageUrl3: editingImageUrl3,
        videoUrl: editingVideoUrl,
        mrp: newMrp,
        offerPrice: newPrice,
        stock: newStock,
      }),
    });

    setEditingProduct(null);
    setIsAddingNewProduct(false);
    setNotificationToast(`Product [${editingName}] saved directly to Supabase DB!`);
    setTimeout(() => setNotificationToast(null), 4000);
    void loadData();
  }

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      o.estimateNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.mobile.includes(q);
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter || o.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <LogoLockup />
          <span className="hidden sm:inline-block h-6 w-px bg-slate-800" />
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> SUPER_ADMIN ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="Refresh Live DB Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/"
            target="_blank"
            className="text-xs font-medium text-slate-300 hover:text-white px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors hidden sm:block"
          >
            View Storefront ↗
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "orders" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Orders & Pipeline ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "products" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Boxes className="w-4 h-4" /> Inventory & Prices ({products.length})
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "payments" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Payments Verification
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "customers" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" /> Customers Directory
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "analytics" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Revenue Analytics
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all w-full text-left whitespace-nowrap ${
              activeTab === "audit" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" /> Security Audit Logs
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Toast Notification */}
          {notificationToast && (
            <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl shadow-xl font-bold text-xs flex items-center justify-between animate-bounce">
              <span>{notificationToast}</span>
              <button onClick={() => setNotificationToast(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Dashboard Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pipeline Revenue</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block">{formatINR(kpis.pipeline)}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <span className="text-xl font-extrabold text-white mt-1 block">{kpis.estimateCount} Orders</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paid Revenue</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{formatINR(kpis.paidOrdersRevenue)}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Orders</span>
              <span className="text-xl font-extrabold text-sky-400 mt-1 block">{kpis.todayCount} ({formatINR(kpis.todayValue)})</span>
            </div>
          </div>

          {/* TAB 1: ORDERS & PIPELINE */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* Search & Filter bar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ref, customer, phone..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  {["ALL", "NEW", "PAID", "PAYMENT RECEIVED", "PACKAGE READY", "SHIPPED", "DELIVERED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                        statusFilter === st ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-4">Order Ref</th>
                        <th className="py-4 px-4">Customer Details</th>
                        <th className="py-4 px-4">Address</th>
                        <th className="py-4 px-4">Items</th>
                        <th className="py-4 px-4">Grand Total</th>
                        <th className="py-4 px-4">Payment</th>
                        <th className="py-4 px-4">Workflow Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-500">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o) => (
                          <tr key={o.id || o.estimateNumber} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-4 font-mono font-bold text-amber-400">
                              <div>{o.estimateNumber}</div>
                              <div className="text-[10px] font-normal text-slate-500">{new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-white">{o.customerName}</div>
                              <div className="text-[11px] text-slate-400">+91 {o.mobile}</div>
                            </td>
                            <td className="py-4 px-4 max-w-xs truncate text-[11px] text-slate-400">
                              {o.address}, {o.city}, {o.pincode}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-medium text-slate-200">{o.itemCount} items</div>
                              <button
                                onClick={() => setSelectedOrderForSlip(o)}
                                className="text-[10px] text-amber-400 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                              >
                                <Printer className="w-3 h-3" /> Packing Slip
                              </button>
                            </td>
                            <td className="py-4 px-4 font-bold text-white">{formatINR(parseFloat(String(o.grandTotal)))}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  o.paymentStatus === "PAID" || o.status === "PAYMENT RECEIVED"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {o.paymentStatus || "UNPAID"} ({o.paymentMethod})
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  onClick={() => updateOrderStatus(o.estimateNumber, "PAYMENT RECEIVED", "PAID")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(o.estimateNumber, "PACKAGE READY")}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Packaged
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(o.estimateNumber, "SHIPPED")}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Shipped
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(o.estimateNumber, "DELIVERED")}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Delivered
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY & PRICES */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white">Live Product Catalog & Supabase DB Detail Editor</h2>
                    <p className="text-xs text-slate-400">Edit product names, Tamil names, images, video links, prices, packing & stock directly in Supabase PostgreSQL DB.</p>
                  </div>
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <span>+ Add New Product</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Image</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Product Name & Tamil Name</th>
                        <th className="py-3 px-4">Category & Packing</th>
                        <th className="py-3 px-4">MRP (₹)</th>
                        <th className="py-3 px-4">Offer Price (₹)</th>
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Media</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {products.map((p) => (
                        <tr key={p.sku} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-800 bg-slate-950" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-600">No Img</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-400 font-bold">{p.sku}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{p.name}</div>
                            {p.nameTa && <div className="text-[11px] text-amber-300">{p.nameTa}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-300">{p.categoryName}</div>
                            <div className="text-[10px] text-slate-500">{p.packing}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">₹{p.mrp.toFixed(2)}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400">₹{p.offerPrice.toFixed(2)}</td>
                          <td className="py-3 px-4 font-semibold">{p.stock} boxes</td>
                          <td className="py-3 px-4">
                            {p.videoUrl ? (
                              <a href={p.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-400 underline font-semibold">
                                🎬 Video
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-600">No Video</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Administrative Audit Trail Logs
              </h2>
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">No audit logs recorded yet.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-amber-400">{log.action}</span>
                        <span className="text-slate-400 ml-2">[{log.entity}: {log.entityId || "N/A"}]</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{JSON.stringify(log.meta || {})}</div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Comprehensive Product Edit & Add Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isAddingNewProduct ? "Add New Product to Supabase DB" : `Edit Details for ${editingName || editingProduct.name}`}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Product SKU</label>
                <input
                  type="text"
                  value={editingSku}
                  onChange={(e) => setEditingSku(e.target.value)}
                  placeholder="e.g. MYL-SND-01"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  placeholder="e.g. One Sound / 2 Sound Crackers"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Product Name (English)</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="e.g. 2 3/4&quot; Kuruvi"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Tamil Name (தமிழ் பெயர்)</label>
                <input
                  type="text"
                  value={editingNameTa}
                  onChange={(e) => setEditingNameTa(e.target.value)}
                  placeholder="e.g. 2 3/4&quot; குருவி"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Packing Type</label>
                <input
                  type="text"
                  value={editingPacking}
                  onChange={(e) => setEditingPacking(e.target.value)}
                  placeholder="e.g. 1 Box (5 Pcs)"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Stock Quantity (Boxes)</label>
                <input
                  type="number"
                  value={editingStock}
                  onChange={(e) => setEditingStock(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">MRP Price (₹)</label>
                <input
                  type="number"
                  value={editingMrp}
                  onChange={(e) => setEditingMrp(e.target.value)}
                  placeholder="e.g. 35.00"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Offer Selling Price (₹)</label>
                <input
                  type="number"
                  value={editingPrice}
                  onChange={(e) => setEditingPrice(e.target.value)}
                  placeholder="e.g. 7.00"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500 font-bold text-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Primary Image URL</label>
                  <label className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center gap-1">
                    <span>{uploadingField === "Primary Image" ? "Uploading..." : "📁 Upload Image File"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file, setEditingImageUrl, "Primary Image");
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingImageUrl}
                  onChange={(e) => setEditingImageUrl(e.target.value)}
                  placeholder="https://images.pexels.com/... or data:image/..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500 font-mono"
                />
                {editingImageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editingImageUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-800 bg-slate-950" />
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Image Preview Loaded</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Gallery Image 2 URL</label>
                  <label className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors">
                    <span>{uploadingField === "Image 2" ? "Uploading..." : "📁 Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file, setEditingImageUrl2, "Image 2");
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingImageUrl2}
                  onChange={(e) => setEditingImageUrl2(e.target.value)}
                  placeholder="https://images.pexels.com/..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Gallery Image 3 URL</label>
                  <label className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors">
                    <span>{uploadingField === "Image 3" ? "Uploading..." : "📁 Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file, setEditingImageUrl3, "Image 3");
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingImageUrl3}
                  onChange={(e) => setEditingImageUrl3(e.target.value)}
                  placeholder="https://images.pexels.com/..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Video URL (YouTube link or MP4 File)</label>
                  <label className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center gap-1">
                    <span>{uploadingField === "Video File" ? "Uploading..." : "🎬 Upload Video File"}</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file, setEditingVideoUrl, "Video File");
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingVideoUrl}
                  onChange={(e) => setEditingVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or data:video/mp4..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
              <button onClick={() => setEditingProduct(null)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-xl transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleProductSave} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/20">
                Save Product to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Slip Modal */}
      {selectedOrderForSlip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Packing Slip — Order {selectedOrderForSlip.estimateNumber}</h3>
              <button onClick={() => setSelectedOrderForSlip(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white text-slate-950 p-6 rounded-2xl space-y-4 font-mono text-xs">
              <div className="border-b pb-2 flex justify-between">
                <div>
                  <div className="font-bold">MAYILON PYROWORLD</div>
                  <div>Sivakasi Licensed Dispatch Depot</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{selectedOrderForSlip.estimateNumber}</div>
                  <div>{new Date(selectedOrderForSlip.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <div className="font-bold">CUSTOMER & SHIPPING ADDRESS:</div>
                <div>{selectedOrderForSlip.customerName} (+91 {selectedOrderForSlip.mobile})</div>
                <div>{selectedOrderForSlip.address}, {selectedOrderForSlip.city}, {selectedOrderForSlip.state} - {selectedOrderForSlip.pincode}</div>
              </div>

              <div>
                <div className="font-bold mb-1">PACKING ITEMS LIST:</div>
                {selectedOrderForSlip.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-200 py-1">
                    <span>{it.name} (x{it.quantity})</span>
                    <span>₹{parseFloat(String(it.lineTotal)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-right font-bold text-sm">
                GRAND TOTAL: {formatINR(parseFloat(String(selectedOrderForSlip.grandTotal)))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print Warehouse Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
