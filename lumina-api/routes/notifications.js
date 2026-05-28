const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const { userCanManageNotifications } = require('../lib/notificationPermissions');
const {
    resolveRecipientUserIds,
    audienceSummaryLabel,
    DELIVERY_TYPES,
} = require('../lib/resolveNotificationRecipients');

const router = express.Router();
const prisma = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] });
const { ensureNotificacionesModule } = require('../lib/ensureNotificacionesModule');

router.use(verifyToken);

// ——— Bandeja del usuario actual (socios y personal) ———
router.get('/me', async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) {
            return res.status(401).json({ message: 'Sesión no válida. Vuelva a iniciar sesión.' });
        }

        await ensureNotificacionesModule(prisma);

        const receipts = await prisma.notificationReceipt.findMany({
            where: { userId: uid },
            take: 150,
            include: {
                notification: {
                    include: {
                        author: { select: { id: true, name: true, username: true } },
                    },
                },
            },
        });

        receipts.sort((a, b) => new Date(b.notification.createdAt) - new Date(a.notification.createdAt));
        const top = receipts.slice(0, 100);

        return res.json({
            items: top.map((r) => ({
                receiptId: r.id,
                readAt: r.readAt,
                notification: {
                    id: r.notification.id,
                    title: r.notification.title,
                    body: r.notification.body,
                    importance: r.notification.importance,
                    createdAt: r.notification.createdAt,
                    author: r.notification.author,
                },
            })),
        });
    } catch (e) {
        console.error('GET /notifications/me', e);
        const msg =
            e.code === 'P2021' || (e.message && e.message.includes('does not exist'))
                ? 'Falta aplicar el esquema de base de datos (avisos). Ejecute en lumina-api: npx prisma db push'
                : 'Error al cargar avisos.';
        return res.status(500).json({ message: msg });
    }
});

router.get('/me/unread-count', async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return res.status(401).json({ message: 'Sesión no válida.' });
        await ensureNotificacionesModule(prisma);
        const count = await prisma.notificationReceipt.count({
            where: { userId: uid, readAt: null },
        });
        res.json({ count });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al contar avisos sin leer.' });
    }
});

router.patch('/me/:notificationId/read', async (req, res) => {
    try {
        const receipt = await prisma.notificationReceipt.findFirst({
            where: { notificationId: req.params.notificationId, userId: req.user.id },
        });
        if (!receipt) return res.status(404).json({ message: 'Aviso no encontrado.' });
        await prisma.notificationReceipt.update({
            where: { id: receipt.id },
            data: { readAt: new Date() },
        });
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al marcar como leído.' });
    }
});

// ——— Redacción (solo permiso creación + edición en módulo notificaciones) ———
router.get('/sent', async (req, res) => {
    try {
        const ok = await userCanManageNotifications(prisma, req.user.id, req.user.role);
        if (!ok) return res.status(403).json({ message: 'No tiene permiso para consultar avisos enviados.' });

        const list = await prisma.notification.findMany({
            where: { authorId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 80,
            select: {
                id: true,
                title: true,
                importance: true,
                audienceSummary: true,
                recipientCount: true,
                createdAt: true,
            },
        });
        res.json(list);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al cargar historial.' });
    }
});

router.get('/roles-for-targeting', async (req, res) => {
    try {
        const ok = await userCanManageNotifications(prisma, req.user.id, req.user.role);
        if (!ok) return res.status(403).json({ message: 'Sin permiso.' });

        const roles = await prisma.appRole.findMany({
            where: { active: true },
            orderBy: { displayName: 'asc' },
            select: { id: true, name: true, displayName: true },
        });
        res.json(roles);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al cargar roles.' });
    }
});

router.get('/search-users', async (req, res) => {
    try {
        const ok = await userCanManageNotifications(prisma, req.user.id, req.user.role);
        if (!ok) return res.status(403).json({ message: 'Sin permiso.' });

        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json([]);

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: q } },
                    { name: { contains: q } },
                    { email: { contains: q } },
                    { socio: { memberCode: { contains: q } } },
                ],
            },
            take: 25,
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                appRole: { select: { displayName: true } },
                socio: { select: { memberCode: true, status: true } },
            },
        });

        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error en la búsqueda.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const ok = await userCanManageNotifications(prisma, req.user.id, req.user.role);
        if (!ok) {
            return res.status(403).json({
                message:
                    'No tiene permiso para enviar avisos. Se requiere el módulo «Notificaciones» con permisos de creación y edición, o ser administrador del sistema.',
            });
        }

        const { title, body, importance, delivery } = req.body || {};
        const titleT = String(title || '').trim();
        const bodyT = String(body || '').trim();
        if (!titleT || titleT.length > 200) {
            return res.status(400).json({ message: 'Indique un asunto breve (máx. 200 caracteres).' });
        }
        if (!bodyT || bodyT.length > 12000) {
            return res.status(400).json({ message: 'El mensaje es obligatorio (máx. 12.000 caracteres).' });
        }

        const imp = importance === 'ALTA' ? 'ALTA' : 'NORMAL';
        const dtype = delivery && String(delivery.type || '').trim();
        if (!DELIVERY_TYPES.has(dtype)) {
            return res.status(400).json({ message: 'Tipo de destinatarios no válido.' });
        }

        let audienceSummary = audienceSummaryLabel(dtype);
        if (dtype === 'rol_aplicacion') {
            const rid = parseInt(String(delivery.appRoleId), 10);
            const role = Number.isFinite(rid)
                ? await prisma.appRole.findUnique({ where: { id: rid }, select: { displayName: true } })
                : null;
            audienceSummary = audienceSummaryLabel(dtype, role?.displayName);
        } else if (dtype === 'single_user') {
            audienceSummary = 'Usuario específico';
        }

        const recipientIds = await resolveRecipientUserIds(prisma, delivery);
        if (recipientIds.length === 0) {
            return res.status(400).json({
                message:
                    'No se ha podido determinar ningún destinatario. Compruebe el criterio o la persona seleccionada.',
            });
        }

        const notif = await prisma.$transaction(async (tx) => {
            const n = await tx.notification.create({
                data: {
                    title: titleT,
                    body: bodyT,
                    importance: imp,
                    audienceSummary,
                    recipientCount: recipientIds.length,
                    authorId: req.user.id,
                },
            });
            await tx.notificationReceipt.createMany({
                data: recipientIds.map((userId) => ({
                    notificationId: n.id,
                    userId,
                })),
                skipDuplicates: true,
            });
            return n;
        });

        res.status(201).json({
            success: true,
            notification: {
                id: notif.id,
                title: notif.title,
                recipientCount: notif.recipientCount,
                audienceSummary: notif.audienceSummary,
                createdAt: notif.createdAt,
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al enviar el aviso.' });
    }
});

module.exports = router;
