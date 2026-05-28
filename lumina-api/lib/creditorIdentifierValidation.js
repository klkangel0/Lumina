/**
 * Identificador de acreedor (Creditor ID): formato variable según banco y país.
 * Validación relajada para producto genérico: longitud y caracteres seguros para XML SEPA.
 */

const MAX_LEN = 64;

/**
 * @param {string} raw
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
function validateCreditorIdentifierRelaxed(raw) {
    const value = String(raw || '').trim();
    if (!value) {
        return { ok: false, message: 'El identificador del acreedor (Creditor ID) es obligatorio cuando SEPA está activo.' };
    }
    if (value.length > MAX_LEN) {
        return { ok: false, message: `El identificador del acreedor no puede superar ${MAX_LEN} caracteres.` };
    }
    // Letras, dígitos y separadores habituales en identificadores bancarios
    if (!/^[A-Za-z0-9+\-./\s]+$/.test(value)) {
        return {
            ok: false,
            message: 'El identificador del acreedor contiene caracteres no permitidos. Use letras, números y separadores simples.',
        };
    }
    return { ok: true, value };
}

module.exports = { validateCreditorIdentifierRelaxed, MAX_LEN };
