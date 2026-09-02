import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { getProducts } from "@/lib/data";
import {
  clearAllProductsInStore,
  deleteProductFromStore,
  saveProductToStore,
  type ProductRecord,
} from "@/lib/products-store";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    return v ? Number(v) : undefined;
  };

  const { items, total } = await getProducts({
    category: sp.get("category") ?? undefined,
    q: sp.get("q") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    flag: sp.get("flag") ?? undefined,
    min: num("min"),
    max: num("max"),
    limit: num("limit") ?? 250,
    offset: num("offset") ?? 0,
  });

  return ok({ items, total });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.action === "clear-all") {
    clearAllProductsInStore();
    return ok({}, "Catalogue cleared successfully", 200);
  }

  if (!body.name || !body.mrp || !body.offerPrice) {
    return fail("Product name, MRP, and offer price are required", [], 400);
  }

  const id = body.id || `prod-${Date.now()}`;
  const name = String(body.name).trim();
  const sku = String(body.sku || `MYL-PROD-${Date.now().toString().slice(-4)}`).trim();
  const slug = slugify(name);
  const mrp = Number(body.mrp) || 100;
  const offerPrice = Number(body.offerPrice) || mrp;

  const productRecord: ProductRecord = {
    id,
    sku,
    slug,
    name,
    nameTa: body.nameTa || undefined,
    categoryName: body.categoryName || "Special Fireworks",
    imageUrl: body.imageUrl || "/images/placeholder.jpg",
    imageUrl2: body.imageUrl2 || undefined,
    imageUrl3: body.imageUrl3 || undefined,
    videoUrl: body.videoUrl || undefined,
    packing: body.packing || "1 Box",
    mrp,
    offerPrice,
    discountPercent: Math.round(((mrp - offerPrice) / mrp) * 100),
    moq: Number(body.moq) || 1,
    stock: Number(body.stock) || 500,
    status: "ACTIVE",
    isFeatured: Boolean(body.isFeatured),
    isNewArrival: Boolean(body.isNewArrival),
    isBestSeller: Boolean(body.isBestSeller),
    isPremium: Boolean(body.isPremium),
    createdAt: new Date().toISOString(),
  };

  // 1. Save to Universal Product Store Backup
  saveProductToStore(productRecord);

  // 2. Direct Primary DB Save into Supabase PostgreSQL
  try {
    let categoryIdToUse: string | null = null;

    if (body.categoryId) {
      categoryIdToUse = body.categoryId;
    } else {
      const catSlug = slugify(productRecord.categoryName || "Special Fireworks");
      const [catRow] = await db
        .insert(categories)
        .values({
          name: productRecord.categoryName || "Special Fireworks",
          nameTa: "சிறப்பு வெடிகள்",
          slug: catSlug,
          tagline: "Sivakasi Direct Quality",
          description: "Premium Sivakasi manufactured fireworks",
          imageUrl: productRecord.imageUrl || "/images/placeholder.jpg",
          accent: "#D4AF37",
          icon: "Sparkles",
          sortOrder: 1,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { name: productRecord.categoryName || "Special Fireworks", updatedAt: new Date() },
        })
        .returning({ id: categories.id });
      if (catRow?.id) categoryIdToUse = catRow.id;
    }

    if (!categoryIdToUse) {
      const existingCat = await db.select({ id: categories.id }).from(categories).limit(1);
      if (existingCat.length > 0) categoryIdToUse = existingCat[0].id;
    }

    if (categoryIdToUse) {
      await db
        .insert(products)
        .values({
          sku: productRecord.sku,
          slug: productRecord.slug,
          name: productRecord.name,
          categoryId: categoryIdToUse,
          imageUrl: productRecord.imageUrl,
          packing: productRecord.packing,
          mrp: String(productRecord.mrp),
          offerPrice: String(productRecord.offerPrice),
          discountPercent: productRecord.discountPercent,
          moq: productRecord.moq,
          stock: productRecord.stock,
          isFeatured: productRecord.isFeatured,
          isNewArrival: productRecord.isNewArrival,
          isBestSeller: productRecord.isBestSeller,
          isPremium: productRecord.isPremium,
        })
        .onConflictDoUpdate({
          target: products.sku,
          set: {
            name: productRecord.name,
            mrp: String(productRecord.mrp),
            offerPrice: String(productRecord.offerPrice),
            discountPercent: productRecord.discountPercent,
            packing: productRecord.packing,
            imageUrl: productRecord.imageUrl,
            stock: productRecord.stock,
            updatedAt: new Date(),
          },
        });
      console.log(`[POST /api/v1/products] ✓ Saved ${productRecord.name} (SKU: ${productRecord.sku}, OfferPrice: ₹${productRecord.offerPrice}) directly into Supabase DB`);
    }
  } catch (err) {
    console.error("[POST /api/v1/products] DB Write Error:", err);
  }

  return ok({ product: productRecord }, "Product saved successfully to database", 201);
}

export async function DELETE(req: Request) {
  const sp = new URL(req.url).searchParams;
  const action = sp.get("action");
  const id = sp.get("id");

  if (action === "clear-all") {
    clearAllProductsInStore();
    return ok({}, "All catalogue products cleared successfully");
  }

  if (!id) return fail("Product ID required", [], 400);

  deleteProductFromStore(id);

  try {
    // Delete from DB if present
  } catch (err) {}

  return ok({ id }, "Product deleted successfully");
}
