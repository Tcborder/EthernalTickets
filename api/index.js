import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from "@libsql/client";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ethernal-secret-key-123';

// Helper to get Turso client safely.
// We initialize it lazily to avoid crashing at startup if env vars are missing.
let _turso;
const getTurso = () => {
    if (_turso) return _turso;
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        throw new Error("Missing Turso configuration (TURSO_DATABASE_URL or TURSO_AUTH_TOKEN)");
    }

    _turso = createClient({ url, authToken });
    return _turso;
};

app.use(cors());
app.use(express.json());

// Initialize Database Tables
const initDb = async () => {
    const db = getTurso();
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                username TEXT,
                etherion_balance INTEGER DEFAULT 1000,
                is_admin BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                event_title TEXT,
                seat_id TEXT,
                price REAL,
                purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);
    } catch (error) {
        console.error("Database initialization failed:", error);
        throw error;
    }
};

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const db = getTurso();
        await db.execute("SELECT 1");
        res.json({ status: 'active', database: 'connected', env: process.env.NODE_ENV });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email y contraseña son obligatorios" });
        }

        const hash = await bcrypt.hash(password, 10);
        await db.execute({
            sql: "INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)",
            args: [email, hash, username || email.split('@')[0]]
        });

        res.status(201).json({ success: true, message: "Usuario creado correctamente" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: error.message || "Error al registrar usuario" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { email, password } = req.body;

        const result = await db.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });

        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, is_admin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.etherion_balance,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: error.message || "Error al iniciar sesión" });
    }
});

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No autorizado" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Sesión expirada o inválida" });
    }
};

app.get('/api/me', authenticate, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const result = await db.execute({
            sql: "SELECT id, email, username, etherion_balance as balance, is_admin FROM users WHERE id = ?",
            args: [req.user.id]
        });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener perfil" });
    }
});

app.post('/api/tickets/purchase', authenticate, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { eventTitle, seats, totalPrice } = req.body;

        const userRes = await db.execute({
            sql: "SELECT etherion_balance FROM users WHERE id = ?",
            args: [req.user.id]
        });

        const balance = userRes.rows[0].etherion_balance;
        if (balance < totalPrice) return res.status(400).json({ error: "Saldo insuficiente" });

        for (const seatId of seats) {
            await db.execute({
                sql: "INSERT INTO tickets (user_id, event_title, seat_id, price) VALUES (?, ?, ?, ?)",
                args: [req.user.id, eventTitle, seatId, totalPrice / seats.length]
            });
        }

        await db.execute({
            sql: "UPDATE users SET etherion_balance = etherion_balance - ? WHERE id = ?",
            args: [totalPrice, req.user.id]
        });

        res.json({ success: true, message: "¡Compra exitosa!" });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar la compra" });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
