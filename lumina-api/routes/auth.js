const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendPasswordResetCode } = require('../lib/email');
const {
    normalizeEmail,
    findUserByEmailLoose,
    checkForgotRateLimit,
} = require('../lib/passwordResetHelpers');

const router = express.Router();
const prisma = new PrismaClient();

const loginUserInclude = {
    socio: { select: { status: true } },
    appRole: {
        include: {
            permissions: {
                include: { module: true },
            },
        },
    },
};

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 8;
const MIN_PASSWORD_LEN = 6;

function randomSixDigitCode() {
    return String(crypto.randomInt(100000, 1000000));
}

function randomSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const raw = String(username || '').trim();
        if (!raw || password === undefined || password === null) {
            return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
        }

        // 1. Por nombre de usuario o por email (el formulario permite ambos)
        let user = await prisma.user.findUnique({
            where: { username: raw },
            include: loginUserInclude,
        });
        if (!user) {
            const byEmail = await findUserByEmailLoose(prisma, raw);
            if (byEmail) {
                user = await prisma.user.findUnique({
                    where: { id: byEmail.id },
                    include: loginUserInclude,
                });
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Verificar contraseña
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Construir matriz de permisos
        const permissionsData = {};
        if (user.appRole && user.appRole.permissions) {
            user.appRole.permissions.forEach(p => {
                if (p.module && p.module.name) {
                    permissionsData[p.module.name] = {
                        canView: p.canView,
                        canCreate: p.canCreate,
                        canEdit: p.canEdit,
                        canDelete: p.canDelete,
                        canManageAll: p.canManageAll
                    };
                }
            });
        }

        // Generar token JWT
        const payload = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role, // "ADMIN", "WORKER", "SOCIO"
            appRoleName: user.appRole?.name || null, // e.g., "junta", "psicologo"
            permissions: permissionsData,
            socioId: user.socioId || null,
            socioStatus: user.socio?.status || null
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
            expiresIn: '24h'
        });

        res.json({
            message: 'Acceso correcto.',
            token,
            user: payload
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { socioName, phone, email, username, password } = req.body;

        if (!socioName || !email || !password || !username) {
            return res.status(400).json({ message: 'Faltan campos obligatorios.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return res.status(400).json({ message: 'El formato del email no es válido.' });

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });

        const existingEmail = await prisma.socio.findFirst({ where: { email } });
        if (existingEmail) return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (tx) => {
            const socio = await tx.socio.create({
                data: {
                    memberCode: 'TEMP-' + Date.now(),
                    name: socioName.trim(),
                    lastName: '', // Assuming all in name for now, or front-end separates
                    email: email.trim(),
                    phone: phone ? phone.trim() : null,
                    status: 'PENDING',
                }
            });

            const memberCode = 'SOC-' + String(socio.id).padStart(5, '0');
            await tx.socio.update({
                where: { id: socio.id },
                data: { memberCode }
            });

            // Asignar rol "Postulador" hasta aprobación
            const postuladorRole = await tx.appRole.findUnique({ where: { name: 'user' } });

            await tx.user.create({
                data: {
                    username: username.trim(),
                    password: hashedPassword,
                    role: 'SOCIO',
                    name: socioName.trim(),
                    email: email.trim(),
                    phone: phone ? phone.trim() : null,
                    socioId: socio.id,
                    appRoleId: postuladorRole ? postuladorRole.id : null,
                }
            });

            // No se crea paciente aquí: al aprobarse como socio tendrá 0 pacientes y dará el alta en "Mis pacientes".

            return { socio, memberCode };
        });

        res.status(201).json({
            message: 'Registro completado con éxito. Ahora estás en lista de espera.',
            memberCode: result.memberCode
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Error interno al registrarse.' });
    }
});

// ——— Recuperación de contraseña (correo + código 6 dígitos + token opaco) ———

router.post('/forgot-password', async (req, res) => {
    const genericOk = {
        message:
            'Si ese correo está asociado a una cuenta, recibirá un código de 6 dígitos en unos minutos.',
    };
    try {
        const raw = String(req.body?.email || '').trim();
        const norm = normalizeEmail(raw);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!norm || !emailRegex.test(norm)) {
            return res.status(400).json({ message: 'Indique un correo electrónico válido.' });
        }

        if (!checkForgotRateLimit(norm, 5)) {
            return res.json(genericOk);
        }

        const user = await findUserByEmailLoose(prisma, raw);
        if (!user || !user.email) {
            return res.json(genericOk);
        }

        await prisma.passwordResetChallenge.deleteMany({ where: { userId: user.id } });
        await prisma.passwordResetSession.deleteMany({ where: { userId: user.id, usedAt: null } });

        const plainCode = randomSixDigitCode();
        const codeHash = await bcrypt.hash(plainCode, 10);
        const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

        await prisma.passwordResetChallenge.create({
            data: { userId: user.id, codeHash, expiresAt },
        });

        try {
            await sendPasswordResetCode(user.email, plainCode);
        } catch (mailErr) {
            console.error('[forgot-password] Envío de correo fallido:', mailErr);
            await prisma.passwordResetChallenge.deleteMany({ where: { userId: user.id } });
            return res.status(503).json({
                message:
                    'No se pudo enviar el correo. Compruebe la configuración SMTP del servidor o contacte con administración.',
            });
        }

        return res.json(genericOk);
    } catch (error) {
        console.error('forgot-password:', error);
        return res.status(500).json({ message: 'Error al procesar la solicitud.' });
    }
});

router.post('/verify-reset-code', async (req, res) => {
    try {
        const rawEmail = String(req.body?.email || '').trim();
        const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
        const norm = normalizeEmail(rawEmail);
        if (!norm || code.length !== 6) {
            return res.status(400).json({ message: 'Correo y código de 6 dígitos son obligatorios.' });
        }

        const user = await findUserByEmailLoose(prisma, rawEmail);
        if (!user) {
            return res.status(400).json({ message: 'Código incorrecto o caducado.' });
        }

        const challenge = await prisma.passwordResetChallenge.findFirst({
            where: { userId: user.id },
            orderBy: { id: 'desc' },
        });

        if (!challenge || challenge.expiresAt < new Date()) {
            if (challenge) await prisma.passwordResetChallenge.delete({ where: { id: challenge.id } });
            return res.status(400).json({ message: 'Código incorrecto o caducado.' });
        }

        if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
            await prisma.passwordResetChallenge.delete({ where: { id: challenge.id } });
            return res.status(400).json({
                message: 'Demasiados intentos. Solicite un nuevo código desde «He olvidado mi contraseña».',
            });
        }

        const match = await bcrypt.compare(code, challenge.codeHash);
        if (!match) {
            await prisma.passwordResetChallenge.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        await prisma.passwordResetChallenge.delete({ where: { id: challenge.id } });
        await prisma.passwordResetSession.deleteMany({ where: { userId: user.id, usedAt: null } });

        const token = randomSessionToken();
        const sessionExpires = new Date(Date.now() + RESET_SESSION_TTL_MS);
        await prisma.passwordResetSession.create({
            data: {
                userId: user.id,
                token,
                expiresAt: sessionExpires,
            },
        });

        return res.json({
            message: 'Código verificado. Establezca su nueva contraseña.',
            resetToken: token,
        });
    } catch (error) {
        console.error('verify-reset-code:', error);
        return res.status(500).json({ message: 'Error al verificar el código.' });
    }
});

router.post('/reset-password-with-token', async (req, res) => {
    try {
        const resetToken = String(req.body?.resetToken || '').trim();
        const newPassword = String(req.body?.newPassword || '');
        const confirm = String(req.body?.confirmPassword || '');

        if (!resetToken || resetToken.length < 32) {
            return res.status(400).json({ message: 'Sesión de restablecimiento no válida. Vuelva a empezar.' });
        }
        if (newPassword.length < MIN_PASSWORD_LEN) {
            return res.status(400).json({
                message: `La contraseña debe tener al menos ${MIN_PASSWORD_LEN} caracteres.`,
            });
        }
        if (newPassword !== confirm) {
            return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
        }

        const session = await prisma.passwordResetSession.findUnique({
            where: { token: resetToken },
        });

        if (!session || session.usedAt || session.expiresAt < new Date()) {
            return res.status(400).json({
                message: 'El enlace de restablecimiento ha caducado. Solicite un nuevo código.',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: session.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetSession.update({
                where: { id: session.id },
                data: { usedAt: new Date() },
            }),
            prisma.passwordResetSession.deleteMany({
                where: { userId: session.userId, usedAt: null, id: { not: session.id } },
            }),
        ]);

        return res.json({ message: 'Contraseña actualizada. Ya puede iniciar sesión.' });
    } catch (error) {
        console.error('reset-password-with-token:', error);
        return res.status(500).json({ message: 'Error al guardar la nueva contraseña.' });
    }
});

module.exports = router;
