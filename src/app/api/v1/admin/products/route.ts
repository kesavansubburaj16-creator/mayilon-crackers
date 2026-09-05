import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, requireAdmin, zodFail } from "@/lib/api";
import { saveProductToStore, type ProductRecord } from "@/lib/products-store";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  sku: z.string().min(2),
  categoryName: z.string().min(2),
  mrp: z.number().or(z.string()),
  offerPrice: z.number().or(z.string()),
  packing: z.string().min(1),
  moq: z.number().default(1),
  stock: z.number().default(100),
  imageUrl: z.string().nullable().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed.error);

  const data = parsed.data;
  const name = String(data.name).trim();
  const productRecord: ProductRecord = {
    id: data.id || `prod-${Date.now()}`,
    sku: String(data.sku).trim(),
    slug: slugify(name),
    name,
    categoryName: data.categoryName || "Special Fireworks",
    mrp: Number(data.mrp),
    offerPrice: Number(data.offerPrice),
    discountPercent: Math.round(((Number(data.mrp) - Number(data.offerPrice)) / Number(data.mrp)) * 100),
    packing: data.packing,
    moq: Number(data.moq),
    stock: Number(data.stock),
    imageUrl: data.imageUrl || "/images/placeholder.jpg",
    status: "ACTIVE",
    isNewArrival: Boolean(data.isNewArrival),
    isBestSeller: Boolean(data.isBestSeller),
    isPremium: Boolean(data.isPremium),
    createdAt: new Date().toISOString(),
  };

  saveProductToStore(productRecord);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/pricelist");
    revalidatePath("/products");
  } catch (e) {}

  return ok({ product: productRecord }, "Product created successfully");
}

export async function PUT(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  if (!body.id) return fail("Product ID required", [], 400);

  const name = String(body.name || "Product").trim();
  const mrp = Number(body.mrp) || 100;
  const offerPrice = Number(body.offerPrice) || mrp;

  const productRecord: ProductRecord = {
    id: String(body.id),
    sku: String(body.sku || `MYL-${Date.now()}`),
    slug: slugify(name),
    name,
    categoryName: body.categoryName || "Special Fireworks",
    mrp,
    offerPrice,
    discountPercent: Math.round(((mrp - offerPrice) / mrp) * 100),
    packing: body.packing || "1 Box",
    moq: Number(body.moq) || 1,
    stock: Number(body.stock) || 100,
    imageUrl: body.imageUrl || "/images/placeholder.jpg",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  saveProductToStore(productRecord);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/pricelist");
    revalidatePath("/products");
  } catch (e) {}

  return ok({ product: productRecord }, "Product updated successfully");
}
