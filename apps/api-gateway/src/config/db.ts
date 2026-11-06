import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "ecoroute",
  password: process.env.POSTGRES_PASSWORD || "ecoroute_secure_pass_2026",
  database: process.env.POSTGRES_DB || "ecoroute_db",
  max: 20,
  idleTimeoutMillis: 30000
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});
