/**
 * Permite acceso si el usuario es ADMIN (role DB) o si su appRoleName (del JWT) está en la lista.
 * Útil para funcionalidades que deben estar disponibles a roles de app (p. ej. junta/junta_plus)
 * sin hacer depender el acceso del sistema de permisos por módulo.
 */
function requireAppRoleNames(allowedAppRoleNames) {
    const allowed = Array.isArray(allowedAppRoleNames) ? allowedAppRoleNames : [];

    return (req, res, next) => {
        const isDbAdmin = req.user?.role === 'ADMIN';
        const appRoleName = req.user?.appRoleName || null;
        const isAllowedAppRole = appRoleName && allowed.includes(appRoleName);

        if (!isDbAdmin && !isAllowedAppRole) {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos.' });
        }
        return next();
    };
}

module.exports = requireAppRoleNames;

