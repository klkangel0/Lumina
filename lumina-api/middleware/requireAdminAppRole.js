const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Configuración sensible: rol de aplicación `admin` O usuario con Role.ADMIN en BD
 * (compatibilidad con cuentas creadas antes de vincular appRole o sin slug correcto).
 */
async function requireAdminAppRole(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { appRole: true },
        });
        if (!user) {
            return res.status(403).json({ message: 'Usuario no encontrado.' });
        }
        const isDbAdmin = user.role === 'ADMIN';
        const isAppRoleAdmin = user.appRole?.name === 'admin';
        if (!isDbAdmin && !isAppRoleAdmin) {
            return res.status(403).json({
                message: 'Solo los administradores de la aplicación pueden acceder a esta configuración.',
            });
        }
        req.adminUser = user;
        next();
    } catch (err) {
        console.error('requireAdminAppRole:', err);
        res.status(500).json({ message: 'Error al comprobar permisos.' });
    }
}

module.exports = requireAdminAppRole;
