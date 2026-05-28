const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(verifyToken);

// GET /api/delegaciones — list all delegations
router.get('/', async (req, res) => {
    try {
        const delegations = await prisma.delegation.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(delegations);
    } catch (error) {
        console.error('Error loading delegations:', error);
        res.status(500).json({ message: 'Error al cargar las delegaciones.' });
    }
});

// GET /api/delegaciones/:id — single delegation
router.get('/:id', async (req, res) => {
    try {
        const delegation = await prisma.delegation.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!delegation) return res.status(404).json({ message: 'Delegación no encontrada.' });
        res.json(delegation);
    } catch (error) {
        console.error('Error loading delegation:', error);
        res.status(500).json({ message: 'Error al cargar la delegación.' });
    }
});

// POST /api/delegaciones — create delegation
router.post('/', async (req, res) => {
    try {
        const { name, shortName, address, city, phone, email, color } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

        const existing = await prisma.delegation.findUnique({ where: { name } });
        if (existing) return res.status(400).json({ message: 'Ya existe una delegación con ese nombre.' });

        const delegation = await prisma.delegation.create({
            data: {
                name: name.trim(),
                shortName: shortName ? shortName.trim().toUpperCase() : null,
                address: address ? address.trim() : null,
                city: city ? city.trim() : null,
                phone: phone ? phone.trim() : null,
                email: email ? email.trim() : null,
                color: color || '#6E9EFF',
            }
        });
        res.status(201).json({ message: 'Delegación creada correctamente.', delegation });
    } catch (error) {
        console.error('Error creating delegation:', error);
        res.status(500).json({ message: 'Error al crear la delegación.' });
    }
});

// PUT /api/delegaciones/:id — update delegation
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, shortName, address, city, phone, email, color, active } = req.body;

        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

        // Check name uniqueness (exclude self)
        const existing = await prisma.delegation.findFirst({
            where: { name, id: { not: id } }
        });
        if (existing) return res.status(400).json({ message: 'Ya existe otra delegación con ese nombre.' });

        const delegation = await prisma.delegation.update({
            where: { id },
            data: {
                name: name.trim(),
                shortName: shortName ? shortName.trim().toUpperCase() : null,
                address: address ? address.trim() : null,
                city: city ? city.trim() : null,
                phone: phone ? phone.trim() : null,
                email: email ? email.trim() : null,
                color: color || '#6E9EFF',
                active: active !== undefined ? active : true,
            }
        });
        res.json({ message: 'Delegación actualizada correctamente.', delegation });
    } catch (error) {
        console.error('Error updating delegation:', error);
        res.status(500).json({ message: 'Error al actualizar la delegación.' });
    }
});

// DELETE /api/delegaciones/:id — delete (only non-system)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const delegation = await prisma.delegation.findUnique({ where: { id } });
        if (!delegation) return res.status(404).json({ message: 'Delegación no encontrada.' });
        if (delegation.isSystem) return res.status(403).json({ message: 'No se pueden eliminar las delegaciones del sistema.' });

        await prisma.delegation.delete({ where: { id } });
        res.json({ message: 'Delegación eliminada correctamente.' });
    } catch (error) {
        console.error('Error deleting delegation:', error);
        res.status(500).json({ message: 'Error al eliminar la delegación.' });
    }
});

module.exports = router;
