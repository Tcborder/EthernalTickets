import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from "@libsql/client";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ethernal-secret-key-123';

// Turso Client Config
const turso = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

app.use(cors());
app.use(express.json());

// Initialize Database Tables
const initDb = async () => {
    try {
        await turso.execute(`
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

        await turso.execute(`
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
        console.error("Error initializing database:", error);
    }
};

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    await initDb();
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email y contraseña son obligatorios" });

    try {
        const hash = await bcrypt.hash(password, 10);
        await turso.execute({
            sql: "INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)",
            args: [email, hash, username || email.split('@')[0]]
        });
        res.status(201).json({ success: true, message: "Usuario creado correctamente" });
    } catch (error) {
        res.status(400).json({ error: "El correo ya está registrado" });
    }
});

app.post('/api/login', async (req, res) => {
    await initDb();
    const { email, password } = req.body;

    try {
        const result = await turso.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });

        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Credenciales inválidas" });
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
        res.status(500).json({ error: "Error en el servidor" });
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
        res.status(401).json({ error: "Token inválido" });
    }
};

app.get('/api/me', authenticate, async (req, res) => {
    await initDb();
    try {
        const result = await turso.execute({
            sql: "SELECT id, email, username, etherion_balance as balance, is_admin FROM users WHERE id = ?",
            args: [req.user.id]
        });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos" });
    }
});

app.post('/api/tickets/purchase', authenticate, async (req, res) => {
    await initDb();
    const { eventTitle, seats, totalPrice } = req.body;
    try {
        const userRes = await turso.execute({
            sql: "SELECT etherion_balance FROM users WHERE id = ?",
            args: [req.user.id]
        });
        const balance = userRes.rows[0].etherion_balance;
        if (balance < totalPrice) return res.status(400).json({ error: "Fondos insuficientes" });

        for (const seatId of seats) {
            await turso.execute({
                sql: "INSERT INTO tickets (user_id, event_title, seat_id, price) VALUES (?, ?, ?, ?)",
                args: [req.user.id, eventTitle, seatId, totalPrice / seats.length]
            });
        }
        await turso.execute({
            sql: "UPDATE users SET etherion_balance = etherion_balance - ? WHERE id = ?",
            args: [totalPrice, req.user.id]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error en la compra" });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
