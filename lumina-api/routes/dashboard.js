const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

// GET /api/dashboard — stats for the dashboard
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Parallel queries for speed
        const [
            totalSocios,
            totalUsers,
            totalRoles,
            sociosThisMonth,
            recentSocios,
            monthlyData
        ] = await Promise.all([
            prisma.socio.count(),
            prisma.user.count({ where: { role: { not: 'SOCIO' } } }),
            prisma.appRole.count(),
            prisma.socio.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.socio.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, lastName: true, memberCode: true, email: true, status: true, createdAt: true }
            }),
            // Monthly registrations for the last 12 months
            getMonthlyRegistrations(prisma, now)
        ]);

        // Calculate socios by status
        const [activeCount, inactiveCount] = await Promise.all([
            prisma.socio.count({ where: { status: 'ACTIVE' } }),
            prisma.socio.count({ where: { status: { not: 'ACTIVE' } } }),
        ]);

        res.json({
            stats: {
                totalSocios,
                totalUsers,
                totalRoles,
                sociosThisMonth,
                activeSocios: activeCount,
                inactiveSocios: inactiveCount,
            },
            recentSocios,
            monthlyData,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Error al cargar el dashboard.' });
    }
});

// Helper: get monthly socio registrations for the last 12 months
async function getMonthlyRegistrations(prisma, now) {
    const months = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

        const count = await prisma.socio.count({
            where: {
                createdAt: { gte: date, lt: nextMonth }
            }
        });

        months.push({
            month: monthNames[date.getMonth()],
            year: date.getFullYear(),
            label: `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`,
            count,
        });
    }

    return months;
}

module.exports = router;
