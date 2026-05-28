const SEP = ';';

function escapeCell(val) {
    const s = val === null || val === undefined ? '' : String(val);
    if (/[;\n\r"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function formatJoinDate(d) {
    if (!d) return '';
    try {
        return new Date(d).toISOString().slice(0, 10);
    } catch {
        return '';
    }
}

function teaLevelLabel(v) {
    const m = { nivel1: 'Nivel 1', nivel2: 'Nivel 2', nivel3: 'Nivel 3', no_se: 'No lo sé' };
    return m[v] || v || '';
}

function statusLabel(s) {
    if (s === 'ACTIVE') return 'Activo';
    if (s === 'INACTIVE') return 'Inactivo';
    if (s === 'PENDING') return 'Pendiente';
    return s || '';
}

function patientFullFromP1(p1) {
    if (!p1) return '';
    if (p1.patientName || p1.patientFirstSurname || p1.patientSecondSurname) {
        return [p1.patientName, p1.patientFirstSurname, p1.patientSecondSurname].filter((x) => x && String(x).trim()).join(' ');
    }
    return p1.patientFullName || '';
}

function parentsCombinedFromP1(p1) {
    if (!p1) return '';
    if (p1.parentMotherName || p1.parentFatherName) {
        const m = p1.parentMotherName || '';
        const f = p1.parentFatherName || '';
        return [m, f].filter(Boolean).join(' / ');
    }
    return p1.parentsFullName || '';
}

/** Una fila CSV por cada paciente del socio */
export function buildSocioCsvRows(socio) {
    const p1 = socio.questionnaire?.part1;
    const del = socio.delegation?.name || '';
    const base = {
        memberCode: socio.memberCode,
        patientName: p1?.patientName || '',
        patientFirstSurname: p1?.patientFirstSurname || '',
        patientSecondSurname: p1?.patientSecondSurname || '',
        patientFullLegacy: p1?.patientFullName || '',
        patientFullComputed: patientFullFromP1(p1),
        age: p1?.patientAge != null ? String(p1.patientAge) : '',
        parentMother: p1?.parentMotherName || '',
        parentFather: p1?.parentFatherName || '',
        parentsLegacy: p1?.parentsFullName || '',
        parentsSummary: parentsCombinedFromP1(p1),
        municipio: p1?.municipio || socio.municipio || '',
        delegation: del,
        phone: p1?.phone || socio.phone || '',
        email: p1?.email || socio.email || '',
        tea: p1?.teaDiagnosis === 'si' ? 'Sí' : p1?.teaDiagnosis === 'no' ? 'No' : '',
        teaLevel: p1?.teaDiagnosis === 'si' ? teaLevelLabel(p1.teaLevel) : '',
        joinDate: formatJoinDate(socio.joinDate),
        status: statusLabel(socio.status),
    };

    const patients = socio.patients?.length ? socio.patients : [null];
    return patients.map((patient) => {
        const row = {
            ...base,
            patientRecordName: patient ? `${patient.name || ''} ${patient.lastName || ''}`.trim() : '',
            patientBirth: patient?.birthDate ? formatJoinDate(patient.birthDate) : '',
        };
        return [
            row.memberCode,
            row.patientFullComputed || row.patientRecordName,
            row.patientName,
            row.patientFirstSurname,
            row.patientSecondSurname,
            row.age,
            row.parentMother,
            row.parentFather,
            row.parentsSummary || row.parentsLegacy,
            row.municipio,
            row.delegation,
            row.phone,
            row.email,
            row.tea,
            row.teaLevel,
            row.joinDate,
            row.status,
        ].map(escapeCell);
    });
}

const HEADERS = [
    'Código de Socio',
    'Nombre completo paciente',
    'Nombre paciente',
    'Primer apellido paciente',
    'Segundo apellido paciente',
    'Edad',
    'Madre / tutora',
    'Padre / tutor',
    'Tutores (resumen)',
    'Municipio',
    'Delegación asignada',
    'Teléfono',
    'Email',
    'Diagnóstico TEA',
    'Nivel TEA',
    'Fecha de Alta',
    'Estado',
];

export function downloadSociosCsv(socios, filenamePrefix = 'socios_lumina') {
    const lines = [HEADERS.join(SEP)];
    for (const socio of socios) {
        for (const cells of buildSocioCsvRows(socio)) {
            lines.push(cells.join(SEP));
        }
    }
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filenamePrefix}_${d}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
