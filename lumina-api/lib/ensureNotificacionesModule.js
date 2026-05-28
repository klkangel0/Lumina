/**
 * Garantiza que exista el módulo de avisos en BD (sin depender de haber ejecutado seed a mano).
 * Asigna permisos completos al rol de aplicación «admin».
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureNotificacionesModule(prisma) {
    const mod = await prisma.module.upsert({
        where: { name: 'notificaciones' },
        update: {
            displayName: 'Avisos / notificaciones',
            icon: 'bell',
            route: '/avisos',
            order: 13,
            active: true,
        },
        create: {
            name: 'notificaciones',
            displayName: 'Avisos / notificaciones',
            icon: 'bell',
            route: '/avisos',
            order: 13,
            active: true,
        },
    });

    const adminAppRole = await prisma.appRole.findUnique({ where: { name: 'admin' } });
    if (adminAppRole) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: adminAppRole.id, moduleId: mod.id } },
            update: {
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
            },
            create: {
                roleId: adminAppRole.id,
                moduleId: mod.id,
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
            },
        });
    }

    return mod;
}

module.exports = { ensureNotificacionesModule };
