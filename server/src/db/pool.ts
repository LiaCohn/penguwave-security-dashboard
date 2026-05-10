import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV !== "test") {
  console.warn("DATABASE_URL is not set");
}

export const pool = new pg.Pool({
  connectionString,
});
