const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

// GET /api/inventario — list all inventory items with filters
router.get('/', async (req, res) => {
    try {
        const { search, type, status, delegationId } = req.query;

        const where = {};
        if (type && type !== 'Todos los tipos') {
            where.type = type;
        }
        if (status && status !== 'Todos los estados') {
            where.status = status;
        }
        if (delegationId && delegationId !== 'TODAS') {
            where.delegationId = parseInt(delegationId);
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { serialNumber: { contains: search } },
                { type: { contains: search } }
            ];
        }

        const items = await prisma.inventoryItem.findMany({
            where,
            include: {
                delegation: { select: { name: true, color: true } },
                socio: { select: { name: true, lastName: true, memberCode: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error al cargar el inventario.' });
    }
});

// GET /api/inventario/:id — get single item detail
router.get('/:id', async (req, res) => {
    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: req.params.id },
            include: {
                delegation: true,
                socio: true
            }
        });
        if (!item) return res.status(404).json({ message: 'Artículo no encontrado.' });
        res.json(item);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ message: 'Error al cargar el artículo.' });
    }
});

// POST /api/inventario — create new item
router.post('/', async (req, res) => {
    try {
        const { name, type, group, serialNumber, status, assignmentType, delegationId, socioId, locationDetail, deliveryDate, description } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'El nombre y el tipo son obligatorios.' });
        }

        const item = await prisma.inventoryItem.create({
            data: {
                name: name.trim(),
                type: type.trim(),
                group: group || 'ADMINISTRATIVO',
                serialNumber: serialNumber?.trim() || null,
                status: status || 'DISPONIBLE',
                assignmentType: assignmentType || 'SEDE',
                delegationId: delegationId ? parseInt(delegationId) : null,
                socioId: socioId ? parseInt(socioId) : null,
                locationDetail: locationDetail?.trim() || null,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                description: description?.trim() || null
            }
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ message: 'Error al crear el artículo.' });
    }
});

// PUT /api/inventario/:id — update item
router.put('/:id', async (req, res) => {
    try {
        const { name, type, group, serialNumber, status, assignmentType, delegationId, socioId, locationDetail, deliveryDate, description } = req.body;

        const item = await prisma.inventoryItem.update({
            where: { id: req.params.id },
            data: {
                name: name.trim(),
                type: type.trim(),
                group: group || 'ADMINISTRATIVO',
                serialNumber: serialNumber?.trim() || null,
                status: status || 'DISPONIBLE',
                assignmentType: assignmentType || 'SEDE',
                delegationId: delegationId ? parseInt(delegationId) : null,
                socioId: socioId ? parseInt(socioId) : null,
                locationDetail: locationDetail?.trim() || null,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                description: description?.trim() || null
            }
        });

        res.json(item);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Error al actualizar el artículo.' });
    }
});

// DELETE /api/inventario/:id — delete item
router.delete('/:id', async (req, res) => {
    try {
        await prisma.inventoryItem.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Artículo eliminado correctamente.' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Error al eliminar el artículo.' });
    }
});

module.exports = router;
