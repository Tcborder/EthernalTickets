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

async function makeAdmin(email) {
    try {
        console.log(`⏳ Intentando dar admin a: ${email}...`);

        const result = await client.execute({
            sql: "UPDATE users SET is_admin = 1 WHERE email = ?",
            args: [email]
        });

        if (result.rowsAffected > 0) {
            console.log(`✅ ¡Éxito! El usuario ${email} ahora es administrador.`);
        } else {
            console.log(`⚠️ No se encontró ningún usuario con el correo: ${email}`);
        }
    } catch (error) {
        console.error("❌ Error al actualizar la base de datos:", error);
    } finally {
        process.exit(0);
    }
}

// Obtener el correo de los argumentos de la línea de comandos
const email = process.argv[2];

if (!email) {
    console.log("Uso: node scripts/make-admin.js usuario@ejemplo.com");
    process.exit(1);
}

makeAdmin(email);
