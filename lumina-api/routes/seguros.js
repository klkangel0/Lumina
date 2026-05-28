const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

function deriveStatus(expiryDate) {
    return new Date(expiryDate) < new Date() ? 'CADUCADO' : 'ACTIVO';
}

router.get('/', async (req, res) => {
    try {
        const { status, q } = req.query;
        const where = {};
        if (status && ['ACTIVO', 'CADUCADO'].includes(status)) where.status = status;
        if (q) {
            const query = String(q).trim();
            where.OR = [
                { name: { contains: query } },
                { purpose: { contains: query } },
            ];
        }

        const seguros = await prisma.seguro.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        });
        res.json(seguros);
    } catch (error) {
        console.error('Error loading seguros:', error);
        res.status(500).json({ message: 'Error al cargar seguros.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const seguro = await prisma.seguro.findUnique({
            where: { id: req.params.id },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        if (!seguro) return res.status(404).json({ message: 'Seguro no encontrado.' });
        res.json(seguro);
    } catch (error) {
        console.error('Error loading seguro:', error);
        res.status(500).json({ message: 'Error al cargar el seguro.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, purpose, validFrom, validTo, expiryDate, amount } = req.body || {};
        if (!name || !purpose || !validFrom || !expiryDate) {
            return res.status(400).json({
                message: 'Nombre, finalidad, fecha de validez inicial y fecha de caducidad son obligatorios.',
            });
        }

        const status = deriveStatus(expiryDate);
        const seguro = await prisma.seguro.create({
            data: {
                name: String(name).trim(),
                purpose: String(purpose).trim(),
                validFrom: new Date(validFrom),
                validTo: validTo ? new Date(validTo) : null,
                expiryDate: new Date(expiryDate),
                amount: amount !== '' && amount != null ? parseFloat(amount) : null,
                status,
                userId: req.user.id,
            },
        });
        res.status(201).json({ message: 'Seguro creado correctamente.', seguro });
    } catch (error) {
        console.error('Error creating seguro:', error);
        res.status(500).json({ message: 'Error al crear el seguro.' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, purpose, validFrom, validTo, expiryDate, amount } = req.body || {};
        if (!name || !purpose || !validFrom || !expiryDate) {
            return res.status(400).json({
                message: 'Nombre, finalidad, fecha de validez inicial y fecha de caducidad son obligatorios.',
            });
        }
        const status = deriveStatus(expiryDate);
        const seguro = await prisma.seguro.update({
            where: { id: req.params.id },
            data: {
                name: String(name).trim(),
                purpose: String(purpose).trim(),
                validFrom: new Date(validFrom),
                validTo: validTo ? new Date(validTo) : null,
                expiryDate: new Date(expiryDate),
                amount: amount !== '' && amount != null ? parseFloat(amount) : null,
                status,
            },
        });
        res.json({ message: 'Seguro actualizado correctamente.', seguro });
    } catch (error) {
        console.error('Error updating seguro:', error);
        res.status(500).json({ message: 'Error al actualizar el seguro.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.seguro.delete({ where: { id: req.params.id } });
        res.json({ message: 'Seguro eliminado.' });
    } catch (error) {
        console.error('Error deleting seguro:', error);
        res.status(500).json({ message: 'Error al eliminar el seguro.' });
    }
});

module.exports = router;
