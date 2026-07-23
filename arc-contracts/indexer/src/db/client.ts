import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";
import {config} from "../config/index.js";

const {Pool} = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({connectionString: config.databaseUrl});
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function migrate(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "schema.sql"), // dist/db or src/db (tsx)
    path.join(here, "..", "..", "src", "db", "schema.sql"), // dist/db → src/db
  ];
  const schemaPath = candidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`schema.sql not found. Tried: ${candidates.join(", ")}`);
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  await getPool().query(sql);
  console.log("[db] schema applied");
}
