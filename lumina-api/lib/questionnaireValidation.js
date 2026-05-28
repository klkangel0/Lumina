/**
 * Validación del formulario de alta de socio (postulador).
 * Listas y reglas según lumina_nuevos_apartados.md
 */

const MUNICIPIOS_ANCLADOS = ['Martorell', 'Abrera', 'Esparreguera', 'Olesa de Montserrat'];

const MUNICIPIOS_RESTO = [
    'Begues',
    'Castelldefels',
    'Castellví de Rosanes',
    'Cervelló',
    'Collbató',
    'Corbera de Llobregat',
    "Cornellà de Llobregat",
    'El Papiol',
    'El Prat de Llobregat',
    'Gavà',
    'Gelida',
    "L'Hospitalet de Llobregat",
    'Molins de Rei',
    'Pallejà',
    'Sant Andreu de la Barca',
    'Sant Boi de Llobregat',
    'Sant Climent de Llobregat',
    'Sant Esteve Sesrovires',
    'Sant Feliu de Llobregat',
    'Sant Joan Despí',
    'Sant Just Desvern',
    'Sant Vicenç dels Horts',
    'Santa Coloma de Cervelló',
    'Torrelles de Llobregat',
    'Vallirana',
    'Viladecans',
];

const ALL_MUNICIPIOS = [...MUNICIPIOS_ANCLADOS, ...MUNICIPIOS_RESTO];

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

/** Datos de paciente: campos desglosados o formato antiguo (patientFullName) */
function patientPart1Complete(part1) {
    if (!part1) return false;
    if (isNonEmptyString(part1.patientName) && isNonEmptyString(part1.patientFirstSurname)) {
        return isNonEmptyString(part1.patientSecondSurname);
    }
    return isNonEmptyString(part1.patientFullName);
}

/** Tutores: madre y padre por separado, o formato antiguo (parentsFullName) */
function parentsPart1Complete(part1) {
    if (!part1) return false;
    if (isNonEmptyString(part1.parentMotherName) && isNonEmptyString(part1.parentFatherName)) return true;
    return isNonEmptyString(part1.parentsFullName);
}

function part1FieldErrors(part1) {
    const e = [];
    if (!part1 || typeof part1 !== 'object') {
        return ['Todos los campos de la Parte 1 son obligatorios.'];
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
    if (!isNonEmptyString(part1.municipio) || !ALL_MUNICIPIOS.includes(part1.municipio.trim())) e.push('Municipio válido del Baix Llobregat');
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

function infantAnswersComplete(answers) {
    if (!answers || typeof answers !== 'object') return false;
    for (let i = 1; i <= 39; i++) {
        const k = String(i);
        const v = answers[k];
        if (!isNonEmptyValue(v)) return false;
    }
    return true;
}

function adolescentAnswersComplete(answers) {
    if (!answers || typeof answers !== 'object') return false;
    for (let i = 1; i <= 30; i++) {
        const k = String(i);
        const v = answers[k];
        if (!isNonEmptyValue(v)) return false;
    }
    return true;
}

function part3Complete(part3) {
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

/**
 * @returns {{ ok: boolean, missingSections: string[] }}
 */
function evaluateQuestionnaireCompleteness(questionnaire) {
    const missingSections = [];

    const part1 = questionnaire?.part1;
    const p1Errors = part1FieldErrors(part1);
    if (p1Errors.length > 0) {
        missingSections.push('Formulario de Datos de Contacto (Parte 1)');
    }

    const age = parseAge(part1);
    if (age !== null && age >= 1 && age <= 18) {
        const p2 = questionnaire?.part2;
        const answers = p2?.answers;
        if (age <= 12) {
            if (!infantAnswersComplete(answers)) {
                missingSections.push('Cuestionario infantil de Psicología y Logopedia (Parte 2)');
            }
        } else {
            if (!adolescentAnswersComplete(answers)) {
                missingSections.push('Cuestionario adolescente de Psicología y Logopedia (Parte 2)');
            }
            if (!part3Complete(questionnaire?.part3)) {
                missingSections.push('Servicios solicitados y disponibilidad horaria (Parte 3)');
            }
        }
    } else if (p1Errors.length === 0 && age !== null && (age < 1 || age > 18)) {
        missingSections.push('Edad del paciente fuera de rango (debe ser entre 1 y 18 años para este formulario)');
    }

    return {
        ok: missingSections.length === 0,
        missingSections,
    };
}

/**
 * Valida que exista delegationId en BD (llamar con prisma aparte).
 */
module.exports = {
    ALL_MUNICIPIOS,
    MUNICIPIOS_ANCLADOS,
    MUNICIPIOS_RESTO,
    SERVICE_IDS,
    parseAge,
    patientPart1Complete,
    parentsPart1Complete,
    part1FieldErrors,
    evaluateQuestionnaireCompleteness,
    infantAnswersComplete,
    adolescentAnswersComplete,
    part3Complete,
};
