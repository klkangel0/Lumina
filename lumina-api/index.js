require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.error('[Lumina] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Lumina] unhandledRejection:', reason);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const sociosRoutes = require('./routes/socios');
const usuariosRoutes = require('./routes/usuarios');
const rolesRoutes = require('./routes/roles');
const profileRoutes = require('./routes/profile');
const dashboardRoutes = require('./routes/dashboard');
const pacientesRoutes = require('./routes/pacientes');
const documentsRoutes = require('./routes/documents');
const delegacionesRoutes = require('./routes/delegaciones');
const subvencionesRoutes = require('./routes/subvenciones');
const segurosRoutes = require('./routes/seguros');
const inventarioRoutes = require('./routes/inventario');
const actividadesRoutes = require('./routes/actividades');
const workersRoutes = require('./routes/workers');
const externalProfessionalsRoutes = require('./routes/external_professionals');
const notificationsRoutes = require('./routes/notifications');
const sepaSettingsRoutes = require('./routes/sepaSettings');
const sepaRecibosRoutes = require('./routes/sepaRecibos');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();
const prisma = new PrismaClient();
// Mismo puerto por defecto que el proxy de `lumina-app-react` (package.json)
const PORT = process.env.PORT || 4001;

const corsOrigins =
    process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
        : '*';
app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Serve uploaded files statically
// Prefer `./uploads` (inside app folder). Keep legacy `../uploads` if exists.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${req.method}] ${req.url}`);
        next();
    });
}
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/socios', sociosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/delegaciones', delegacionesRoutes);
app.use('/api/subvenciones', subvencionesRoutes);
app.use('/api/seguros', segurosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/external-professionals', externalProfessionalsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/sepa-settings', sepaSettingsRoutes);
app.use('/api/sepa-recibos', sepaRecibosRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'Welcome to the new Lumina API (Node.js + Prisma)' });
});

// En local, si existe ./build (p. ej. copia del despliegue), NO servirlo por defecto:
// evita cargar un bundle de producción y confundir login / API. En Plesk suele ir NODE_ENV=production.
const serveReactFromApi =
    process.env.NODE_ENV === 'production' || process.env.SERVE_REACT_BUILD === '1';
const buildDir = path.join(__dirname, 'build');
if (serveReactFromApi && fs.existsSync(buildDir)) {
    app.use(express.static(buildDir));
    // Express 5 / path-to-regexp: no usar app.get('*') (rompe Passenger en Plesk)
    app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        return res.sendFile(path.join(buildDir, 'index.html'), (err) => {
            if (err) next(err);
        });
    });
} else if (fs.existsSync(buildDir) && !serveReactFromApi) {
    console.log('[Lumina] Carpeta ./build ignorada en desarrollo (no se sirve el front desde la API). Usa `npm start` en lumina-app-react o SERVE_REACT_BUILD=1 para probar el bundle aquí.');
}

// ==========================================
// CRON JOBS (Background Tasks) — no en Passenger (acelera arranque)
// ==========================================
const onPassengerForCron =
    process.env.PASSENGER_APP_ENV ||
    process.env.PHUSION_PASSENGER ||
    process.env.PASSENGER === '1' ||
    process.env.PASSENGER === 'true';

if (!onPassengerForCron) {
cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily check for upcoming subvenciones deadlines...');
    try {
        const today = new Date();
        const oneMonthFromNow = new Date(today);
        oneMonthFromNow.setMonth(today.getMonth() + 1);
        
        // Formatear para buscar fechas exactas obviando la hora
        const startOfDay = new Date(oneMonthFromNow);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(oneMonthFromNow);
        endOfDay.setHours(23, 59, 59, 999);

        // Find all subvenciones expiring exactly in 1 month that are NOT justified
        const upcoming = await prisma.subvencion.findMany({
            where: {
                deadlineDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: {
                    notIn: ['JUSTIFICADO', 'EN_ORDEN']
                }
            },
            include: { delegation: true }
        });

        if (upcoming.length > 0) {
            console.log(`[CRON] Found ${upcoming.length} subvenciones expiring in exactly 1 month.`);
            
            // En producción configurar SMTP en .env (mismo criterio que lib/email.js).
            // Sin SMTP el cron solo registra en log; no envía correos reales.
            const smtpHost = process.env.SMTP_HOST;
            let transporter = null;
            if (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS) {
                transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(process.env.SMTP_PORT || '587', 10),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
            }

            for (const sub of upcoming) {
                if (!sub.delegation.email) continue; // Skip if delegation has no email
                
                const mailOptions = {
                    from: '"Assotea System" <noreply@assotea.org>',
                    to: sub.delegation.email,
                    subject: `⚠️ ADVERTENCIA: La subvención "${sub.name}" caduca en 1 mes`,
                    text: `Hola,\n\nEste es un recordatorio automático.\nLa subvención "${sub.name}" de la delegación ${sub.delegation.name} tiene como fecha límite de justificación el próximo ${sub.deadlineDate.toLocaleDateString()}.\n\nPor favor, justifícala lo antes posible.\n\nSaludos,\nEl equipo de Assotea`,
                };
                
                try {
                    if (transporter) {
                        await transporter.sendMail({
                            ...mailOptions,
                            from: process.env.SMTP_FROM || mailOptions.from,
                        });
                        console.log(`[CRON] Sent email warning for ${sub.name} to ${sub.delegation.email}`);
                    } else {
                        console.log(`[CRON] SMTP no configurado; aviso omitido para ${sub.name}`);
                    }
                } catch (err) {
                    console.error(`[CRON] Failed to send email for ${sub.name}:`, err);
                }
            }
        } else {
            console.log('[CRON] No upcoming deadlines in exactly 1 month.');
        }
    } catch (error) {
        console.error('[CRON] Error checking subvenciones deadlines:', error);
    }
});
}

// Phusion Passenger (Plesk): hay que llamar a listen(); si no, el proceso termina al instante.
module.exports = app;

const onPassenger = onPassengerForCron;

function logListening(where) {
    console.log(`[Lumina] API escuchando (${where})`);
}

if (onPassenger) {
    app.listen('passenger', () => logListening('passenger'));
} else if (process.env.PORT && String(process.env.PORT) !== String(PORT)) {
    // Plesk a veces solo define PORT sin variables PASSENGER_*
    app.listen(process.env.PORT, () => logListening(`port ${process.env.PORT}`));
} else if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Lumina API Server running on http://localhost:${PORT}`);
    });
}
