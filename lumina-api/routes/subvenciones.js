const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Multer storage for justification documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../uploads/subvenciones');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const idPart = req.params.id || 'new';
        cb(null, `subvencion-${idPart}-${uniqueSuffix}${ext}`);
    }
});
const upload = multer({ storage });

// All routes require authentication
router.use(verifyToken);

// GET /api/subvenciones - list with filters
router.get('/', async (req, res) => {
    try {
        const { delegationId, status } = req.query;

        const whereClause = {};
        if (delegationId) whereClause.delegationId = parseInt(delegationId);
        if (status) whereClause.status = status;

        const subvenciones = await prisma.subvencion.findMany({
            where: whereClause,
            include: {
                delegation: { select: { id: true, name: true, color: true } },
                user: { select: { id: true, name: true } },
                attachments: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(subvenciones);
    } catch (error) {
        console.error('Error loading subvenciones:', error);
        res.status(500).json({ message: 'Error al cargar las subvenciones.' });
    }
});

// GET /api/subvenciones/:id - get single
router.get('/:id', async (req, res) => {
    try {
        const subvencion = await prisma.subvencion.findUnique({
            where: { id: req.params.id },
            include: {
                delegation: true,
                user: true,
                attachments: { orderBy: { createdAt: 'desc' } },
            }
        });
        if (!subvencion) return res.status(404).json({ message: 'Subvención no encontrada.' });
        res.json(subvencion);
    } catch (error) {
        res.status(500).json({ message: 'Error interno.' });
    }
});

// POST /api/subvenciones - create
router.post('/', upload.array('documentos', 12), async (req, res) => {
    try {
        const { name, description, amount, delegationId, status, deadlineDate } = req.body;

        if (!name || !delegationId) {
            return res.status(400).json({ message: 'El nombre y la delegación son obligatorios.' });
        }

        let subvencion = await prisma.subvencion.create({
            data: {
                name: name.trim(),
                description: description?.trim(),
                amount: amount ? parseFloat(amount) : null,
                delegationId: parseInt(delegationId),
                status: status || 'SOLICITADO',
                deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
                userId: req.user.id // Linked to logged-in user
            }
        });

        const files = req.files || [];
        if (files.length) {
            const now = new Date();
            await prisma.subvencionAttachment.createMany({
                data: files.map((f) => ({
                    subvencionId: subvencion.id,
                    filePath: `/uploads/subvenciones/${f.filename}`,
                    fileName: f.originalname,
                    mimeType: f.mimetype,
                    fileSize: f.size,
                    kind: 'SOPORTE',
                })),
            });
            subvencion = await prisma.subvencion.update({
                where: { id: subvencion.id },
                data: {
                    docJustification: `/uploads/subvenciones/${files[0].filename}`,
                    status: 'JUSTIFICADO',
                    justifiedDate: now,
                },
            });
        }

        const full = await prisma.subvencion.findUnique({
            where: { id: subvencion.id },
            include: { attachments: { orderBy: { createdAt: 'desc' } } },
        });
        res.status(201).json({ message: 'Subvención creada correctamente.', subvencion: full });
    } catch (error) {
        console.error('Error creating subvencion:', error);
        res.status(500).json({ message: 'Error al crear la subvención.' });
    }
});

// PUT /api/subvenciones/:id - update details
router.put('/:id', async (req, res) => {
    try {
        const { name, description, amount, delegationId, status, deadlineDate, justifiedDate } = req.body;

        const subvencion = await prisma.subvencion.update({
            where: { id: req.params.id },
            data: {
                name: name?.trim(),
                description: description?.trim(),
                amount: amount ? parseFloat(amount) : null,
                delegationId: delegationId ? parseInt(delegationId) : undefined,
                status,
                deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
                justifiedDate: justifiedDate ? new Date(justifiedDate) : null,
            }
        });

        res.json({ message: 'Subvención actualizada correctamente.', subvencion });
    } catch (error) {
        console.error('Error updating subvencion:', error);
        res.status(500).json({ message: 'Error al actualizar.' });
    }
});

// DELETE /api/subvenciones/:id
router.delete('/:id', async (req, res) => {
    try {
        const current = await prisma.subvencion.findUnique({
            where: { id: req.params.id },
            include: { attachments: true },
        });
        if (!current) return res.status(404).json({ message: 'Subvención no encontrada.' });

        for (const att of current.attachments) {
            const absPath = path.join(__dirname, '..', att.filePath.replace(/^\/+/, ''));
            if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        }
        if (current.docJustification) {
            const legacyPath = path.join(__dirname, '..', current.docJustification.replace(/^\/+/, ''));
            if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
        }

        await prisma.subvencion.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Subvención eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar.' });
    }
});

// POST /api/subvenciones/:id/justify - upload justification document
router.post('/:id/justify', upload.array('documentos', 12), async (req, res) => {
    try {
        const id = req.params.id;

        const files = req.files || [];
        if (!files.length) {
            return res.status(400).json({ message: 'Debes seleccionar al menos un archivo para justificar.' });
        }

        await prisma.subvencionAttachment.createMany({
            data: files.map((f) => ({
                subvencionId: id,
                filePath: `/uploads/subvenciones/${f.filename}`,
                fileName: f.originalname,
                mimeType: f.mimetype,
                fileSize: f.size,
                kind: 'JUSTIFICACION',
            })),
        });

        // Update the subvencion: save file path, update status, and set justifiedDate to NOW
        const subvencion = await prisma.subvencion.update({
            where: { id },
            data: {
                docJustification: `/uploads/subvenciones/${files[0].filename}`,
                status: 'JUSTIFICADO',
                justifiedDate: new Date()
            },
            include: { attachments: { orderBy: { createdAt: 'desc' } } },
        });

        res.json({
            message: 'Subvención justificada correctamente.',
            subvencion
        });

    } catch (error) {
        console.error('Error in justification:', error);
        res.status(500).json({ message: 'Error al subir la justificación.' });
    }
});

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        const att = await prisma.subvencionAttachment.findFirst({
            where: { id: attachmentId, subvencionId: id },
        });
        if (!att) return res.status(404).json({ message: 'Adjunto no encontrado.' });

        const absPath = path.join(__dirname, '..', att.filePath.replace(/^\/+/, ''));
        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        await prisma.subvencionAttachment.delete({ where: { id: att.id } });

        const first = await prisma.subvencionAttachment.findFirst({
            where: { subvencionId: id },
            orderBy: { createdAt: 'desc' },
        });
        await prisma.subvencion.update({
            where: { id },
            data: { docJustification: first ? first.filePath : null },
        });

        res.json({ message: 'Adjunto eliminado.' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ message: 'Error al eliminar el adjunto.' });
    }
});

module.exports = router;
