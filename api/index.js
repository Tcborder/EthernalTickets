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

    _turso = createClient({
        url,
        authToken,
        intMode: 'bigint' // Safely handle extremely large numbers from Turso
    });
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
            { id: Number(user.id), email: user.email, is_admin: Number(user.is_admin) === 1 },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: Number(user.id),
                email: user.email,
                username: user.username,
                balance: Number(user.etherion_balance),
                is_admin: Number(user.is_admin) === 1
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

        const userData = result.rows[0];
        if (userData) {
            userData.id = Number(userData.id);
            userData.balance = Number(userData.balance);
            userData.is_admin = Number(userData.is_admin) === 1;
        }
        res.json(userData);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener perfil" });
    }
});

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.is_admin === 1 || req.user.is_admin === true)) {
        next();
    } else {
        res.status(403).json({ error: "No tienes permisos de administrador" });
    }
};

const MAX_SAFE_ETHERIONS = 1000000000000000; // 1 Billón (Quadrillion in US) - Safe for JS

app.post('/api/admin/add-balance', authenticate, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        let { email, amount } = req.body;

        if (!email || amount === undefined) {
            return res.status(400).json({ error: "Email y cantidad son requeridos" });
        }

        // Allow if user is updating themselves OR if they are an admin
        const isSelf = req.user.email === email;
        const isAdminUser = req.user.is_admin === 1 || req.user.is_admin === true;

        if (!isSelf && !isAdminUser) {
            return res.status(403).json({ error: "No tienes permisos para realizar esta acción" });
        }

        // Get current balance to check for overflow
        const userRes = await db.execute({
            sql: "SELECT etherion_balance FROM users WHERE email = ?",
            args: [email]
        });

        if (userRes.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const currentBalance = Number(userRes.rows[0].etherion_balance);
        let newBalance = currentBalance + Number(amount);

        if (newBalance > MAX_SAFE_ETHERIONS) newBalance = MAX_SAFE_ETHERIONS;
        if (newBalance < 0) newBalance = 0;

        await db.execute({
            sql: "UPDATE users SET etherion_balance = ? WHERE email = ?",
            args: [newBalance, email]
        });

        res.json({ success: true, message: `Saldo actualizado. Nuevo balance: ${newBalance.toLocaleString()}` });
    } catch (error) {
        console.error("Balance update error:", error);
        res.status(500).json({ error: "Error de precisión: El número es demasiado grande" });
    }
}); app.post('/api/admin/change-password', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ error: "Email y nueva contraseña son requeridos" });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        const result = await db.execute({
            sql: "UPDATE users SET password_hash = ? WHERE email = ?",
            args: [hash, email]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ success: true, message: `Contraseña de ${email} actualizada correctamente` });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ error: "Error al actualizar la contraseña" });
    }
});
app.post('/api/admin/set-admin', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { email, isAdmin: targetIsAdmin } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email es requerido" });
        }

        const result = await db.execute({
            sql: "UPDATE users SET is_admin = ? WHERE email = ?",
            args: [targetIsAdmin ? 1 : 0, email]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ success: true, message: `Rango de ${email} actualizado correctamente` });
    } catch (error) {
        console.error("Set admin error:", error);
        res.status(500).json({ error: "Error al actualizar el rango de administrador" });
    }
});

app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const result = await db.execute("SELECT id, email, username, etherion_balance as balance, is_admin FROM users");

        const users = result.rows.map(row => ({
            ...row,
            id: Number(row.id),
            balance: Number(row.balance),
            is_admin: Number(row.is_admin) === 1
        }));

        res.json(users);
    } catch (error) {
        console.error("List users error:", error);
        res.status(500).json({ error: "Error al obtener lista de usuarios" });
    }
});

app.get('/api/admin/tickets', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const result = await db.execute("SELECT * FROM tickets ORDER BY purchase_date DESC");

        const tickets = result.rows.map(row => ({
            id: `TK-${row.id}`,
            event: row.event_title,
            seat: row.seat_id.split('-').pop(),
            row: row.seat_id.split('-')[3] || '?',
            originalSeatId: row.seat_id,
            section: 'AZU201',
            location: 'Auditorio Telmex, GDL',
            price: Number(row.price),
            date: new Date(row.purchase_date).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'long', year: 'numeric'
            })
        }));

        res.json(tickets);
    } catch (error) {
        console.error("Admin list tickets error:", error);
        res.status(500).json({ error: "Error al obtener lista de boletos" });
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

        const balance = Number(userRes.rows[0].etherion_balance);
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

app.get('/api/tickets/sold', async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const result = await db.execute("SELECT seat_id FROM tickets");
        const soldSeats = result.rows.map(row => row.seat_id);
        res.json(soldSeats);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener asientos ocupados" });
    }
});

app.get('/api/tickets/sold/:eventTitle', async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { eventTitle } = req.params;
        const result = await db.execute({
            sql: "SELECT seat_id FROM tickets WHERE event_title = ?",
            args: [eventTitle]
        });
        const soldSeats = result.rows.map(row => row.seat_id);
        res.json(soldSeats);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener asientos ocupados del evento" });
    }
});

app.post('/api/admin/tickets/reset', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        await db.execute("DELETE FROM tickets");
        res.json({ success: true, message: "Sistema de tickets reseteado" });
    } catch (error) {
        res.status(500).json({ error: "Error al resetear tickets" });
    }
});

app.post('/api/admin/tickets/revoke', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { seatIds } = req.body;
        if (!seatIds || !Array.isArray(seatIds)) return res.status(400).json({ error: "seatIds es requerido" });

        for (const seatId of seatIds) {
            await db.execute({
                sql: "DELETE FROM tickets WHERE seat_id = ?",
                args: [seatId]
            });
        }
        res.json({ success: true, message: "Boletos revocados correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al revocar boletos" });
    }
});

app.post('/api/admin/tickets/reset-event', authenticate, isAdmin, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const { eventTitle } = req.body;
        if (!eventTitle) return res.status(400).json({ error: "eventTitle es requerido" });

        await db.execute({
            sql: "DELETE FROM tickets WHERE event_title = ?",
            args: [eventTitle]
        });
        res.json({ success: true, message: `Evento ${eventTitle} reseteado` });
    } catch (error) {
        res.status(500).json({ error: "Error al resetear evento" });
    }
});

app.get('/api/my-tickets', authenticate, async (req, res) => {
    try {
        await initDb();
        const db = getTurso();
        const result = await db.execute({
            sql: "SELECT * FROM tickets WHERE user_id = ? ORDER BY purchase_date DESC",
            args: [req.user.id]
        });

        // Map to match the frontend TicketData interface
        const tickets = result.rows.map(row => ({
            id: `TK-${row.id}`,
            event: row.event_title,
            seat: row.seat_id.split('-').pop(), // Last part of seat-6-row-A-item-1
            row: row.seat_id.split('-')[3],    // Row part
            originalSeatId: row.seat_id,
            section: 'AZU201',               // Default mock section
            location: 'Auditorio Telmex, GDL',
            price: Number(row.price),
            date: new Date(row.purchase_date).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'long', year: 'numeric'
            })
        }));

        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener tus boletos" });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
