const UM_MAX = 35;
const UM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-._]{0,33}[A-Za-z0-9]$/;

/**
 * Validación local (alineada con la API) para UMR antes de enviar.
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
export function validateMandateUmClient(raw) {
    const value = String(raw || '').trim();
    if (!value) {
        return { ok: false, message: 'Indica la referencia única del mandato (UMR).' };
    }
    if (value.length > UM_MAX) {
        return { ok: false, message: `La referencia del mandato no puede superar ${UM_MAX} caracteres.` };
    }
    if (value.length === 1) {
        return /^[A-Za-z0-9]$/.test(value)
            ? { ok: true, value }
            : { ok: false, message: 'La referencia del mandato debe ser alfanumérica.' };
    }
    if (!UM_PATTERN.test(value)) {
        return {
            ok: false,
            message: 'UMR: letras, números y guiones/puntos (1–35 caracteres).',
        };
    }
    return { ok: true, value };
}

/**
 * Propuesta de UMR (referencia única de mandato). El servidor valida formato y unicidad al guardar.
 */
export function generateProposedMandateUm() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const time = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let s = `LUM${time}`;
    while (s.length < 16) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s.slice(0, 35);
}
