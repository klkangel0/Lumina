const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const { notifyActivityEnrollment } = require('../lib/notifications');

const router = express.Router();
const prisma = new PrismaClient();

const MAX_GUESTS_PER_CATEGORY = 50;

function parseGuestCount(v) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(n, MAX_GUESTS_PER_CATEGORY);
}

// GET /api/actividades — list all activities
router.get('/', verifyToken, async (req, res) => {
    try {
        const socioId = req.user.socioId;
        const include = {
            worker: { select: { id: true, name: true, email: true } },
            _count: { select: { socios: true, patients: true } }
        };
        // Solo socios tienen socioId. Para ADMIN/WORKER sin socioId, no incluir filtros
        // con undefined (Prisma puede fallar) — el listado sigue siendo útil para gestión.
        if (socioId != null) {
            include.socios = { where: { id: socioId }, select: { id: true } };
            include.patients = {
                where: { socioId },
                select: { id: true, name: true, lastName: true, patientCode: true }
            };
            include.enrollmentDetails = {
                where: { socioId },
                select: { guestChildrenUnder18: true, guestAdults18Plus: true }
            };
        }
        const activities = await prisma.activity.findMany({
            orderBy: { startTime: 'asc' },
            include
        });

        const mappedActivities = activities.map(act => {
            const isEnrolled = socioId ? act.socios.length > 0 : false;
            const detail = socioId && act.enrollmentDetails?.[0];
            const myPatients = socioId ? act.patients : [];
            return {
                ...act,
                isEnrolled,
                myEnrollment: isEnrolled ? {
                    patients: myPatients,
                    guestChildrenUnder18: detail?.guestChildrenUnder18 ?? 0,
                    guestAdults18Plus: detail?.guestAdults18Plus ?? 0
                } : null,
                socios: undefined,
                patients: undefined,
                enrollmentDetails: undefined
            };
        });

        res.json(mappedActivities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: 'Error interno al cargar actividades.' });
    }
});

// GET /api/actividades/:id — get a specific activity with full enrollment details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const activity = await prisma.activity.findUnique({
            where: { id },
            include: {
                worker: { select: { id: true, name: true, email: true } },
                socios: {
                    select: { id: true, name: true, lastName: true, dni: true, memberCode: true },
                    orderBy: { lastName: 'asc' }
                },
                patients: {
                    select: {
                        id: true, name: true, lastName: true, patientCode: true, socioId: true
                    },
                    orderBy: { lastName: 'asc' }
                },
                enrollmentDetails: {
                    include: {
                        socio: {
                            select: { id: true, name: true, lastName: true, memberCode: true, dni: true }
                        }
                    }
                }
            }
        });

        if (!activity) {
            return res.status(404).json({ message: 'Actividad no encontrada.' });
        }

        res.json(activity);
    } catch (error) {
        console.error("Error fetching activity details:", error);
        res.status(500).json({ message: 'Error interno al cargar los detalles de la actividad.' });
    }
});

// POST /api/actividades — create a new activity
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            title, description, startTime, endTime, registrationDeadline,
            maxCapacity, location,
            organizerName, organizerPhone, organizerEmail, organizerDelegation
        } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ message: 'El título, la fecha de inicio y la fecha de fin son obligatorios.' });
        }

        const activity = await prisma.activity.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
                maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
                location: location ? location.trim() : null,
                organizerName: organizerName ? organizerName.trim() : null,
                organizerPhone: organizerPhone ? organizerPhone.trim() : null,
                organizerEmail: organizerEmail ? organizerEmail.trim() : null,
                organizerDelegation: organizerDelegation ? organizerDelegation.trim() : null,
                workerId: req.user?.id || null,
            }
        });

        res.status(201).json({ success: true, message: 'Actividad creada correctamente.', activity });
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({ message: 'No se pudo crear la actividad: ' + error.message });
    }
});

// PUT /api/actividades/:id — update an activity
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const {
            title, description, startTime, endTime, registrationDeadline,
            maxCapacity, location,
            organizerName, organizerPhone, organizerEmail, organizerDelegation
        } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ message: 'El título, la fecha de inicio y la fecha de fin son obligatorios.' });
        }

        const activity = await prisma.activity.update({
            where: { id },
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
                maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
                location: location ? location.trim() : null,
                organizerName: organizerName ? organizerName.trim() : null,
                organizerPhone: organizerPhone ? organizerPhone.trim() : null,
                organizerEmail: organizerEmail ? organizerEmail.trim() : null,
                organizerDelegation: organizerDelegation ? organizerDelegation.trim() : null,
            }
        });

        res.json({ success: true, message: 'Actividad actualizada correctamente.', activity });
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ message: 'No se pudo actualizar la actividad: ' + error.message });
    }
});

// DELETE /api/actividades/:id — delete an activity
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.activity.delete({ where: { id } });
        res.json({ success: true, message: 'Actividad eliminada correctamente.' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'No se pudo eliminar la actividad.' });
    }
});

// POST /api/actividades/:id/enroll — Socio signs up (plazas = socio + pacientes elegidos; invitados no cuentan)
router.post('/:id/enroll', verifyToken, async (req, res) => {
    try {
        const activityId = req.params.id;
        const socioId = req.user?.socioId;

        if (!socioId) {
            return res.status(403).json({ message: 'Solo los socios pueden inscribirse en las actividades.' });
        }

        let patientIds = req.body?.patientIds;
        if (!Array.isArray(patientIds)) patientIds = [];
        patientIds = [...new Set(patientIds.filter(Boolean))];

        const guestChildrenUnder18 = parseGuestCount(req.body?.guestChildrenUnder18);
        const guestAdults18Plus = parseGuestCount(req.body?.guestAdults18Plus);

        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                socios: { where: { id: socioId } },
                _count: { select: { socios: true, patients: true } }
            }
        });

        if (!activity) return res.status(404).json({ message: 'Actividad no encontrada.' });

        if (activity.socios.length > 0) {
            return res.status(400).json({ message: 'Ya estabas inscrito en esta actividad.' });
        }

        if (patientIds.length > 0) {
            const owned = await prisma.patient.findMany({
                where: { id: { in: patientIds }, socioId },
                select: { id: true }
            });
            if (owned.length !== patientIds.length) {
                return res.status(400).json({ message: 'Algún paciente seleccionado no es válido o no pertenece a tu cuenta.' });
            }
        }

        const slotsNeeded = 1 + patientIds.length;
        const enrolledCount = (activity._count?.socios || 0) + (activity._count?.patients || 0);

        if (activity.maxCapacity != null && enrolledCount + slotsNeeded > activity.maxCapacity) {
            return res.status(400).json({
                message: 'No hay plazas suficientes para el titular y los pacientes seleccionados (el aforo no incluye invitados adicionales).'
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.activity.update({
                where: { id: activityId },
                data: {
                    socios: { connect: { id: socioId } },
                    patients: patientIds.length
                        ? { connect: patientIds.map((pid) => ({ id: pid })) }
                        : undefined
                }
            });
            await tx.activityEnrollmentDetail.create({
                data: {
                    activityId,
                    socioId,
                    guestChildrenUnder18,
                    guestAdults18Plus
                }
            });
        });

        // Aviso a la delegación organizadora (no bloquea la respuesta ni rompe si falla).
        notifyActivityEnrollment(prisma, {
            activity,
            socioId,
            guestChildrenUnder18,
            guestAdults18Plus,
            patientCount: patientIds.length,
        }).catch((e) => console.error('[actividades] aviso de inscripción falló:', e.message));

        res.json({ success: true, message: '¡Inscripción realizada con éxito!' });
    } catch (error) {
        console.error('Error in enrollment:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Ya consta una inscripción para esta actividad.' });
        }
        res.status(500).json({ message: 'No se pudo realizar la inscripción.' });
    }
});

// POST /api/actividades/:id/unenroll — Socio cancels enrollment
router.post('/:id/unenroll', verifyToken, async (req, res) => {
    try {
        const activityId = req.params.id;
        const socioId = req.user?.socioId;

        if (!socioId) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        await prisma.$transaction(async (tx) => {
            const toDisconnect = await tx.patient.findMany({
                where: { socioId, activities: { some: { id: activityId } } },
                select: { id: true }
            });
            await tx.activityEnrollmentDetail.deleteMany({ where: { activityId, socioId } });
            await tx.activity.update({
                where: { id: activityId },
                data: {
                    socios: { disconnect: { id: socioId } },
                    patients: {
                        disconnect: toDisconnect.map((p) => ({ id: p.id }))
                    }
                }
            });
        });

        res.json({ success: true, message: 'Inscripción cancelada correctamente.' });
    } catch (error) {
        console.error('Error in unenrollment:', error);
        res.status(500).json({ message: 'No se pudo cancelar la inscripción.' });
    }
});

module.exports = router;
