import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("❌ Error: No se encontraron las credenciales de Turso en /server/.env");
    process.exit(1);
}

const client = createClient({ url, authToken });

const SAFE_LIMIT = 1000000000000; // 1 Trillon (Safe for most tools)

async function fixBalance(email) {
    try {
        console.log(`⏳ Reparando balance para: ${email}...`);

        const result = await client.execute({
            sql: "UPDATE users SET etherion_balance = ? WHERE email = ?",
            args: [SAFE_LIMIT, email]
        });

        if (result.rowsAffected > 0) {
            console.log(`✅ ¡Éxito! El balance de ${email} se ha reseteado a 1T (una cantidad segura).`);
            console.log(`Ahora ya deberías poder abrir Turso/Drizzle Studio sin errores.`);
        } else {
            console.log(`⚠️ No se encontró ningún usuario con el correo: ${email}`);
        }
    } catch (error) {
        console.error("❌ Error al actualizar la base de datos:", error);
    } finally {
        process.exit(0);
    }
}

const email = process.argv[2] || "tcborder020@gmail.com";
fixBalance(email);
