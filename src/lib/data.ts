import { IMAGE_POOL, SEED_CATEGORIES, SEED_PRODUCTS, SEED_REVIEWS } from "./seed-data";
import { slugify } from "./slug";
import { getAllCustomProducts, getDeletedProductIds, getProductReorderMap } from "./db";

const CATEGORY_CODE: Record<string, string> = {
  "kids-special": "KDS",
  "single-sound": "SND",
  "bijili-crackers": "BJL",
  "ground-chakkar": "GCK",
  "twinkling-star": "TWN",
  "flower-pots": "FLP",
  candles: "PNC",
  rockets: "RKT",
  bombs: "BMB",
  fountains: "FTN",
  "sky-shots": "SKY",
  "multi-shots": "MLT",
  sparklers: "SPK",
  novelties: "NVL",
  "gift-boxes": "GFT",
};

const EFFECTS = ["Gold", "Red", "Blue", "Green", "Silver", "Purple"];

export type ProductWithCategory = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  nameTa: string | null;
  categoryId: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  gallery: string[];
  videoUrl: string | null;
  packing: string;
  piecesPerPack: number;
  mrp: string;
  discountPercent: number;
  offerPrice: string;
  dealerPrice: string;
  gstPercent: number;
  moq: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isPremium: boolean;
  soundLevel: string;
  burnTime: string;
  effectColors: string[];
  ageRecommendation: string;
  usage: string;
  rating: string;
  reviewCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  categoryName: string;
  categorySlug: string;
  categoryAccent: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  nameTa: string;
  slug: string;
  tagline: string;
  description: string;
  imageUrl: string;
  accent: string;
  icon: string;
  sortOrder: number;
  productCount: number;
};

export type CategorySummary = CategoryRecord;

export async function getCategories(): Promise<CategoryRecord[]> {
  return SEED_CATEGORIES.map((c, i) => ({
    id: `cat-${i + 1}`,
    name: c.name,
    nameTa: c.nameTa,
    slug: c.slug,
    tagline: c.tagline,
    description: c.description,
    imageUrl: c.imageUrl,
    accent: c.accent,
    icon: c.icon,
    sortOrder: i,
    productCount: (SEED_PRODUCTS[c.slug] ?? []).length,
  }));
}

export function getAllProducts(): ProductWithCategory[] {
  const cats = SEED_CATEGORIES.map((c, i) => ({
    id: `cat-${i + 1}`,
    name: c.name,
    slug: c.slug,
    accent: c.accent,
  }));
  const catMap = new Map(cats.map((c) => [c.slug, c]));
  let n = 0;
  const list: ProductWithCategory[] = [];

  for (const [catSlug, rows] of Object.entries(SEED_PRODUCTS)) {
    const cat = catMap.get(catSlug);
    if (!cat) continue;
    rows.forEach((row, idx) => {
      const [name, mrp, packing, pieces, flags = "", customImg, customOffer] = row;
      const discount = 80;
      const offer = customOffer ?? Math.round((mrp * 20) / 100);
      const img = customImg ?? IMAGE_POOL[n % IMAGE_POOL.length];
      list.push({
        id: `prod-${n + 1}`,
        sku: `MYL-${CATEGORY_CODE[catSlug] ?? "GEN"}-${`${idx + 1}`.padStart(2, "0")}`,
        slug: slugify(name),
        name,
        nameTa: null,
        categoryId: cat.id,
        shortDescription: `${name} — factory-direct Sivakasi quality with ${discount}% off MRP.`,
        description: `${name} is manufactured at our Sivakasi unit under PESO licence with high-purity chemical composition and precision-rolled casings. Each ${packing.toLowerCase()} is quality checked for fuse integrity, moisture protection and consistent performance.`,
        imageUrl: img,
        gallery: [
          img,
          IMAGE_POOL[(n + 3) % IMAGE_POOL.length],
          IMAGE_POOL[(n + 6) % IMAGE_POOL.length],
          IMAGE_POOL[(n + 8) % IMAGE_POOL.length],
        ],
        videoUrl: null,
        packing,
        piecesPerPack: pieces,
        mrp: mrp.toFixed(2),
        discountPercent: discount,
        offerPrice: offer.toFixed(2),
        dealerPrice: Math.round(offer * 0.88).toFixed(2),
        gstPercent: 18,
        moq: mrp > 5000 ? 1 : mrp > 1000 ? 2 : 5,
        stock: 120 + ((n * 37) % 900),
        status: "ACTIVE",
        isFeatured: flags.includes("F"),
        isBestSeller: flags.includes("B"),
        isNewArrival: flags.includes("N"),
        isPremium: flags.includes("P"),
        soundLevel: catSlug === "single-sound" ? "High" : catSlug === "kids-special" ? "Very Low" : "Medium",
        burnTime: `${15 + ((n * 7) % 60)} sec`,
        effectColors: [EFFECTS[n % 6], EFFECTS[(n + 2) % 6], EFFECTS[(n + 4) % 6]],
        ageRecommendation: "12+ with adult supervision",
        usage: "Outdoor",
        rating: (4.4 + ((n % 6) * 0.1)).toFixed(2),
        reviewCount: 18 + ((n * 13) % 240),
        viewCount: 400 + ((n * 91) % 5000),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        categoryName: cat.name,
        categorySlug: cat.slug,
        categoryAccent: cat.accent,
      });
      n += 1;
    });
  }

  // Merge Custom Products & Filter Deleted
  const deletedSet = getDeletedProductIds();
  let filtered = list.filter((p) => !deletedSet.has(p.id) && !deletedSet.has(p.sku));
  const customList = getAllCustomProducts();

  if (Array.isArray(customList) && customList.length > 0) {
    for (const c of customList) {
      const mrpNum = Number(c.mrp) || 100;
      const offerNum = Number(c.offerPrice) || mrpNum;
      const customItem: ProductWithCategory = {
        id: c.id,
        sku: c.sku,
        slug: c.slug || slugify(c.name),
        name: c.name,
        nameTa: c.nameTa || null,
        categoryId: c.categoryId || "cat-1",
        shortDescription: c.shortDescription || `${c.name} — Sivakasi fireworks item.`,
        description: c.description || `${c.name} manufactured under PESO licence with high purity composition.`,
        imageUrl: c.imageUrl || "/images/placeholder.jpg",
        gallery: [c.imageUrl || "/images/placeholder.jpg"],
        videoUrl: c.videoUrl || null,
        packing: c.packing || "1 Box",
        piecesPerPack: c.piecesPerPack || 1,
        mrp: mrpNum.toFixed(2),
        discountPercent: c.discountPercent || Math.round(((mrpNum - offerNum) / mrpNum) * 100),
        offerPrice: offerNum.toFixed(2),
        dealerPrice: (c.dealerPrice || offerNum * 0.88).toFixed(2),
        gstPercent: c.gstPercent || 18,
        moq: c.moq || 1,
        stock: c.stock || 500,
        status: c.status || "ACTIVE",
        isFeatured: Boolean(c.isFeatured),
        isBestSeller: Boolean(c.isBestSeller),
        isNewArrival: Boolean(c.isNewArrival),
        isPremium: Boolean(c.isPremium),
        soundLevel: c.soundLevel || "Medium",
        burnTime: c.burnTime || "20 sec",
        effectColors: ["Gold", "Red"],
        ageRecommendation: "12+ with adult supervision",
        usage: "Outdoor",
        rating: "4.90",
        reviewCount: 30,
        viewCount: 250,
        createdAt: new Date(c.createdAt || Date.now()),
        updatedAt: new Date(),
        deletedAt: null,
        categoryName: c.categoryName || "Special Fireworks",
        categorySlug: slugify(c.categoryName || "special-fireworks"),
        categoryAccent: "#D4AF37",
      };

      const matchIdx = filtered.findIndex((it) => it.id === c.id || it.sku === c.sku);
      if (matchIdx !== -1) {
        filtered[matchIdx] = customItem;
      } else {
        filtered.push(customItem);
      }
    }
  }

  // Apply Custom Reorder Sequence Map if un-sorted
  const reorderMap = getProductReorderMap();
  if (reorderMap && reorderMap.size > 0) {
    filtered.sort((a, b) => {
      const posA =
        reorderMap.get(a.id) ??
        (a.sku ? reorderMap.get(a.sku) : undefined) ??
        (a.slug ? reorderMap.get(a.slug) : undefined) ??
        (a.name ? reorderMap.get(a.name) : undefined) ??
        (a.name ? reorderMap.get(slugify(a.name)) : undefined) ??
        999999;
      const posB =
        reorderMap.get(b.id) ??
        (b.sku ? reorderMap.get(b.sku) : undefined) ??
        (b.slug ? reorderMap.get(b.slug) : undefined) ??
        (b.name ? reorderMap.get(b.name) : undefined) ??
        (b.name ? reorderMap.get(slugify(b.name)) : undefined) ??
        999999;
      return posA - posB;
    });
  }

  return filtered;
}

export type ProductFilters = {
  category?: string;
  q?: string;
  sort?: string;
  min?: number;
  max?: number;
  flag?: string;
  limit?: number;
  offset?: number;
};

export async function getProducts(filters: ProductFilters = {}) {
  let list = getAllProducts();

  if (filters.category && filters.category !== "all") {
    list = list.filter((p) => p.categorySlug === filters.category);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  }
  if (typeof filters.min === "number") {
    list = list.filter((p) => Number(p.offerPrice) >= filters.min!);
  }
  if (typeof filters.max === "number") {
    list = list.filter((p) => Number(p.offerPrice) <= filters.max!);
  }
  if (filters.flag === "new") list = list.filter((p) => p.isNewArrival);
  if (filters.flag === "best") list = list.filter((p) => p.isBestSeller);
  if (filters.flag === "premium") list = list.filter((p) => p.isPremium);
  if (filters.flag === "featured") list = list.filter((p) => p.isFeatured);

  if (filters.sort) {
    switch (filters.sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.offerPrice) - Number(b.offerPrice));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.offerPrice) - Number(a.offerPrice));
        break;
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "discount":
        list.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
        break;
      case "alpha":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "best":
        list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        break;
    }
  }

  const total = list.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 250;

  return { items: list.slice(offset, offset + limit), total };
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const items = getAllProducts();
  return items.find((p) => p.slug === slug) ?? null;
}

export async function getAllProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const items = getAllProducts();
  return items.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
}

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 8): Promise<ProductWithCategory[]> {
  const items = getAllProducts();
  return items.filter((p) => (p.categoryId === categoryId || p.categorySlug === categoryId) && p.id !== excludeId).slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithCategory[]> {
  const items = getAllProducts();
  const feat = items.filter((p) => p.isFeatured);
  return (feat.length ? feat : items).slice(0, limit);
}

export async function getProductsByIds(ids: string[]): Promise<ProductWithCategory[]> {
  if (!ids.length) return [];
  const set = new Set(ids);
  const items = getAllProducts();
  return items.filter((p) => set.has(p.id) || set.has(p.sku));
}

export async function getReviews(limit = 6) {
  const prods = getAllProducts();
  return SEED_REVIEWS.slice(0, limit).map((r, i) => ({
    id: `rev-${i + 1}`,
    productId: prods[i]?.id ?? null,
    name: r.name,
    location: r.location,
    rating: r.rating,
    title: r.title,
    body: r.body,
    isVerified: true,
    isPublished: true,
    createdAt: new Date(),
  }));
}
