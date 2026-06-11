const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();
const { ensureNotificacionesModule } = require('../lib/ensureNotificacionesModule');

// Protect all routes
router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const roles = await prisma.appRole.findMany({
            orderBy: { id: 'asc' },
            include: {
                permissions: {
                    where: { canView: true },
                    select: { moduleId: true }
                }
            }
        });

        // Count users linked to each role via appRoleId
        const enriched = await Promise.all(roles.map(async (role) => {
            const userCount = await prisma.user.count({
                where: { appRoleId: role.id }
            });

            return {
                id: role.id,
                name: role.name,
                displayName: role.displayName,
                color: role.color,
                description: role.description,
                isSystem: role.isSystem,
                active: role.active,
                createdAt: role.createdAt,
                totalUsers: userCount,
                totalModules: role.permissions.length,
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Error al cargar los roles.' });
    }
});

router.get('/modulos', async (req, res) => {
    try {
        await ensureNotificacionesModule(prisma);
        const modules = await prisma.module.findMany({
            where: { active: true },
            orderBy: { order: 'asc' }
        });
        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ message: 'Error al cargar los módulos.' });
    }
});

router.get('/:id/permisos', async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);
        const permissions = await prisma.permission.findMany({
            where: { roleId },
            include: { module: true }
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ message: 'Error al cargar los permisos.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, displayName, description, color, active, permissions } = req.body;

        if (!name || !displayName || !color) {
            return res.status(400).json({ message: 'Faltan campos requeridos (name, displayName, color).' });
        }

        // Validate name format (lowercase + underscores only)
        if (!/^[a-z_]+$/.test(name)) {
            return res.status(400).json({ message: 'El nombre interno solo puede contener letras minúsculas y guiones bajos.' });
        }

        // Check uniqueness
        const existing = await prisma.appRole.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un rol con este nombre interno.' });
        }

        const newRole = await prisma.appRole.create({
            data: {
                name,
                displayName,
                description: description || null,
                color,
                active: active !== undefined ? active : true,
                isSystem: false,
                permissions: {
                    create: (permissions || []).map(p => ({
                        moduleId: p.moduleId,
                        canView: !!p.canView,
                        canCreate: !!p.canCreate,
                        canEdit: !!p.canEdit,
                        canDelete: !!p.canDelete,
                    }))
                }
            },
            include: {
                permissions: { include: { module: true } }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Rol creado correctamente',
            role: newRole
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ message: 'No se pudo crear el rol.' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);
        const { displayName, description, color, active, permissions } = req.body;

        if (!displayName || !color) {
            return res.status(400).json({ message: 'Faltan campos requeridos (displayName, color).' });
        }

        // Validate hex color
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ message: 'Formato de color inválido.' });
        }

        // Block editing the admin role
        const existingRole = await prisma.appRole.findUnique({ where: { id: roleId } });
        if (existingRole?.name === 'admin') {
            return res.status(403).json({ message: 'El rol Administrador no se puede modificar.' });
        }

        // Update role info
        const updatedRole = await prisma.appRole.update({
            where: { id: roleId },
            data: { displayName, description: description || null, color, active: active !== undefined ? active : true }
        });

        // Replace permissions: delete all then re-create
        if (permissions) {
            await prisma.permission.deleteMany({ where: { roleId } });

            const permissionsToCreate = permissions
                .filter(p => p.canView || p.canCreate || p.canEdit || p.canDelete)
                .map(p => ({
                    roleId,
                    moduleId: p.moduleId,
                    canView: !!p.canView,
                    canCreate: !!p.canCreate,
                    canEdit: !!p.canEdit,
                    canDelete: !!p.canDelete,
                }));

            if (permissionsToCreate.length > 0) {
                await prisma.permission.createMany({ data: permissionsToCreate });
            }
        }

        res.json({
            success: true,
            message: 'Rol actualizado correctamente',
            role: updatedRole
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'No se pudo actualizar el rol.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);

        const role = await prisma.appRole.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado.' });
        }
        if (role.isSystem) {
            return res.status(403).json({ message: 'No se puede eliminar un rol del sistema.' });
        }

        await prisma.appRole.delete({ where: { id: roleId } });

        res.json({
            success: true,
            message: 'Rol eliminado correctamente'
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ message: 'No se pudo eliminar el rol.' });
    }
});

module.exports = router;
