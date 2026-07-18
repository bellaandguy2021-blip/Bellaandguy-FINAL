// Runs a .sql file directly against your Supabase Postgres database.
// Usage:
//   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" node scripts/run-sql.js supabase/services.sql
//
// Get SUPABASE_DB_URL from: Supabase Dashboard -> Settings -> Database ->
// Connection string -> URI (toggle "include password" so it's filled in).

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const file = process.argv[2];
const dbUrl = process.env.SUPABASE_DB_URL;

if (!file) {
  console.error("Usage: SUPABASE_DB_URL=\"...\" node scripts/run-sql.js <path-to-sql-file>");
  process.exit(1);
}
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL. Set it to your Supabase connection string (Dashboard -> Settings -> Database -> Connection string -> URI).");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), "utf8");

(async () => {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`Connected. Running ${file} ...`);
    await client.query(sql);
    console.log("Done — SQL ran successfully.");
  } catch (err) {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
