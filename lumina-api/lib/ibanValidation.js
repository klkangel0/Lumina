/**
 * Validación IBAN (ISO 13616 / mod-97).
 * España: 24 caracteres sin espacios (ES + 2 dígitos de control + 20 del CCC).
 */

function normalizeIban(value) {
    return String(value || '')
        .replace(/\s+/g, '')
        .toUpperCase();
}

function isValidIbanChecksum(iban) {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let expanded = '';
    for (let i = 0; i < rearranged.length; i++) {
        const c = rearranged[i];
        const code = c.charCodeAt(0);
        if (code >= 48 && code <= 57) expanded += c;
        else if (code >= 65 && code <= 90) expanded += String(code - 55);
        else return false;
    }
    let remainder = 0;
    for (let i = 0; i < expanded.length; i++) {
        const digit = parseInt(expanded[i], 10);
        if (!Number.isFinite(digit)) return false;
        remainder = (remainder * 10 + digit) % 97;
    }
    return remainder === 1;
}

/**
 * @param {string} raw - puede incluir espacios
 * @returns {{ ok: true, normalized: string } | { ok: false, message: string }}
 */
function validateIban(raw) {
    const iban = normalizeIban(raw);
    if (!iban) {
        return { ok: false, message: 'El IBAN (número de cuenta) es obligatorio.' };
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
        return { ok: false, message: 'El IBAN debe empezar por dos letras de país y dos dígitos (ej. ES…).' };
    }
    if (iban.length < 15 || iban.length > 34) {
        return { ok: false, message: 'La longitud del IBAN no es válida.' };
    }
    if (iban.startsWith('ES') && iban.length !== 24) {
        return {
            ok: false,
            message: 'Un IBAN español tiene exactamente 24 caracteres sin espacios (ES + 22 dígitos/letras).',
        };
    }
    if (!isValidIbanChecksum(iban)) {
        return { ok: false, message: 'El IBAN no es válido (fallan los dígitos de control).' };
    }
    return { ok: true, normalized: iban };
}

module.exports = { normalizeIban, validateIban, isValidIbanChecksum };
