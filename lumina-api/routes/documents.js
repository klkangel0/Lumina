const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(verifyToken);

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==============================================================
// GET /api/documents/my-data
// Returns the logged-in socio's data + their patients (with docs)
// ==============================================================
router.get('/my-data', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { socioId: true }
        });

        if (!user || !user.socioId) {
            return res.status(404).json({ message: 'Este usuario no tiene una ficha de socio vinculada.' });
        }

        const socio = await prisma.socio.findUnique({
            where: { id: user.socioId },
            include: {
                patients: {
                    select: {
                        id: true, name: true, lastName: true,
                        docMedical: true, docDisability: true, docSchool: true, docId: true
                    }
                }
            }
        });

        res.json({ socio });
    } catch (error) {
        console.error("Error fetching documents data:", error);
        res.status(500).json({ message: 'Error al cargar los datos.' });
    }
});

// ==============================================================
// POST /api/documents/socio/:field
// ==============================================================
const validSocioFields = ['docId', 'docSepa', 'docFamilyBook', 'docPhoto'];

router.post('/socio/:field', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se ha recibido ningún archivo.' });
        
        const field = req.params.field;
        if (!validSocioFields.includes(field)) {
            return res.status(400).json({ message: 'Campo de documento no válido.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { socioId: true }
        });
        if (!user?.socioId) return res.status(403).json({ message: 'Sin ficha de socio vinculada.' });

        const filePath = `/uploads/documents/${req.file.filename}`;

        await prisma.socio.update({
            where: { id: user.socioId },
            data: {
                [field]: filePath,
                ...(field === 'docSepa' ? { sepaMandateSignedAt: new Date() } : {}),
            },
        });

        res.json({ message: 'Documento subido correctamente.', documentPath: filePath });
    } catch (error) {
        console.error("Error uploading socio document:", error);
        res.status(500).json({ message: 'Error al subir el documento.' });
    }
});

// ==============================================================
// POST /api/documents/patient/:patientId/:field
// ==============================================================
const validPatientFields = ['docMedical', 'docDisability', 'docSchool', 'docId'];

router.post('/patient/:patientId/:field', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se ha recibido ningún archivo.' });

        const { patientId, field } = req.params;
        if (!validPatientFields.includes(field)) {
            return res.status(400).json({ message: 'Campo de documento no válido.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { socioId: true }
        });
        const patient = await prisma.patient.findUnique({ where: { id: patientId } });

        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
        if (req.user.role !== 'ADMIN' && patient.socioId !== user.socioId) {
            return res.status(403).json({ message: 'No tienes permiso para subir documentos a este paciente.' });
        }

        const filePath = `/uploads/documents/${req.file.filename}`;

        await prisma.patient.update({
            where: { id: patientId },
            data: { [field]: filePath }
        });

        res.json({ message: 'Documento subido correctamente.', documentPath: filePath });
    } catch (error) {
        console.error("Error uploading patient document:", error);
        res.status(500).json({ message: 'Error al subir el documento.' });
    }
});

module.exports = router;
