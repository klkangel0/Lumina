const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to protect all /api/usuarios routes
router.use(verifyToken);

// 1. GET ALL USERS
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: { not: 'SOCIO' }  // Socios are managed in Gestión de Socios
            },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                appRoleId: true,
                appRole: {
                    select: { id: true, name: true, displayName: true, color: true }
                },
                createdAt: true,
            }
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Error interno al cargar los usuarios.' });
    }
});

// 2. CREATE USER
router.post('/', async (req, res) => {
    try {
        const { username, password, name, role, email, appRoleId } = req.body;

        // Hash password if provided
        let hashedPassword = password;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                name,
                role: role || 'WORKER',
                email,
                appRoleId: appRoleId ? parseInt(appRoleId) : null
            },
            include: {
                appRole: {
                    select: { id: true, name: true, displayName: true, color: true }
                }
            }
        });

        res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: 'No se pudo crear el usuario. Revisa el nombre de usuario (debe ser único).' });
    }
});

// 3. UPDATE USER
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, role, email, appRoleId } = req.body;

        const updateData = { 
            username, 
            name, 
            role, 
            email,
            appRoleId: appRoleId ? parseInt(appRoleId) : null
        };

        // Only update password if a new one is sent
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                appRole: {
                    select: { id: true, name: true, displayName: true, color: true }
                }
            }
        });

        res.json({ message: 'Usuario actualizado exitosamente', user: updatedUser });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: 'No se pudo actualizar el usuario.' });
    }
});

// 4. DELETE USER
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id }
        });
        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: 'No se pudo eliminar el usuario.' });
    }
});

module.exports = router;
