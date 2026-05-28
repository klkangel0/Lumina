const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const { ALL_MUNICIPIOS } = require('../lib/questionnaireValidation');
const { validateIban } = require('../lib/ibanValidation');
const {
    validateMandateUm,
    parseMandateSignedAt,
    assertSepaCompleteForActiveSocio,
} = require('../lib/sepaMandateValidation');

const router = express.Router();
const prisma = new PrismaClient();

const userProfileSelect = {
    id: true,
    username: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    avatar: true,
    createdAt: true,
    socioId: true,
    appRole: { select: { displayName: true, color: true } },
    socio: {
        select: {
            id: true,
            memberCode: true,
            name: true,
            lastName: true,
            dni: true,
            email: true,
            phone: true,
            phone2: true,
            address: true,
            city: true,
            municipio: true,
            postalCode: true,
            iban: true,
            gender: true,
            pronouns: true,
            customPronouns: true,
            delegationId: true,
            status: true,
            docSepa: true,
            sepaMandateUm: true,
            sepaMandateSignedAt: true,
            sepaProposedTemplateId: true,
            delegation: { select: { id: true, name: true } },
        },
    },
};

// All routes require authentication
router.use(verifyToken);

// GET /api/profile — get current user's profile (+ ficha socio si aplica)
router.get('/', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: userProfileSelect,
        });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error al cargar el perfil.' });
    }
});

// PUT /api/profile — update profile (+ ficha socio para role SOCIO)
router.put('/', async (req, res) => {
    try {
        const { name, email, phone, avatar, socio: socioBody } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'El nombre es obligatorio.' });
        }

        const userRow = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { socio: true },
        });
        if (!userRow) return res.status(404).json({ message: 'Usuario no encontrado.' });

        if (email) {
            const existing = await prisma.user.findFirst({
                where: { email: email.trim(), id: { not: req.user.id } },
            });
            if (existing) return res.status(400).json({ message: 'El email ya está en uso por otro usuario.' });
        }

        let displayName = String(name).trim();

        const hasSocioPayload =
            userRow.role === 'SOCIO' &&
            userRow.socioId &&
            socioBody &&
            typeof socioBody === 'object' &&
            Object.keys(socioBody).length > 0;

        if (hasSocioPayload) {
            const s = socioBody;
            const socio = userRow.socio;
            if (!socio) return res.status(400).json({ message: 'No hay ficha de socio vinculada.' });

            if (s.dni !== undefined && s.dni) {
                const existingDni = await prisma.socio.findFirst({
                    where: { dni: String(s.dni).trim(), id: { not: userRow.socioId } },
                });
                if (existingDni) return res.status(400).json({ message: 'El DNI ya está registrado.' });
            }

            if (email) {
                const existingS = await prisma.socio.findFirst({
                    where: { email: email.trim(), id: { not: userRow.socioId } },
                });
                if (existingS) return res.status(400).json({ message: 'El email ya está en uso en otra ficha de socio.' });
            }

            let municipioVal = undefined;
            if (s.municipio !== undefined) {
                if (s.municipio === null || s.municipio === '') municipioVal = null;
                else {
                    const m = String(s.municipio).trim();
                    if (!ALL_MUNICIPIOS.includes(m)) {
                        return res.status(400).json({ message: 'Municipio no válido.' });
                    }
                    municipioVal = m;
                }
            }

            let delegationData = {};
            if (s.delegationId === null) delegationData = { delegationId: null };
            else if (s.delegationId !== undefined && s.delegationId !== '') {
                const did = parseInt(String(s.delegationId), 10);
                if (!Number.isFinite(did)) {
                    return res.status(400).json({ message: 'Delegación no válida.' });
                }
                const del = await prisma.delegation.findUnique({ where: { id: did } });
                if (!del) return res.status(400).json({ message: 'Delegación no encontrada.' });
                delegationData = { delegationId: did };
            }

            const mergedLastName =
                s.lastName !== undefined ? String(s.lastName).trim() : String(socio.lastName || '').trim();
            const mergedDni =
                s.dni !== undefined ? (s.dni ? String(s.dni).trim() : null) : socio.dni;
            const mergedAddress =
                s.address !== undefined ? (s.address ? String(s.address).trim() : null) : socio.address;
            const mergedPostal =
                s.postalCode !== undefined
                    ? s.postalCode
                        ? String(s.postalCode).trim()
                        : null
                    : socio.postalCode;

            const lastNameTokens = mergedLastName.split(/\s+/).filter(Boolean);
            if (lastNameTokens.length < 2) {
                return res.status(400).json({ message: 'El segundo apellido es obligatorio.' });
            }
            if (!mergedDni || !String(mergedDni).trim()) {
                return res.status(400).json({ message: 'El DNI / NIE es obligatorio.' });
            }
            if (!mergedAddress || !String(mergedAddress).trim()) {
                return res.status(400).json({ message: 'La dirección completa es obligatoria.' });
            }
            if (!mergedPostal || !String(mergedPostal).trim()) {
                return res.status(400).json({ message: 'El código postal es obligatorio.' });
            }

            const mergedIbanRaw = s.iban !== undefined ? s.iban : socio.iban;
            const sepaRow = await prisma.sepaSettings.findUnique({ where: { id: 1 } });
            const sepaEnabledOrg = sepaRow?.sepaEnabled === true;

            let proposedTemplateId = undefined;
            if (s.sepaProposedTemplateId !== undefined) {
                if (s.sepaProposedTemplateId === null || s.sepaProposedTemplateId === '' || String(s.sepaProposedTemplateId).trim() === '') {
                    proposedTemplateId = null;
                } else {
                    const n = Number(s.sepaProposedTemplateId);
                    if (!Number.isFinite(n) || n <= 0) {
                        return res.status(400).json({ message: 'Cuota seleccionada inválida.' });
                    }
                    proposedTemplateId = Math.trunc(n);
                }
            }

            // Si la config permite elección por socio, validar que la plantilla existe y está permitida
            if (proposedTemplateId !== undefined && proposedTemplateId !== null) {
                const chooses = sepaRow?.memberChoosesPlan === true;
                if (!chooses) {
                    return res.status(400).json({ message: 'La selección de cuota por socio está desactivada.' });
                }
                const tpl = await prisma.sepaReceiptTemplate.findUnique({ where: { id: proposedTemplateId } });
                if (!tpl || !tpl.active) {
                    return res.status(400).json({ message: 'La plantilla seleccionada no es válida.' });
                }
                const allowedRaw = String(sepaRow?.memberAllowedPlanFrequencies || '').trim();
                const allowed = new Set(
                    allowedRaw
                        .split(',')
                        .map((x) => x.trim().toUpperCase())
                        .filter(Boolean)
                );
                const okFreq = allowed.size === 0 ? ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(tpl.frequency) : allowed.has(tpl.frequency);
                if (!okFreq) {
                    return res.status(400).json({ message: 'Esa opción de cuota no está permitida.' });
                }
            }

            let ibanNormalized = null;
            const ibanStr = mergedIbanRaw != null ? String(mergedIbanRaw).trim() : '';
            if (!ibanStr) {
                if (sepaEnabledOrg && socio.status === 'ACTIVE') {
                    const ibanCheck = validateIban('');
                    return res.status(400).json({ message: ibanCheck.message });
                }
                ibanNormalized = null;
            } else {
                const ibanCheck = validateIban(mergedIbanRaw);
                if (!ibanCheck.ok) {
                    return res.status(400).json({ message: ibanCheck.message });
                }
                ibanNormalized = ibanCheck.normalized;
            }

            const mergedUm =
                s.sepaMandateUm !== undefined
                    ? s.sepaMandateUm === null || String(s.sepaMandateUm).trim() === ''
                        ? null
                        : String(s.sepaMandateUm).trim()
                    : socio.sepaMandateUm;
            let mergedSignedAt = socio.sepaMandateSignedAt;
            if (s.sepaMandateSignedAt !== undefined) {
                if (s.sepaMandateSignedAt === null || s.sepaMandateSignedAt === '') {
                    mergedSignedAt = null;
                } else {
                    const p = parseMandateSignedAt(s.sepaMandateSignedAt);
                    if (!p.ok) return res.status(400).json({ message: p.message });
                    mergedSignedAt = p.date;
                }
            }

            let umStored = mergedUm;
            if (mergedUm) {
                const umCheck = validateMandateUm(mergedUm);
                if (!umCheck.ok) return res.status(400).json({ message: umCheck.message });
                umStored = umCheck.value;
                const clash = await prisma.socio.findFirst({
                    where: { sepaMandateUm: umStored, NOT: { id: userRow.socioId } },
                });
                if (clash) {
                    return res.status(400).json({
                        message: 'Esa referencia de mandato (UMR) ya está en uso por otro socio.',
                    });
                }
            }

            const sepaCheck = assertSepaCompleteForActiveSocio({
                sepaOrgEnabled: sepaEnabledOrg,
                status: socio.status,
                iban: ibanNormalized,
                sepaMandateUm: umStored,
                sepaMandateSignedAt: mergedSignedAt,
                docSepa: socio.docSepa,
            });
            if (!sepaCheck.ok) {
                return res.status(400).json({ message: sepaCheck.message });
            }

            const dataSocio = {
                ...(s.name !== undefined ? { name: String(s.name).trim() } : {}),
                ...(s.lastName !== undefined ? { lastName: String(s.lastName).trim() } : {}),
                ...(s.dni !== undefined ? { dni: s.dni ? String(s.dni).trim() : null } : {}),
                ...(s.gender !== undefined ? { gender: s.gender || null } : {}),
                ...(s.pronouns !== undefined ? { pronouns: s.pronouns || null } : {}),
                ...(s.customPronouns !== undefined
                    ? { customPronouns: s.customPronouns ? String(s.customPronouns).trim() : null }
                    : {}),
                ...(s.address !== undefined ? { address: s.address ? String(s.address).trim() : null } : {}),
                ...(s.phone2 !== undefined ? { phone2: s.phone2 ? String(s.phone2).trim() : null } : {}),
                ...(s.postalCode !== undefined ? { postalCode: s.postalCode ? String(s.postalCode).trim() : null } : {}),
                ...(s.city !== undefined ? { city: s.city ? String(s.city).trim() : null } : {}),
                ...(municipioVal !== undefined ? { municipio: municipioVal } : {}),
                email: email ? email.trim() : socio.email,
                phone: phone !== undefined ? (phone ? String(phone).trim() : null) : socio.phone,
                ...delegationData,
                iban: ibanNormalized,
                ...(s.sepaMandateUm !== undefined ? { sepaMandateUm: umStored } : {}),
                ...(s.sepaMandateSignedAt !== undefined ? { sepaMandateSignedAt: mergedSignedAt } : {}),
                ...(proposedTemplateId !== undefined ? { sepaProposedTemplateId: proposedTemplateId } : {}),
            };

            await prisma.socio.update({
                where: { id: userRow.socioId },
                data: dataSocio,
            });

            const sn = s.name !== undefined ? String(s.name).trim() : socio.name;
            const sl = s.lastName !== undefined ? String(s.lastName).trim() : socio.lastName;
            displayName = `${sn} ${sl}`.trim() || displayName;
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name: displayName,
                email: email !== undefined ? (email ? email.trim() : null) : undefined,
                phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
                avatar: avatar !== undefined ? avatar : undefined,
            },
        });

        const updated = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: userProfileSelect,
        });

        res.json({ message: 'Perfil actualizado correctamente.', user: updated });
    } catch (error) {
        console.error('Profile update error:', error);
        const p2002Target = error.meta?.target;
        const isMandateUmConflict =
            error.code === 'P2002' &&
            (Array.isArray(p2002Target)
                ? p2002Target.includes('sepaMandateUm')
                : String(p2002Target || '').includes('sepaMandateUm'));
        if (isMandateUmConflict) {
            return res.status(400).json({
                message: 'Esa referencia de mandato (UMR) ya está en uso por otro socio.',
            });
        }
        res.status(500).json({ message: 'Error al actualizar el perfil.' });
    }
});

// PUT /api/profile/password — change password
router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(currentPassword, user.password);
        } else {
            isMatch = (currentPassword === user.password);
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual no es correcta.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashed },
        });

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Error al cambiar la contraseña.' });
    }
});

module.exports = router;
