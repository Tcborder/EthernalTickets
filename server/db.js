import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the server folder
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("DB URL from ENV:", process.env.TURSO_DATABASE_URL ? "Exists" : "MISSING");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("ERROR: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in .env");
}

export const turso = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});
