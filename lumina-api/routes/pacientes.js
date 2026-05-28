const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ALL_MUNICIPIOS } = require('../lib/questionnaireValidation');

const router = express.Router();
const prisma = new PrismaClient();

const patientDelegationInclude = { delegation: true };

function canBrowseAllPatients(req) {
    if (req.user.role === 'ADMIN') return true;
    const p = req.user.permissions?.socios;
    return !!(p && (p.canView || p.canManageAll));
}

function sociosPerm(req) {
    return req.user.permissions?.socios;
}

function canViewPatientsForSocio(req, socioId) {
    if (req.user.role === 'ADMIN') return true;
    const p = sociosPerm(req);
    if (p && (p.canManageAll || p.canView || p.canEdit || p.canCreate || p.canDelete)) return true;
    if (req.user.socioId && req.user.socioId === socioId) return true;
    return false;
}

function canCreatePatientForSocio(req, socioId) {
    if (req.user.role === 'ADMIN') return true;
    const p = sociosPerm(req);
    if (p && (p.canManageAll || p.canCreate)) return true;
    if (req.user.socioId && req.user.socioId === socioId) return true;
    return false;
}

function canEditPatientForSocio(req, socioId) {
    if (req.user.role === 'ADMIN') return true;
    const p = sociosPerm(req);
    if (p && (p.canManageAll || p.canEdit)) return true;
    if (req.user.socioId && req.user.socioId === socioId) return true;
    return false;
}

function canDeletePatientForSocio(req, socioId) {
    if (req.user.role === 'ADMIN') return true;
    const p = sociosPerm(req);
    if (p && (p.canManageAll || p.canDelete)) return true;
    if (req.user.socioId && req.user.socioId === socioId) return true;
    return false;
}

// Multer config for patient documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'patients');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.fieldname + '-' + Date.now() + ext;
        cb(null, safeName);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Tipo de archivo no permitido. Usa PDF, JPG, PNG, DOC o DOCX.'));
    },
});
const docFields = upload.fields([
    { name: 'docMedical', maxCount: 1 },
    { name: 'docDisability', maxCount: 1 },
    { name: 'docSchool', maxCount: 1 },
    { name: 'docId', maxCount: 1 },
]);

router.use(verifyToken);

const patientListSelect = {
    id: true,
    patientCode: true,
    name: true,
    lastName: true,
    birthDate: true,
    gender: true,
    relationship: true,
    autismDegree: true,
    disabilityPct: true,
    specialNeeds: true,
    allergies: true,
    school: true,
    schoolYear: true,
    notes: true,
    address: true,
    municipio: true,
    delegationId: true,
    delegation: { select: { id: true, name: true, shortName: true } },
    docMedical: true,
    docDisability: true,
    docSchool: true,
    docId: true,
    createdAt: true,
    updatedAt: true,
};

// GET /api/pacientes/me — get MY patients (for logged-in socio)
router.get('/me', async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { socioId: true },
        });
        if (!user || !user.socioId) {
            return res.status(403).json({ message: 'No tienes un perfil de socio vinculado.' });
        }
        const socio = await prisma.socio.findUnique({
            where: { id: user.socioId },
            select: {
                id: true,
                name: true,
                lastName: true,
                memberCode: true,
                email: true,
                phone: true,
                delegationId: true,
                patients: { orderBy: { createdAt: 'desc' }, select: patientListSelect },
            },
        });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });
        res.json({ socio, patients: socio.patients });
    } catch (error) {
        console.error('Error fetching my patients:', error);
        res.status(500).json({ message: 'Error al cargar tus pacientes.' });
    }
});

// GET /api/pacientes/browse — staff: list all patients with filters (children only, no parent rows)
router.get('/browse', async (req, res) => {
    try {
        if (!canBrowseAllPatients(req)) {
            return res.status(403).json({ message: 'No tienes permiso para listar pacientes.' });
        }
        const delegationIdRaw = req.query.delegationId;
        const municipio = req.query.municipio ? String(req.query.municipio).trim() : '';
        const q = req.query.q ? String(req.query.q).trim() : '';

        const where = {};
        if (delegationIdRaw !== undefined && delegationIdRaw !== '' && delegationIdRaw !== 'all') {
            const id = parseInt(delegationIdRaw, 10);
            if (!Number.isNaN(id)) where.delegationId = id;
        }
        if (municipio && municipio !== 'all') {
            if (!ALL_MUNICIPIOS.includes(municipio)) {
                return res.status(400).json({ message: 'Municipio no válido.' });
            }
            where.municipio = municipio;
        }
        if (q) {
            where.OR = [
                { name: { contains: q } },
                { lastName: { contains: q } },
                { patientCode: { contains: q } },
                { address: { contains: q } },
                { socio: { name: { contains: q } } },
                { socio: { lastName: { contains: q } } },
                { socio: { memberCode: { contains: q } } },
            ];
        }

        const items = await prisma.patient.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            select: {
                ...patientListSelect,
                socio: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        memberCode: true,
                        delegationId: true,
                        delegation: { select: { id: true, name: true, shortName: true } },
                    },
                },
            },
        });
        res.json({ items });
    } catch (error) {
        console.error('Error browsing patients:', error);
        res.status(500).json({ message: 'Error al cargar el listado de pacientes.' });
    }
});

// GET /api/pacientes/detail/:id — get single patient detail (before /:socioId)
router.get('/detail/:id', async (req, res) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: req.params.id },
            include: {
                delegation: true,
                socio: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        memberCode: true,
                        delegationId: true,
                        delegation: { select: { id: true, name: true, shortName: true } },
                    },
                },
            },
        });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
        const canStaff = canBrowseAllPatients(req);
        const own = req.user.socioId && patient.socioId === req.user.socioId;
        if (!canStaff && !own) {
            return res.status(403).json({ message: 'No tienes permiso para ver este paciente.' });
        }
        res.json(patient);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ message: 'Error al cargar el paciente.' });
    }
});

// GET /api/pacientes/:socioId — get all patients for a socio
router.get('/:socioId', async (req, res) => {
    try {
        const socioId = parseInt(req.params.socioId, 10);
        if (Number.isNaN(socioId)) {
            return res.status(400).json({ message: 'Identificador de socio no válido.' });
        }
        if (!canViewPatientsForSocio(req, socioId)) {
            return res.status(403).json({ message: 'No tienes permiso para ver estos pacientes.' });
        }
        const patients = await prisma.patient.findMany({
            where: { socioId },
            orderBy: { createdAt: 'desc' },
            select: patientListSelect,
        });
        res.json(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Error al cargar pacientes.' });
    }
});

async function resolveDelegationIdForPatient(rawDelegationId, socio) {
    if (rawDelegationId === '__none__' || rawDelegationId === 'none' || rawDelegationId === 'null') {
        return null;
    }
    if (rawDelegationId === undefined || rawDelegationId === null || rawDelegationId === '') {
        return socio.delegationId ?? null;
    }
    const id = parseInt(String(rawDelegationId), 10);
    if (Number.isNaN(id)) return socio.delegationId ?? null;
    const del = await prisma.delegation.findFirst({ where: { id, active: true } });
    return del ? id : socio.delegationId ?? null;
}

// POST /api/pacientes — create a new patient (with optional documents)
router.post('/', docFields, async (req, res) => {
    try {
        const {
            socioId,
            name,
            lastName,
            birthDate,
            gender,
            relationship,
            autismDegree,
            disabilityPct,
            specialNeeds,
            allergies,
            school,
            schoolYear,
            notes,
            address,
            municipio,
            delegationId: bodyDelegationId,
        } = req.body;

        if (!socioId || !name || !lastName) {
            return res.status(400).json({ message: 'Nombre, apellidos y socio son obligatorios.' });
        }
        const addrTrim = address != null ? String(address).trim() : '';
        if (!addrTrim) {
            return res.status(400).json({ message: 'La dirección del paciente es obligatoria.' });
        }

        const socio = await prisma.socio.findUnique({ where: { id: parseInt(socioId, 10) } });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });

        if (!canCreatePatientForSocio(req, socio.id)) {
            return res.status(403).json({ message: 'No tienes permiso para crear pacientes para este socio.' });
        }

        let municipioVal = null;
        if (municipio !== undefined && municipio !== null && String(municipio).trim() !== '') {
            const m = String(municipio).trim();
            if (!ALL_MUNICIPIOS.includes(m)) return res.status(400).json({ message: 'Municipio no válido.' });
            municipioVal = m;
        }

        const delegationIdVal = await resolveDelegationIdForPatient(bodyDelegationId, socio);

        const existingPatients = await prisma.patient.count({ where: { socioId: socio.id } });
        const patientNumber = (existingPatients + 1).toString().padStart(2, '0');
        const patientCode = `${socio.memberCode}-${patientNumber}`;

        const docs = {};
        ['docMedical', 'docDisability', 'docSchool', 'docId'].forEach((field) => {
            if (req.files && req.files[field] && req.files[field][0]) {
                docs[field] = '/uploads/patients/' + req.files[field][0].filename;
            }
        });

        const patient = await prisma.patient.create({
            data: {
                patientCode,
                socioId: socio.id,
                name: name.trim(),
                lastName: lastName.trim(),
                birthDate: birthDate ? new Date(birthDate) : null,
                gender: gender || null,
                relationship: relationship || null,
                autismDegree: autismDegree || null,
                disabilityPct: disabilityPct ? parseInt(disabilityPct, 10) : null,
                specialNeeds: specialNeeds || null,
                allergies: allergies || null,
                school: school || null,
                schoolYear: schoolYear || null,
                notes: notes || null,
                address: addrTrim,
                municipio: municipioVal,
                delegationId: delegationIdVal,
                ...docs,
            },
            include: patientDelegationInclude,
        });

        res.status(201).json(patient);
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ message: 'Error al crear el paciente.' });
    }
});

// PUT /api/pacientes/:id — update patient (with optional documents)
router.put('/:id', docFields, async (req, res) => {
    try {
        const {
            name,
            lastName,
            birthDate,
            gender,
            relationship,
            autismDegree,
            disabilityPct,
            specialNeeds,
            allergies,
            school,
            schoolYear,
            notes,
            address,
            municipio,
            delegationId: bodyDelegationId,
            removeDocMedical,
            removeDocDisability,
            removeDocSchool,
            removeDocId,
        } = req.body;

        if (!name || !lastName) {
            return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
        }

        const currentPatient = await prisma.patient.findUnique({
            where: { id: req.params.id },
            include: { socio: { select: { id: true, delegationId: true } } },
        });
        if (!currentPatient) return res.status(404).json({ message: 'Paciente no encontrado.' });

        if (!canEditPatientForSocio(req, currentPatient.socioId)) {
            return res.status(403).json({ message: 'No tienes permiso para editar este paciente.' });
        }

        const addrTrim = address != null ? String(address).trim() : '';
        if (!addrTrim) {
            return res.status(400).json({ message: 'La dirección del paciente es obligatoria.' });
        }

        let municipioVal = undefined;
        if (municipio !== undefined) {
            if (municipio === null || String(municipio).trim() === '') municipioVal = null;
            else {
                const m = String(municipio).trim();
                if (!ALL_MUNICIPIOS.includes(m)) return res.status(400).json({ message: 'Municipio no válido.' });
                municipioVal = m;
            }
        }

        let delegationIdVal = undefined;
        if (bodyDelegationId !== undefined) {
            delegationIdVal = await resolveDelegationIdForPatient(bodyDelegationId, currentPatient.socio);
        }

        const docs = {};
        ['docMedical', 'docDisability', 'docSchool', 'docId'].forEach((field) => {
            if (req.files && req.files[field] && req.files[field][0]) {
                if (currentPatient[field]) {
                    const oldPath = path.join(__dirname, '..', currentPatient[field]);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                docs[field] = '/uploads/patients/' + req.files[field][0].filename;
            }
            const removeFlag = {
                docMedical: removeDocMedical,
                docDisability: removeDocDisability,
                docSchool: removeDocSchool,
                docId: removeDocId,
            };
            if (removeFlag[field] === 'true') {
                if (currentPatient[field]) {
                    const oldPath = path.join(__dirname, '..', currentPatient[field]);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                docs[field] = null;
            }
        });

        const data = {
            name: name.trim(),
            lastName: lastName.trim(),
            birthDate: birthDate ? new Date(birthDate) : null,
            gender: gender || null,
            relationship: relationship || null,
            autismDegree: autismDegree || null,
            disabilityPct: disabilityPct ? parseInt(disabilityPct, 10) : null,
            specialNeeds: specialNeeds || null,
            allergies: allergies || null,
            school: school || null,
            schoolYear: schoolYear || null,
            notes: notes || null,
            address: addrTrim,
            ...docs,
        };
        if (municipioVal !== undefined) data.municipio = municipioVal;
        if (delegationIdVal !== undefined) data.delegationId = delegationIdVal;

        const patient = await prisma.patient.update({
            where: { id: req.params.id },
            data,
            include: patientDelegationInclude,
        });

        res.json(patient);
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ message: 'Error al actualizar el paciente.' });
    }
});

// DELETE /api/pacientes/:id — delete patient (and its documents)
router.delete('/:id', async (req, res) => {
    try {
        const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
        if (!canDeletePatientForSocio(req, patient.socioId)) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar este paciente.' });
        }
        ['docMedical', 'docDisability', 'docSchool', 'docId'].forEach((field) => {
            if (patient[field]) {
                const filePath = path.join(__dirname, '..', patient[field]);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
        await prisma.patient.delete({ where: { id: req.params.id } });
        res.json({ message: 'Paciente eliminado correctamente.' });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ message: 'Error al eliminar el paciente.' });
    }
});

module.exports = router;
