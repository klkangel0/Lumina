import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore, { usePermissions } from '../store/authStore';

const ProtectedRoute = ({
    children,
    requireAdmin = false,
    requireAppRoleAdmin = false,
    checkSocio = false,
    requiredModule = null,
    allowedAppRoleNames = null,
}) => {
    const { isAuthenticated, user } = useAuthStore();
    const { isAdmin, canView } = usePermissions();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        // If route requires admin and user is not admin, redirect to generic dashboard
        return <Navigate to="/" replace />;
    }

    if (requireAppRoleAdmin && user?.appRoleName !== 'admin' && user?.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    if (allowedAppRoleNames && Array.isArray(allowedAppRoleNames) && !isAdmin) {
        const name = user?.appRoleName || null;
        if (!name || !allowedAppRoleNames.includes(name)) {
            return <Navigate to="/" replace />;
        }
    }

    if (requiredModule && !isAdmin) {
        // Excepción: Los SOCIOS tienen acceso nativo a 'actividades' aunque no tengan un rol de appRole asignado.
        const isSocioActivityAccess = user?.role === 'SOCIO' && requiredModule === 'actividades';

        if (!isSocioActivityAccess && !canView(requiredModule)) {
            return <Navigate to="/" replace />;
        }
    }

    // Global check: if socio is PENDING but tries to access a route other than /lista-espera or /mis-documentos
    if (
        user?.role === 'SOCIO' &&
        user?.socioStatus === 'PENDING' &&
        location.pathname !== '/lista-espera' &&
        location.pathname !== '/mis-documentos' &&
        location.pathname !== '/formulario-alta' &&
        location.pathname !== '/mi-perfil' &&
        location.pathname !== '/avisos'
    ) {
        return <Navigate to="/lista-espera" replace />;
    }

    if (checkSocio && user?.role === 'SOCIO') {
        // Socios should never see the main dashboard.
        // If they are pending, they go to lista-espera, else mis-pacientes.
        if (user?.socioStatus === 'PENDING') {
            return <Navigate to="/lista-espera" replace />;
        } else {
            return <Navigate to="/mis-pacientes" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
