/**
 * Validación alineada con lumina-api/lib/questionnaireValidation.js
 * para el asistente del formulario de alta en React.
 */

import { TODOS_MUNICIPIOS } from '../data/baixLlobregatMunicipios';

const SERVICE_IDS = [
    'psicologia_ind',
    'habilidades_sociales',
    'logopedia_ind',
    'orientacion_familiar',
    'formacion_tea',
];

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function isNonEmptyValue(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'number' && Number.isFinite(v)) return true;
    if (typeof v === 'string') return v.trim().length > 0;
    return false;
}

function parseAge(part1) {
    if (!part1 || part1.patientAge === undefined || part1.patientAge === null || part1.patientAge === '') return null;
    const n = typeof part1.patientAge === 'number' ? part1.patientAge : parseInt(String(part1.patientAge), 10);
    return Number.isFinite(n) ? n : null;
}

function patientPart1Complete(part1) {
    if (!part1) return false;
    if (isNonEmptyString(part1.patientName) && isNonEmptyString(part1.patientFirstSurname)) {
        return isNonEmptyString(part1.patientSecondSurname);
    }
    return isNonEmptyString(part1.patientFullName);
}

function parentsPart1Complete(part1) {
    if (!part1) return false;
    if (isNonEmptyString(part1.parentMotherName) && isNonEmptyString(part1.parentFatherName)) return true;
    return isNonEmptyString(part1.parentsFullName);
}

/** @returns {string[]} mensajes de error (vacío = OK) */
export function part1FieldErrors(part1) {
    const e = [];
    if (!part1 || typeof part1 !== 'object') {
        return ['Todos los campos de la parte 1 son obligatorios.'];
    }
    if (!patientPart1Complete(part1)) {
        if (!isNonEmptyString(part1.patientFullName)) {
            if (!isNonEmptyString(part1.patientName)) e.push('Nombre del paciente (hijo/a)');
            if (!isNonEmptyString(part1.patientFirstSurname)) e.push('Primer apellido del paciente');
            if (!isNonEmptyString(part1.patientSecondSurname)) e.push('Segundo apellido del paciente');
        }
    }
    const age = parseAge(part1);
    if (age === null || age < 1 || age > 18) e.push('Edad del paciente (1–18)');
    if (!parentsPart1Complete(part1)) {
        if (!isNonEmptyString(part1.parentsFullName)) {
            if (!isNonEmptyString(part1.parentMotherName)) e.push('Nombre y apellidos de la madre');
            if (!isNonEmptyString(part1.parentFatherName)) e.push('Nombre y apellidos del padre');
        }
    }
    if (!isNonEmptyString(part1.municipio) || !TODOS_MUNICIPIOS.includes(String(part1.municipio).trim())) {
        e.push('Municipio válido del Baix Llobregat');
    }
    const delId = part1.delegationId;
    if (delId === null || delId === undefined || delId === '') e.push('Delegación preferida');
    if (!isNonEmptyString(part1.phone)) e.push('Teléfono de contacto');
    if (!isNonEmptyString(part1.email)) e.push('Correo electrónico');
    const tea = part1.teaDiagnosis;
    if (tea !== 'si' && tea !== 'no') e.push('Diagnóstico TEA (sí/no)');
    if (tea === 'si') {
        const ok = ['nivel1', 'nivel2', 'nivel3', 'no_se'].includes(part1.teaLevel);
        if (!ok) e.push('Grado/nivel TEA');
    }
    return e;
}

export function parsePatientAge(part1) {
    return parseAge(part1);
}

/** @param {'infant'|'adolescent'} variant */
export function part2AnswersComplete(variant, answers) {
    if (!answers || typeof answers !== 'object') return false;
    const max = variant === 'infant' ? 39 : 30;
    for (let i = 1; i <= max; i++) {
        const k = String(i);
        const v = answers[k];
        if (!isNonEmptyValue(v)) return false;
    }
    return true;
}

export function part3FormComplete(part3) {
    if (!part3 || typeof part3 !== 'object') return false;
    const services = part3.services;
    if (!Array.isArray(services) || services.length === 0) return false;
    const valid = services.every((s) => SERVICE_IDS.includes(s));
    if (!valid) return false;
    if (part3.morningAvail !== 'si' && part3.morningAvail !== 'no') return false;
    if (!['15', '16', '17', '17_30'].includes(part3.afternoonStart)) return false;
    if (part3.saturdayMorning !== 'si' && part3.saturdayMorning !== 'no') return false;
    return true;
}
