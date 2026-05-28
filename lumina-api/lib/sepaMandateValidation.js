/**
 * UMR (Unique Mandate Reference) y fecha de firma del mandato SEPA.
 * Pain.008 suele exigir UMR ≤ 35 caracteres alfanuméricos (bancos pueden variar).
 */

const UM_MAX = 35;
/** Caracteres habituales en UMR (conservador; se puede ampliar si un banco lo exige). */
const UM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-._]{0,33}[A-Za-z0-9]$/;

/**
 * @param {string} raw
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
function validateMandateUm(raw) {
    const value = String(raw || '').trim();
    if (!value) {
        return { ok: false, message: 'La referencia del mandato (UMR) es obligatoria mientras SEPA esté activo.' };
    }
    if (value.length > UM_MAX) {
        return { ok: false, message: `La referencia del mandato no puede superar ${UM_MAX} caracteres.` };
    }
    if (value.length === 1) {
        if (!/^[A-Za-z0-9]$/.test(value)) {
            return { ok: false, message: 'La referencia del mandato (UMR) debe ser alfanumérica.' };
        }
        return { ok: true, value };
    }
    if (!UM_PATTERN.test(value)) {
        return {
            ok: false,
            message: 'La referencia del mandato (UMR): use letras, números y guiones/puntos (1–35 caracteres).',
        };
    }
    return { ok: true, value };
}

/**
 * @param {string|Date|null|undefined} raw — fecha `YYYY-MM-DD` o ISO
 * @returns {{ ok: true, date: Date } | { ok: false, message: string }}
 */
function parseMandateSignedAt(raw) {
    if (raw === undefined || raw === null || raw === '') {
        return { ok: false, message: 'La fecha de firma del mandato es obligatoria mientras SEPA esté activo.' };
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return { ok: true, date: raw };
    }
    const s = String(raw).trim();
    if (!s) {
        return { ok: false, message: 'La fecha de firma del mandato es obligatoria mientras SEPA esté activo.' };
    }
    const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
    if (Number.isNaN(d.getTime())) {
        return { ok: false, message: 'La fecha de firma del mandato no es válida.' };
    }
    const now = new Date();
    if (d.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
        return { ok: false, message: 'La fecha de firma del mandato no puede ser futura.' };
    }
    return { ok: true, date: d };
}

/**
 * Comprueba datos mínimos de mandato para socios activos con SEPA global activo.
 */
function assertSepaCompleteForActiveSocio({
    sepaOrgEnabled,
    status,
    iban,
    sepaMandateUm,
    sepaMandateSignedAt,
    docSepa,
}) {
    if (!sepaOrgEnabled || status !== 'ACTIVE') {
        return { ok: true };
    }
    const ibanStr = iban != null ? String(iban).trim() : '';
    if (!ibanStr) {
        return { ok: false, message: 'Con SEPA activo, el IBAN del socio es obligatorio para socios activos.' };
    }
    const um = validateMandateUm(sepaMandateUm);
    if (!um.ok) return um;
    const dt = parseMandateSignedAt(sepaMandateSignedAt);
    if (!dt.ok) return dt;
    const doc = docSepa != null && String(docSepa).trim();
    if (!doc) {
        return {
            ok: false,
            message:
                'Con SEPA activo, debe constar el documento del mandato firmado (súbelo en «Mis documentos» como mandato SEPA).',
        };
    }
    return { ok: true };
}

module.exports = {
    validateMandateUm,
    parseMandateSignedAt,
    assertSepaCompleteForActiveSocio,
    UM_MAX,
};
