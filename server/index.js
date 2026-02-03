import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { turso } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

        console.log("Database tables verified/created.");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
};

initDb();

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        await turso.execute({
            sql: "INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)",
            args: [email, hash, username || email.split('@')[0]]
        });

        res.status(201).json({ success: true, message: "Usuario creado correctamente" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(400).json({ error: "El correo ya está registrado o hubo un error" });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await turso.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });

        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
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
        console.error("Login error:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Middleware to verify JWT
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
    try {
        const result = await turso.execute({
            sql: "SELECT id, email, username, etherion_balance as balance, is_admin FROM users WHERE id = ?",
            args: [req.user.id]
        });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos del usuario" });
    }
});

// --- Ticket Routes ---

app.post('/api/tickets/purchase', authenticate, async (req, res) => {
    const { eventTitle, seats, totalPrice } = req.body;

    // In a real app, we'd start a transaction here
    try {
        // 1. Check balance
        const userRes = await turso.execute({
            sql: "SELECT etherion_balance FROM users WHERE id = ?",
            args: [req.user.id]
        });

        const balance = userRes.rows[0].etherion_balance;
        if (balance < totalPrice) {
            return res.status(400).json({ error: "Fondos insuficientes" });
        }

        // 2. Insert tickets
        for (const seatId of seats) {
            await turso.execute({
                sql: "INSERT INTO tickets (user_id, event_title, seat_id, price) VALUES (?, ?, ?, ?)",
                args: [req.user.id, eventTitle, seatId, totalPrice / seats.length]
            });
        }

        // 3. Update balance
        await turso.execute({
            sql: "UPDATE users SET etherion_balance = etherion_balance - ? WHERE id = ?",
            args: [totalPrice, req.user.id]
        });

        res.json({ success: true, message: "Compra realizada con éxito" });
    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({ error: "Error al procesar la compra" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
