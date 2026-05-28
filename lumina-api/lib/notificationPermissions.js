/**
 * Puede redactar y enviar avisos masivos: rol sistema ADMIN o permiso explícito
 * canCreate + canEdit en el módulo "notificaciones".
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function userCanManageNotifications(prisma, userId, roleFromJwt) {
    if (roleFromJwt === 'ADMIN') return true;
    if (roleFromJwt === 'SOCIO') return false;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            appRole: {
                include: {
                    permissions: {
                        where: { module: { name: 'notificaciones' } },
                    },
                },
            },
        },
    });

    const p = user?.appRole?.permissions?.[0];
    return !!(p && p.canCreate && p.canEdit);
}

module.exports = { userCanManageNotifications };
