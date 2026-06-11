const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const requireAdminAppRole = require('../middleware/requireAdminAppRole');
const {
    getOrCreateNotificationSettings,
    runDailyNotificationChecks,
} = require('../lib/notifications');

const router = express.Router();
const prisma = new PrismaClient();

function serialize(row) {
    return {
        seguroEnabled: row.seguroEnabled,
        seguroMonthsBefore: row.seguroMonthsBefore,
        subvencionEnabled: row.subvencionEnabled,
        subvencionMonthsBefore: row.subvencionMonthsBefore,
        actividadEnrollEnabled: row.actividadEnrollEnabled,
        lastDailyRunAt: row.lastDailyRunAt,
        updatedAt: row.updatedAt,
        updatedByUserId: row.updatedByUserId,
    };
}

// Clamp meses de antelación a un rango razonable (1..24); por defecto 1.
function parseMonths(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > 24) return 24;
    return n;
}

router.use(verifyToken);
router.use(requireAdminAppRole);

router.get('/', async (req, res) => {
    try {
        const row = await getOrCreateNotificationSettings(prisma);
        res.json(serialize(row));
    } catch (e) {
        console.error('notificationSettings GET:', e);
        res.status(500).json({ message: 'Error al cargar la configuración de notificaciones.' });
    }
});

router.put('/', async (req, res) => {
    try {
        const body = req.body || {};
        const data = {
            seguroEnabled: body.seguroEnabled === undefined ? true : Boolean(body.seguroEnabled),
            seguroMonthsBefore: parseMonths(body.seguroMonthsBefore, 1),
            subvencionEnabled: body.subvencionEnabled === undefined ? true : Boolean(body.subvencionEnabled),
            subvencionMonthsBefore: parseMonths(body.subvencionMonthsBefore, 1),
            actividadEnrollEnabled: body.actividadEnrollEnabled === undefined ? true : Boolean(body.actividadEnrollEnabled),
            updatedByUserId: req.user.id,
        };

        const updated = await prisma.notificationSettings.upsert({
            where: { id: 1 },
            create: { id: 1, ...data },
            update: data,
        });
        res.json(serialize(updated));
    } catch (e) {
        console.error('notificationSettings PUT:', e);
        res.status(500).json({ message: 'Error al guardar la configuración de notificaciones.' });
    }
});

// Disparo manual de la comprobación diaria (avisos de seguros y subvenciones).
// Útil para probar o para invocar desde una tarea programada externa en producción.
router.post('/run', async (req, res) => {
    try {
        const summary = await runDailyNotificationChecks(prisma);
        await prisma.notificationSettings.update({ where: { id: 1 }, data: { lastDailyRunAt: new Date() } }).catch(() => {});
        res.json({ ok: true, ...summary });
    } catch (e) {
        console.error('notificationSettings RUN:', e);
        res.status(500).json({ message: 'Error al ejecutar la comprobación de notificaciones.' });
    }
});

module.exports = router;
