const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const workersUploadDir = path.join(__dirname, '../uploads/workers');
if (!fs.existsSync(workersUploadDir)){
    fs.mkdirSync(workersUploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, workersUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, 'worker-' + uniqueSuffix + '-' + sanitizeName);
    }
});
const upload = multer({ storage: storage });

// Multer middleware setup for the allowed files
const uploadMiddleware = upload.fields([
    { name: 'contractFile', maxCount: 1 },
    { name: 'lopdFile', maxCount: 1 },
    { name: 'dniFile', maxCount: 1 },
    { name: 'extraFile1', maxCount: 1 },
    { name: 'extraFile2', maxCount: 1 },
    { name: 'extraFile3', maxCount: 1 }
]);


// GET /api/workers — List all workers
router.get('/', verifyToken, async (req, res) => {
    try {
        const workers = await prisma.worker.findMany({
            orderBy: { name: 'asc' }
        });
        
        // Transform the JSON string 'tags' back to Array for the frontend
        const parsedWorkers = workers.map(w => ({
            ...w,
            tags: w.tags ? JSON.parse(w.tags) : []
        }));
        
        res.json(parsedWorkers);
    } catch (error) {
        console.error("Error fetching workers:", error);
        res.status(500).json({ message: 'Error interno al cargar trabajadores.' });
    }
});


// POST /api/workers — Create a new worker
router.post('/', verifyToken, uploadMiddleware, async (req, res) => {
    try {
        const {
            name, dni, email, address, jobPosition, customJobType, tags
        } = req.body;

        if (!name || !dni || !jobPosition) {
            return res.status(400).json({ message: 'Nombre, DNI y Cargo son obligatorios.' });
        }
        if (!email || !String(email).trim() || !address || !String(address).trim()) {
            return res.status(400).json({ message: 'Email y dirección particular son obligatorios.' });
        }

        if (!req.files || !req.files['contractFile']?.[0] || !req.files['lopdFile']?.[0] || !req.files['dniFile']?.[0]) {
            return res.status(400).json({ message: 'Debe adjuntar los tres documentos obligatorios: Contrato, LOPD y DNI escaneado.' });
        }

        // Verify DNI uniqueness
        const existingWorker = await prisma.worker.findUnique({ where: { dni } });
        if (existingWorker) {
            return res.status(400).json({ message: 'Ya existe un trabajador registrado con este DNI.' });
        }

        // Handle uploaded files paths
        let contractFilePath = null;
        let lopdFilePath = null;
        let dniFilePath = null;
        let extraFile1Path = null;
        let extraFile2Path = null;
        let extraFile3Path = null;

        if (req.files) {
            if (req.files['contractFile']) contractFilePath = `/uploads/workers/${req.files['contractFile'][0].filename}`;
            if (req.files['lopdFile']) lopdFilePath = `/uploads/workers/${req.files['lopdFile'][0].filename}`;
            if (req.files['dniFile']) dniFilePath = `/uploads/workers/${req.files['dniFile'][0].filename}`;
            if (req.files['extraFile1']) extraFile1Path = `/uploads/workers/${req.files['extraFile1'][0].filename}`;
            if (req.files['extraFile2']) extraFile2Path = `/uploads/workers/${req.files['extraFile2'][0].filename}`;
            if (req.files['extraFile3']) extraFile3Path = `/uploads/workers/${req.files['extraFile3'][0].filename}`;
        }

        const worker = await prisma.worker.create({
            data: {
                name: name.trim(),
                dni: dni.trim().toUpperCase(),
                email: email ? email.trim() : null,
                address: address ? address.trim() : null,
                jobPosition: jobPosition.trim(),
                customJobType: customJobType ? customJobType.trim() : null,
                tags: tags || "[]", // the parsed JSON string from formData
                contractFile: contractFilePath,
                lopdFile: lopdFilePath,
                dniFile: dniFilePath,
                extraFile1: extraFile1Path,
                extraFile2: extraFile2Path,
                extraFile3: extraFile3Path
            }
        });

        res.status(201).json({ success: true, message: 'Trabajador registrado exitosamente.', worker });
    } catch (error) {
        console.error('Error creating worker:', error);
        res.status(500).json({ message: 'No se pudo registrar el trabajador: ' + error.message });
    }
});


// PUT /api/workers/:id — Update a worker
router.put('/:id', verifyToken, uploadMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const {
            name, dni, email, address, jobPosition, customJobType, tags
        } = req.body;

        if (!name || !dni || !jobPosition) {
            return res.status(400).json({ message: 'Nombre, DNI y Cargo son obligatorios.' });
        }
        if (!email || !String(email).trim() || !address || !String(address).trim()) {
            return res.status(400).json({ message: 'Email y dirección particular son obligatorios.' });
        }

        // Check if DNI exist and is not the current user
        const existingWorker = await prisma.worker.findUnique({ where: { dni } });
        if (existingWorker && existingWorker.id !== id) {
            return res.status(400).json({ message: 'El DNI introducido pertenece a otro trabajador.' });
        }

        const currentWorker = await prisma.worker.findUnique({ where: { id } });
        if (!currentWorker) return res.status(404).json({ message: 'Trabajador no encontrado.' });

        // Update files ONLY if new ones are provided
        let contractFilePath = currentWorker.contractFile;
        let lopdFilePath = currentWorker.lopdFile;
        let dniFilePath = currentWorker.dniFile;
        let extraFile1Path = currentWorker.extraFile1;
        let extraFile2Path = currentWorker.extraFile2;
        let extraFile3Path = currentWorker.extraFile3;

        if (req.files) {
            if (req.files['contractFile']) contractFilePath = `/uploads/workers/${req.files['contractFile'][0].filename}`;
            if (req.files['lopdFile']) lopdFilePath = `/uploads/workers/${req.files['lopdFile'][0].filename}`;
            if (req.files['dniFile']) dniFilePath = `/uploads/workers/${req.files['dniFile'][0].filename}`;
            if (req.files['extraFile1']) extraFile1Path = `/uploads/workers/${req.files['extraFile1'][0].filename}`;
            if (req.files['extraFile2']) extraFile2Path = `/uploads/workers/${req.files['extraFile2'][0].filename}`;
            if (req.files['extraFile3']) extraFile3Path = `/uploads/workers/${req.files['extraFile3'][0].filename}`;
        }

        if (!contractFilePath || !lopdFilePath || !dniFilePath) {
            return res.status(400).json({ message: 'La ficha debe incluir Contrato, LOPD y DNI (ya guardados o nuevos archivos).' });
        }

        const updatedWorker = await prisma.worker.update({
            where: { id },
            data: {
                name: name.trim(),
                dni: dni.trim().toUpperCase(),
                email: email ? email.trim() : null,
                address: address ? address.trim() : null,
                jobPosition: jobPosition.trim(),
                customJobType: customJobType ? customJobType.trim() : null,
                tags: tags || "[]",
                contractFile: contractFilePath,
                lopdFile: lopdFilePath,
                dniFile: dniFilePath,
                extraFile1: extraFile1Path,
                extraFile2: extraFile2Path,
                extraFile3: extraFile3Path
            }
        });

        res.json({ success: true, message: 'Ficha de trabajador actualizada.', worker: updatedWorker });
    } catch (error) {
        console.error('Error updating worker:', error);
        res.status(500).json({ message: 'No se pudo actualizar la información.' });
    }
});


// DELETE /api/workers/:id — Delete a worker
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        // fetch first to physically remove files if desired
        const currentWorker = await prisma.worker.findUnique({ where: { id } });
        
        if (currentWorker) {
            const filesToDelete = [currentWorker.contractFile, currentWorker.lopdFile, currentWorker.dniFile, currentWorker.extraFile1, currentWorker.extraFile2, currentWorker.extraFile3];
            filesToDelete.forEach(filePath => {
                if(filePath) {
                    const absolutePath = path.join(__dirname, '..', filePath);
                    if (fs.existsSync(absolutePath)) {
                        fs.unlinkSync(absolutePath);
                    }
                }
            });
        }

        await prisma.worker.delete({ where: { id } });
        res.json({ success: true, message: 'Ficha del trabajador eliminada y archivos purgados correctamente.' });
    } catch (error) {
        console.error('Error deleting worker:', error);
        res.status(500).json({ message: 'No se pudo eliminar el trabajador.' });
    }
});

module.exports = router;
