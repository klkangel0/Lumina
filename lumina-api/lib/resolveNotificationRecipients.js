const DELIVERY_TYPES = new Set([
    'single_user',
    'socios_activos',
    'postuladores',
    'personal_interno',
    'cuentas_administrador',
    'rol_aplicacion',
]);

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<string[]>}
 */
async function resolveRecipientUserIds(prisma, delivery) {
    if (!delivery || typeof delivery !== 'object') return [];
    const type = String(delivery.type || '').trim();
    if (!DELIVERY_TYPES.has(type)) return [];

    if (type === 'single_user') {
        const uid = delivery.userId ? String(delivery.userId).trim() : '';
        if (!uid) return [];
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } });
        return u ? [u.id] : [];
    }

    if (type === 'socios_activos') {
        const rows = await prisma.user.findMany({
            where: { role: 'SOCIO', socio: { status: 'ACTIVE' } },
            select: { id: true },
        });
        return [...new Set(rows.map((r) => r.id))];
    }

    if (type === 'postuladores') {
        const rows = await prisma.user.findMany({
            where: { role: 'SOCIO', socio: { status: 'PENDING' } },
            select: { id: true },
        });
        return [...new Set(rows.map((r) => r.id))];
    }

    if (type === 'personal_interno') {
        const rows = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'WORKER'] } },
            select: { id: true },
        });
        return [...new Set(rows.map((r) => r.id))];
    }

    if (type === 'cuentas_administrador') {
        const rows = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true },
        });
        return [...new Set(rows.map((r) => r.id))];
    }

    if (type === 'rol_aplicacion') {
        const rid = parseInt(String(delivery.appRoleId), 10);
        if (!Number.isFinite(rid)) return [];
        const rows = await prisma.user.findMany({
            where: { appRoleId: rid },
            select: { id: true },
        });
        return [...new Set(rows.map((r) => r.id))];
    }

    return [];
}

function audienceSummaryLabel(type, appRoleDisplayName) {
    const labels = {
        single_user: 'Usuario específico',
        socios_activos: 'Socios dados de alta',
        postuladores: 'Personas en lista de espera',
        personal_interno: 'Personal con acceso al panel de gestión',
        cuentas_administrador: 'Cuentas con perfil Administrador (sistema)',
        rol_aplicacion: appRoleDisplayName
            ? `Rol de aplicación: ${appRoleDisplayName}`
            : 'Rol de aplicación',
    };
    return labels[type] || type;
}

module.exports = {
    resolveRecipientUserIds,
    audienceSummaryLabel,
    DELIVERY_TYPES,
};
