import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/api";
import { getProducts } from "@/lib/data";
import { deleteProduct, saveProduct, type ProductRecord } from "@/lib/db";
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

  const res = ok({ items, total });
  res.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

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

  await saveProduct(productRecord);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/pricelist");
    revalidatePath("/products");
    revalidatePath("/estimate");
    revalidatePath("/admin");
    if (productRecord.slug) {
      revalidatePath(`/products/${productRecord.slug}`);
    }
  } catch (e) {}

  return ok({ product: productRecord }, "Product saved successfully", 201);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  let id = sp.get("id");
  let sku = sp.get("sku");

  if (!id && !sku && req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    id = body.id || id;
    sku = body.sku || sku;
  }

  const target = id || sku;
  if (!target) return fail("Product ID or SKU required for deletion", [], 400);

  if (id) deleteProduct(id);
  if (sku) deleteProduct(sku);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/pricelist");
    revalidatePath("/products");
    revalidatePath("/estimate");
    revalidatePath("/admin");
  } catch (e) {}

  return ok({ id: target }, "Product deleted successfully");
}
