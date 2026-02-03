
# Guía de Implementación Backend con Turso

¡Hola! Has creado una interfaz de usuario increíble. Ahora, para almacenar los datos "de verdad" (como pediste), necesitamos un Backend.

Vite (la tecnología que usas para el frontend) corre en el navegador del usuario, por lo que **no puede conectarse directamente a la Base de Datos** de forma segura (expodría tus contraseñas).

Aquí tienes la arquitectura recomendada para **Ethernal Tickets**:

## Opción 1: La Ruta "Pro" (Node.js + Express + Turso)

Esta es la forma estándar de hacerlo si quieres control total.

### 1. Crear el Backend
Necesitarás crear una carpeta `server` en tu proyecto.

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv @libsql/client bcryptjs jsonwebtoken
```

### 2. Configurar Turso
Crea un archivo `server/db.js`:

```javascript
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### 3. Crear el Esquema (Tablas)
Entra a tu consola de Turso y corre esto SQL:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT,
  etherion_balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_id TEXT,
  seat_id TEXT,
  price REAL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

### 4. Crear los Endpoints (API)
En `server/index.js`:

```javascript
import express from 'express';
import { turso } from './db.js';
import bcrypt from 'bcryptjs';
// ... configuración básica de express

app.post('/api/register', async (req, res) => {
  const { email, password, username } = req.body;
  const hash = await bcrypt.hash(password, 10);
  
  try {
    await turso.execute({
      sql: "INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)",
      args: [email, hash, username]
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "El usuario ya existe" });
  }
});

app.post('/api/login', async (req, res) => {
  // ... lógica para verificar password con bcrypt.compare()
  // ... retornar un Token (JWT) si es correcto
});
```

---

## Opción 2: La Ruta Rápida (Supabase / Firebase)

Si no quieres mantener un servidor de Node.js, te recomiendo **Supabase**. Es básicamente una base de datos (Postgres) que trae el Login ya hecho.

1.  Creas cuenta en Supabase.
2.  Instalas el cliente: `npm install @supabase/supabase-js`
3.  ¡Listo! Te olvidas de servidores.

```javascript
// En tu App.tsx
const { data, error } = await supabase.auth.signUp({
  email: 'example@email.com',
  password: 'example-password',
})
```

---

**¿Qué sigue?**
Por ahora, he dejado implementada la **Simulación Visual**.
1.  Si haces clic en "Mi Cuenta", se abre el Login.
2.  Si pones cualquier dato, "inicia sesión" y cambia el botón por tu nombre.

Esto te permite probar toda la experiencia de usuario (UX) antes de meterte en la complejidad del backend.

¡Avísame si quieres que procedamos con la **Opción 1** y escriba el código del servidor por ti! 🚀
