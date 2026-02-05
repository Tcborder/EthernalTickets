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
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

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

        await turso.execute(`
            CREATE TABLE IF NOT EXISTS venues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                svg_content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await turso.execute(`
            CREATE TABLE IF NOT EXISTS venue_seats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venue_id INTEGER,
                seat_identifier TEXT NOT NULL,
                section TEXT,
                row_name TEXT,
                seat_number TEXT,
                x REAL,
                y REAL,
                type TEXT,
                FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE CASCADE
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

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.is_admin === 1 || req.user.is_admin === true)) {
        next();
    } else {
        res.status(403).json({ error: "No tienes permisos de administrador" });
    }
};

const MAX_SAFE_ETHERIONS = 1000000000000000;

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const result = await turso.execute({
            sql: "SELECT id, email, username, etherion_balance as balance, is_admin FROM users WHERE id = ?",
            args: [req.user.id]
        });
        const userData = result.rows[0];
        if (userData) {
            userData.id = Number(userData.id);
            userData.balance = Number(userData.balance);
            userData.is_admin = !!userData.is_admin;
        }
        res.json(userData);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos del usuario" });
    }
});

// --- Admin Routes ---

app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await turso.execute("SELECT id, email, username, etherion_balance as balance, is_admin FROM users");
        const users = result.rows.map(row => ({
            ...row,
            id: Number(row.id),
            balance: Number(row.balance),
            is_admin: !!row.is_admin
        }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener lista de usuarios" });
    }
});

app.get('/api/admin/tickets', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await turso.execute("SELECT * FROM tickets ORDER BY purchase_date DESC");
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

app.post('/api/admin/add-balance', authenticate, async (req, res) => {
    try {
        let { email, amount } = req.body;
        const isSelf = req.user.email === email;
        const isAdminUser = req.user.is_admin === 1 || req.user.is_admin === true;

        if (!isSelf && !isAdminUser) {
            return res.status(403).json({ error: "No autorizado" });
        }

        const userRes = await turso.execute({
            sql: "SELECT etherion_balance FROM users WHERE email = ?",
            args: [email]
        });

        if (userRes.rows.length === 0) return res.status(404).json({ error: "No encontrado" });

        let newBalance = Number(userRes.rows[0].etherion_balance) + Number(amount);
        if (newBalance > MAX_SAFE_ETHERIONS) newBalance = MAX_SAFE_ETHERIONS;
        if (newBalance < 0) newBalance = 0;

        await turso.execute({
            sql: "UPDATE users SET etherion_balance = ? WHERE email = ?",
            args: [newBalance, email]
        });

        res.json({ success: true, message: "Saldo actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar saldo" });
    }
});

app.post('/api/admin/set-admin', authenticate, isAdmin, async (req, res) => {
    try {
        const { email, isAdmin: targetIsAdmin } = req.body;
        await turso.execute({
            sql: "UPDATE users SET is_admin = ? WHERE email = ?",
            args: [targetIsAdmin ? 1 : 0, email]
        });
        res.json({ success: true, message: "Rango actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar rango" });
    }
});

app.post('/api/admin/change-password', authenticate, isAdmin, async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const hash = await bcrypt.hash(newPassword, 10);
        await turso.execute({
            sql: "UPDATE users SET password_hash = ? WHERE email = ?",
            args: [hash, email]
        });
        res.json({ success: true, message: "Contraseña actualizada" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar contraseña" });
    }
});

// --- Venue Routes ---

app.post('/api/admin/venues', authenticate, isAdmin, async (req, res) => {
    const { name, svgContent, seatData } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Nombre del venue es requerido" });
    }

    try {
        // 1. Create the venue (svgContent can be empty initially for chunked upload)
        const venueResult = await turso.execute({
            sql: "INSERT INTO venues (name, svg_content) VALUES (?, ?) RETURNING id",
            args: [name, svgContent || ""]
        });
        const venueId = venueResult.rows[0].id;

        // 2. Insert seats if provided (legacy/small payload mode)
        if (seatData && Array.isArray(seatData) && seatData.length > 0) {
            for (const seat of seatData) {
                await turso.execute({
                    sql: `INSERT INTO venue_seats 
                     (venue_id, seat_identifier, section, row_name, seat_number, x, y, type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [
                        venueId,
                        seat.id,
                        seat.section || 'General',
                        seat.row || '',
                        seat.number || seat.id,
                        seat.x || 0,
                        seat.y || 0,
                        seat.type || 'regular'
                    ]
                });
            }
        }

        res.status(201).json({ success: true, venueId, message: "Venue registrado correctamente" });
    } catch (error) {
        console.error("Error creating venue:", error);
        res.status(500).json({ error: "Error al registrar el venue" });
    }
});

app.post('/api/admin/venues/:id/svg-chunk', authenticate, isAdmin, async (req, res) => {
    const { chunk } = req.body;
    if (!chunk) return res.status(400).json({ error: "Chunk invalido" });

    try {
        await turso.execute({
            sql: "UPDATE venues SET svg_content = svg_content || ? WHERE id = ?",
            args: [chunk, req.params.id]
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Error appending SVG chunk:", error);
        res.status(500).json({ error: "Error al subir parte del SVG" });
    }
});

app.post('/api/admin/venues/:id/seats', authenticate, isAdmin, async (req, res) => {
    const { seatData } = req.body;
    if (!seatData || !Array.isArray(seatData)) {
        return res.status(400).json({ error: "Datos de asientos requeridos" });
    }

    try {
        // Using a transaction implicitly by awaiting sequentially or we could optimize
        for (const seat of seatData) {
            await turso.execute({
                sql: `INSERT INTO venue_seats 
                     (venue_id, seat_identifier, section, row_name, seat_number, x, y, type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    req.params.id,
                    seat.id,
                    seat.section || 'General',
                    seat.row || '',
                    seat.number || seat.id,
                    seat.x || 0,
                    seat.y || 0,
                    seat.type || 'regular'
                ]
            });
        }
        res.json({ success: true, message: "Asientos agregados" });
    } catch (error) {
        console.error("Error adding seats:", error);
        res.status(500).json({ error: "Error al guardar asientos" });
    }
});

app.get('/api/admin/venues', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await turso.execute("SELECT * FROM venues ORDER BY created_at DESC");
        const venues = [];

        for (const row of result.rows) {
            // Count seats for each venue
            const countRes = await turso.execute({
                sql: "SELECT COUNT(*) as count FROM venue_seats WHERE venue_id = ?",
                args: [row.id]
            });
            venues.push({
                ...row,
                id: Number(row.id),
                capacity: Number(countRes.rows[0].count)
            });
        }

        res.json(venues);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener venues" });
    }
});

app.get('/api/admin/venues/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const venueRes = await turso.execute({
            sql: "SELECT * FROM venues WHERE id = ?",
            args: [req.params.id]
        });

        if (venueRes.rows.length === 0) return res.status(404).json({ error: "Venue no encontrado" });

        const seatsRes = await turso.execute({
            sql: "SELECT * FROM venue_seats WHERE venue_id = ?",
            args: [req.params.id]
        });

        res.json({
            ...venueRes.rows[0],
            seats: seatsRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener detalles del venue" });
    }
});

app.delete('/api/admin/venues/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await turso.execute({
            sql: "DELETE FROM venues WHERE id = ?",
            args: [req.params.id]
        });
        res.json({ success: true, message: "Venue eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar venue" });
    }
});

// --- Ticket Routes ---

app.post('/api/tickets/purchase', authenticate, async (req, res) => {
    const { eventTitle, seats, totalPrice } = req.body;
    try {
        const userRes = await turso.execute({
            sql: "SELECT etherion_balance FROM users WHERE id = ?",
            args: [req.user.id]
        });

        const balance = Number(userRes.rows[0].etherion_balance);
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

        res.json({ success: true, message: "Compra exitosa" });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar la compra" });
    }
});

app.get('/api/tickets/sold', async (req, res) => {
    try {
        const result = await turso.execute("SELECT seat_id FROM tickets");
        res.json(result.rows.map(row => row.seat_id));
    } catch (error) {
        res.status(500).json({ error: "Error al obtener ventas" });
    }
});

app.get('/api/tickets/sold/:eventTitle', async (req, res) => {
    try {
        const { eventTitle } = req.params;
        const result = await turso.execute({
            sql: "SELECT seat_id FROM tickets WHERE event_title = ?",
            args: [eventTitle]
        });
        res.json(result.rows.map(row => row.seat_id));
    } catch (error) {
        res.status(500).json({ error: "Error al obtener ventas del evento" });
    }
});

app.post('/api/admin/tickets/reset', authenticate, isAdmin, async (req, res) => {
    try {
        await turso.execute("DELETE FROM tickets");
        res.json({ success: true, message: "Sistema reseteado" });
    } catch (error) {
        res.status(500).json({ error: "Error al resetear" });
    }
});

app.post('/api/admin/tickets/revoke', authenticate, isAdmin, async (req, res) => {
    try {
        const { seatIds } = req.body;
        for (const seatId of seatIds) {
            await turso.execute({
                sql: "DELETE FROM tickets WHERE seat_id = ?",
                args: [seatId]
            });
        }
        res.json({ success: true, message: "Boletos revocados" });
    } catch (error) {
        res.status(500).json({ error: "Error al revocar" });
    }
});

app.post('/api/admin/tickets/reset-event', authenticate, isAdmin, async (req, res) => {
    try {
        const { eventTitle } = req.body;
        await turso.execute({
            sql: "DELETE FROM tickets WHERE event_title = ?",
            args: [eventTitle]
        });
        res.json({ success: true, message: "Evento reseteado" });
    } catch (error) {
        res.status(500).json({ error: "Error al resetear evento" });
    }
});

app.get('/api/my-tickets', authenticate, async (req, res) => {
    try {
        const result = await turso.execute({
            sql: "SELECT * FROM tickets WHERE user_id = ? ORDER BY purchase_date DESC",
            args: [req.user.id]
        });

        const tickets = result.rows.map(row => ({
            id: `TK-${row.id}`,
            event: row.event_title,
            seat: row.seat_id.split('-').pop(),
            row: row.seat_id.split('-')[3],
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
        res.status(500).json({ error: "Error al obtener boletos" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
