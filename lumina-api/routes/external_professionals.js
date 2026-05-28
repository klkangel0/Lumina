const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Protect all routes with authentication
router.use(verifyToken);

// ---------------------------------------------------
// 1. GET ALL External Professionals
// ---------------------------------------------------
router.get('/', checkPermission('profesionales_externos', 'canView'), async (req, res) => {
    try {
        const professionals = await prisma.externalProfessional.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.json(professionals);
    } catch (error) {
        console.error('Error fetching external professionals:', error);
        res.status(500).json({ message: 'Error al cargar los profesionales externos.' });
    }
});

// ---------------------------------------------------
// 2. CREATE A Profesional Externo
// ---------------------------------------------------
router.post('/', checkPermission('profesionales_externos', 'canCreate'), async (req, res) => {
    try {
        const {
            name, lastName, dni, collegiateNumber,
            specialty, collaborationType, hourlyRate, company,
            email, phone, notes
        } = req.body;

        if (!name || !lastName || !specialty || !collaborationType) {
            return res.status(400).json({ message: 'Nombre, apellidos, especialidad y tipo de colaboración son obligatorios.' });
        }

        const newProfessional = await prisma.externalProfessional.create({
            data: {
                name: name.trim(),
                lastName: lastName.trim(),
                dni: dni ? dni.trim() : null,
                collegiateNumber: collegiateNumber ? collegiateNumber.trim() : null,
                specialty: specialty.trim(),
                collaborationType: collaborationType.trim(),
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                company: company ? company.trim() : null,
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                notes: notes != null && String(notes).trim() !== '' ? String(notes).trim() : null,
            }
        });

        res.status(201).json({
            success: true,
            message: 'Profesional externo creado correctamente',
            professional: newProfessional
        });
    } catch (error) {
        console.error("Error creating external professional:", error);
        res.status(500).json({ message: 'Error al crear el profesional externo.' });
    }
});

// ---------------------------------------------------
// 3. EDIT A Profesional Externo
// ---------------------------------------------------
router.put('/:id', checkPermission('profesionales_externos', 'canEdit'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, lastName, dni, collegiateNumber,
            specialty, collaborationType, hourlyRate, company,
            email, phone, notes
        } = req.body;

        if (!name || !lastName || !specialty || !collaborationType) {
            return res.status(400).json({ message: 'Nombre, apellidos, especialidad y tipo de colaboración son obligatorios.' });
        }

        const updatedProfessional = await prisma.externalProfessional.update({
            where: { id },
            data: {
                name: name.trim(),
                lastName: lastName.trim(),
                dni: dni ? dni.trim() : null,
                collegiateNumber: collegiateNumber ? collegiateNumber.trim() : null,
                specialty: specialty.trim(),
                collaborationType: collaborationType.trim(),
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                company: company ? company.trim() : null,
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                notes: notes != null && String(notes).trim() !== '' ? String(notes).trim() : null,
            }
        });

        res.json({
            success: true,
            message: 'Profesional externo actualizado correctamente',
            professional: updatedProfessional
        });
    } catch (error) {
        console.error("Error updating external professional:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Profesional externo no encontrado.' });
        }
        res.status(500).json({ message: 'Error al actualizar el profesional externo.' });
    }
});

// ---------------------------------------------------
// 4. DELETE A Profesional Externo
// ---------------------------------------------------
router.delete('/:id', checkPermission('profesionales_externos', 'canDelete'), async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.externalProfessional.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Profesional externo eliminado correctamente'
        });
    } catch (error) {
        console.error("Error deleting external professional:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Profesional externo no encontrado.' });
        }
        res.status(500).json({ message: 'Error al eliminar el profesional externo.' });
    }
});

module.exports = router;
