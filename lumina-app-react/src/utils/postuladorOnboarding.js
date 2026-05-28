/**
 * Perfil mínimo para pasar de «datos por completar» a «pendiente de aprobación».
 * Alineado con validaciones al guardar socio en PUT /api/profile (apellidos, DNI, dirección, CP).
 */
export function evaluatePostuladorProfileComplete(profile) {
    if (!profile) {
        return { ok: false, missing: ['No se pudo cargar el perfil'] };
    }
    const missing = [];

    if (!String(profile.name || '').trim()) missing.push('Nombre');
    if (!String(profile.email || '').trim()) missing.push('Correo electrónico');
    if (!String(profile.phone || '').trim()) missing.push('Teléfono');

    const s = profile.socio;
    if (!s) {
        missing.push('Ficha de socio');
        return { ok: false, missing };
    }

    const lastName = String(s.lastName || '').trim();
    const lastNameParts = lastName.split(/\s+/).filter(Boolean);
    if (lastNameParts.length < 2) {
        missing.push('Apellidos en ficha (indica al menos dos apellidos)');
    }

    if (!String(s.dni || '').trim()) missing.push('DNI / NIE');
    if (!String(s.address || '').trim()) missing.push('Dirección');
    if (!String(s.postalCode || '').trim()) missing.push('Código postal');

    return { ok: missing.length === 0, missing };
}
