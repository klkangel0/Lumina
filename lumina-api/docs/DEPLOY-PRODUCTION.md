# Despliegue en producción (gassotea.org)

Puedes **borrar lo que haya** en `httpdocs/lumina-api` y subir esta versión. No hace falta migrar ni conservar datos viejos.

## En tu PC

```powershell
cd c:\xampp\htdocs\lumina-api
npm run deploy:bundle
```

Sube por FTP la carpeta **`lumina-api`** completa al servidor (**sin** `node_modules`).

Ruta en servidor: `httpdocs/lumina-api/`  
Usuario FTP: `smunozassotea`

## Plesk → Node.js

| Campo | Valor |
|--------|--------|
| Raíz aplicación | `httpdocs/lumina-api` |
| Archivo inicio | `index.js` |
| Node | 16+ (la del panel) |

Variables mínimas:

```env
NODE_ENV=production
DATABASE_URL=mysql://USUARIO:PASSWORD@localhost:3306/NOMBRE_BD
JWT_SECRET=cualquier_secreto_largo
```

(Sin `PORT` si Plesk lo asigna solo. Contraseña con `@` en URL → `%40`.)

## En el servidor (SSH)

**No subas `node_modules` por FTP.** Instálalo siempre en el servidor.

Si `node` no se encuentra, activa Node 16 con nodenv (Plesk):

```bash
cd ~/httpdocs/lumina-api
export PATH="$HOME/.nodenv/bin:$PATH"
eval "$(nodenv init -)"
nodenv shell 16
node -v   # debe mostrar v16.x
```

Si falla `ipaddr.js` u otro módulo: borra e instala de nuevo:

```bash
cd ~/httpdocs/lumina-api
rm -rf node_modules
npm install
npm run prisma:generate
npm run prisma:push
node seed-demo-data.js
```

Alternativa: en Plesk → Node.js → botón **«Instalación de NPM»** (hace `npm install` en la raíz de la app).

Prueba arranque: `node index.js` (Ctrl+C para salir). Luego **Reiniciar app** en el panel.

### Error 500: `PassengerAppType not allowed here` en `public/.htaccess`

**No uses `.htaccess` con directivas Passenger en `public/`.** Bórralo en el servidor.

En Plesk → **Configuración de hospedaje** → **Raíz del documento**: pon  
`httpdocs/lumina-api` (no `lumina-api/public`).

Node sirve el React desde `build/` y la API en `/api`. Reinicia la app Node.

Si `npx prisma` da **Permission denied** (habitual tras subir por FTP), usa siempre `npm run prisma:generate` y `npm run prisma:push` (llaman a Prisma vía `node`, sin ejecutable `.bin`).

Opcional si sigue fallando:
```bash
chmod +x node_modules/.bin/*
node node_modules/prisma/build/index.js generate
node node_modules/prisma/build/index.js db push
```

**Node.js:** en Plesk sube a **18 o 20** si el panel lo permite (ahora 16.20 da avisos `EBADENGINE`; suele funcionar, pero 18+ es mejor).

Reinicia la app Node en Plesk.

### Login OK pero «Error al conectar con el servidor» / Passenger en `/api/health`

- Sube de nuevo **`index.js`** (Express 5 no admite `app.get('*')`; la app debe hacer `module.exports = app`).
- Plesk → **Reiniciar app** → prueba `https://gassotea.org/api/health`.
- Si sigue fallando: **Registros** del dominio o `tail` del log de Passenger (enlace «Technical details»).

## Probar

- `https://gassotea.org` → login  
- `https://gassotea.org/api/health` → JSON  

## Notas técnicas (por si algo falla)

- Front + API mismo dominio: rutas `/api/...`.
- React servido desde `build/` (y copia en `public/` para el document root del panel).
- MariaDB sin JSON nativo: cuestionario en `LongText` (`lib/questionnaireJson.js`).
- `npx prisma db push` sincroniza el schema (no hay carpeta `migrations`).

Opcional más adelante: `SMTP_*` en `.env` para correos reales; `CORS_ORIGIN` si el front va en otro dominio.
