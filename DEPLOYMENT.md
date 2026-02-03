
# Guía de Despliegue (Deployment) 🚀

¡Felicidades por tu dominio! Aquí tienes los pasos para subir tu **Ethernal Ticket Web** a internet y conectarlo.

## Paso 1: Subir tu código a GitHub
Para desplegar fácil y gratis, primero necesitamos tu código en la nube.

1.  Abre una terminal en tu proyecto.
2.  Si no lo has hecho: `git init`
3.  `git add .`
4.  `git commit -m "Versión lista para deploy"`
5.  Crea un repositorio en [GitHub.com](https://github.com/new).
6.  Sigue las instrucciones que te da GitHub para "push an existing repository".

## Paso 2: Desplegar en Vercel (Recomendado)
Vercel es la mejor opción para apps de React/Vite.

1.  Crea una cuenta en [Vercel.com](https://vercel.com).
2.  Haz clic en **"Add New..."** -> **"Project"**.
3.  Importa tu repositorio de GitHub.
4.  Vercel detectará que es **Vite**. Dale a **Deploy**.
5.  ¡En 1 minuto tu sitio estará online! (te dará un link algo como `ethernal-web.vercel.app`).

## Paso 3: Conectar tu Dominio
Ahora hagamos que funcione tu dominio nuevo.

1.  En tu proyecto de Vercel, ve a **Settings** -> **Domains**.
2.  Escribe tu dominio (ej. `ethernaltickets.com`) y dale a **Add**.
3.  Vercel te dará unos valores DNS:
    *   **A Record** (si es dominio raíz): `76.76.21.21`
    *   **CNAME** (si es www): `cname.vercel-dns.com`

## Paso 4: Configurar DNS (Donde compraste el dominio)
1.  Ve a tu proveedor (GoDaddy, Namecheap, etc.).
2.  Busca la sección **DNS Management** o **Administrar DNS**.
3.  Agrega los registros que te dio Vercel.
    *   Tipo: `A`, Nombre: `@`, Valor: `76.76.21.21`
    *   Tipo: `CNAME`, Nombre: `www`, Valor: `cname.vercel-dns.com`
4.  Guarda y espera unos minutos (a veces horas).

¡Listo! Tu web estará accesible en tu propio dominio con HTTPS automático. 🌐🔒
