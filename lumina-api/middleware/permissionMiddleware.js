const checkPermission = (moduleName, action) => {
    return (req, res, next) => {
        // Super admin bypass
        if (req.user && req.user.role === 'ADMIN') {
            return next();
        }

        const perms = req.user?.permissions?.[moduleName];
        
        if (!perms) {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para este módulo.' });
        }

        if (perms.canManageAll) {
            return next();
        }

        if (!perms[action]) {
            return res.status(403).json({ message: `Acceso denegado. No tienes permiso para: ${action}` });
        }

        next();
    };
};

module.exports = checkPermission;
