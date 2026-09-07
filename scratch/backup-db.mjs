/**
 * Mayilon Crackers — Automated Database Backup CLI Script
 * Run: node scratch/backup-db.mjs
 */

import fs from "fs";
import path from "path";
import os from "os";

const DATA_DIR = path.join(process.cwd(), ".data");
const TMP_DATA_DIR = path.join(os.tmpdir(), "mayilon-data");
const BACKUP_OUT_DIR = path.join(process.cwd(), "backups");

if (!fs.existsSync(BACKUP_OUT_DIR)) {
  fs.mkdirSync(BACKUP_OUT_DIR, { recursive: true });
}

async function runBackup() {
  console.log("------------------------------------------------------------");
  console.log("🧨 MAYILON PYROWORLD - DATABASE BACKUP UTILITY");
  console.log("------------------------------------------------------------");

  let orders = [];
  let products = [];
  let source = "none";

  // Check local data file
  const localFile = path.join(DATA_DIR, "mayilon_system_storage.json");
  const tmpFile = path.join(TMP_DATA_DIR, "mayilon_system_storage.json");
  const targetFile = fs.existsSync(localFile) ? localFile : fs.existsSync(tmpFile) ? tmpFile : null;

  if (targetFile) {
    try {
      const raw = fs.readFileSync(targetFile, "utf-8");
      const data = JSON.parse(raw);
      orders = data.orders || [];
      products = data.products || [];
      source = targetFile;
      console.log(`✓ Loaded ${orders.length} orders and ${products.length} custom products from ${source}`);
    } catch (e) {
      console.warn("Could not read local data file:", e.message);
    }
  }

  // Check Supabase if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log(`Connecting to Supabase at: ${supabaseUrl}...`);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      if (res.ok) {
        const sbOrders = await res.json();
        if (Array.isArray(sbOrders)) {
          console.log(`✓ Fetched ${sbOrders.length} live orders from Supabase cloud database`);
          orders = sbOrders;
          source = "Supabase Cloud DB";
        }
      } else {
        console.warn(`Supabase returned status: ${res.status}`);
      }
    } catch (err) {
      console.warn("Supabase fetch error:", err.message);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `mayilon_backup_${timestamp}.json`;
  const backupPath = path.join(BACKUP_OUT_DIR, backupFilename);

  const backupPayload = {
    exportedAt: new Date().toISOString(),
    source,
    stats: {
      totalOrders: orders.length,
      totalProducts: products.length,
    },
    orders,
    products,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), "utf-8");

  console.log("------------------------------------------------------------");
  console.log(`✅ Backup successfully written to:`);
  console.log(`   ${backupPath}`);
  console.log(`   Total Orders Saved: ${orders.length}`);
  console.log(`   Total Custom Products: ${products.length}`);
  console.log("------------------------------------------------------------");
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
});
