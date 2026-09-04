import pg from "pg";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "../src/lib/seed-data.ts";

const { Pool } = pg;
const connectionString = "postgresql://postgres:mayiloncrackers@db.lkhxcmsbxkggoagbmoar.supabase.co:5432/postgres";

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database...");

    // 1. Seed Categories
    const categoryMap = new Map();
    for (let i = 0; i < SEED_CATEGORIES.length; i++) {
      const c = SEED_CATEGORIES[i];
      const res = await pool.query(
        `INSERT INTO categories (name, name_ta, slug, tagline, description, image_url, accent, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, name_ta = EXCLUDED.name_ta, sort_order = EXCLUDED.sort_order
         RETURNING id, slug`,
        [c.name, c.nameTa || null, c.slug, c.tagline || null, c.description || null, c.imageUrl || null, c.accent || "#D4AF37", c.icon || "Sparkles", i]
      );
      categoryMap.set(c.slug, res.rows[0].id);
    }
    console.log(`✓ Seeded ${categoryMap.size} categories into DB.`);

    // 2. Seed Products
    let productCount = 0;
    for (const [catSlug, prodList] of Object.entries(SEED_PRODUCTS)) {
      const categoryId = categoryMap.get(catSlug);

      for (const p of prodList) {
        const name = Array.isArray(p) ? p[0] : p.name;
        const slug = slugify(name);
        const sku = (Array.isArray(p) ? p.sku : p.sku) || `MYL-${slug.slice(0, 8).toUpperCase()}`;
        const mrp = (Array.isArray(p) ? p[1] : p.mrp) || 100;
        const packing = (Array.isArray(p) ? p[2] : p.packing) || "1 Box";
        const offerPrice = (Array.isArray(p) ? p[6] : p.offerPrice) || Math.round(mrp * 0.2);
        const discountPercent = Math.round(((mrp - offerPrice) / mrp) * 100);

        await pool.query(
          `INSERT INTO products (sku, slug, name, name_ta, category_id, packing, mrp, discount_percent, offer_price, image_url, gallery, moq, stock, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE')
           ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name`,
          [
            sku,
            slug,
            name,
            null,
            categoryId,
            packing,
            mrp,
            discountPercent,
            offerPrice,
            "/images/placeholder.jpg",
            JSON.stringify(["/images/placeholder.jpg"]),
            500,
          ]
        );
        productCount++;
      }
    }
    console.log(`✓ Seeded ${productCount} products into DB.`);

  } catch (err) {
    console.error("DB Seed Error:", err);
  } finally {
    await pool.end();
  }
}

main();
