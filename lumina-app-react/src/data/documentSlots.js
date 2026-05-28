/** Tipos de documento subidos en "Mis documentos" (tutor y pacientes). */

export const SOCIO_DOCS = [
    { id: 'docId', label: 'DNI / NIE', icon: '🪪', description: 'Documento de identidad del titular (anverso y reverso).' },
    { id: 'docSepa', label: 'Mandato SEPA', icon: '🏦', description: 'Autorización de domiciliación bancaria.' },
    { id: 'docFamilyBook', label: 'Libro de Familia', icon: '📖', description: 'Copia del libro de familia o documento equivalente.' },
    { id: 'docPhoto', label: 'Foto Carnet', icon: '📸', description: 'Fotografía reciente tamaño carnet.' },
];

export const PATIENT_DOCS = [
    { id: 'docId', label: 'DNI / NIE del hijo/a', icon: '🪪', description: 'Documento de identidad (si dispone de él).' },
    { id: 'docMedical', label: 'Informe médico', icon: '🏥', description: 'Informe o diagnóstico médico oficial.' },
    { id: 'docDisability', label: 'Certificado discapacidad', icon: '📋', description: 'Resolución del grado de discapacidad.' },
    { id: 'docSchool', label: 'Informe escolar', icon: '🏫', description: 'Informe psicopedagógico o de adaptación escolar.' },
];
