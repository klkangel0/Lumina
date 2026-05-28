const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const {
    evaluateQuestionnaireCompleteness,
    part1FieldErrors,
    ALL_MUNICIPIOS,
} = require('../lib/questionnaireValidation');
const {
    parseQuestionnairePart,
    stringifyQuestionnairePart,
    normalizeQuestionnaireRow,
} = require('../lib/questionnaireJson');
const { validateIban } = require('../lib/ibanValidation');
const {
    validateMandateUm,
    parseMandateSignedAt,
    assertSepaCompleteForActiveSocio,
} = require('../lib/sepaMandateValidation');

const router = express.Router();
const prisma = new PrismaClient();

async function generateUniqueUmrForSocio({ socioId, memberCode }) {
    // UMR máx 35. Usamos "SOC-00023-AB12CD34" (sin espacios) y recortamos por seguridad.
    const prefix = (memberCode || `SOC-${String(socioId).padStart(5, '0')}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
    for (let i = 0; i < 8; i++) {
        const rand = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars
        const raw = `${prefix}${rand}`.slice(0, 35);
        const chk = validateMandateUm(raw);
        if (!chk.ok) continue;
        const exists = await prisma.socio.findFirst({ where: { sepaMandateUm: chk.value } });
        if (!exists) return chk.value;
    }
    throw new Error('No se pudo generar una UMR única.');
}

const socioListInclude = {
    patients: { orderBy: { createdAt: 'asc' }, include: { delegation: true } },
    user: { select: { id: true, username: true } },
    delegation: true,
    questionnaire: true,
    sepaMonthlyTemplate: true,
};

// GET /api/socios — list all socios with their patients and linked user
router.get('/', verifyToken, async (req, res) => {
    try {
        const socios = await prisma.socio.findMany({
            where: {
                status: {
                    not: 'PENDING'
                }
            },
            orderBy: { id: 'asc' },
            include: socioListInclude
        });
        res.json(
            socios.map((s) => ({
                ...s,
                questionnaire: normalizeQuestionnaireRow(s.questionnaire),
            }))
        );
    } catch (error) {
        console.error("Error fetching socios:", error);
        res.status(500).json({ message: 'Error interno al cargar socios.' });
    }
});

// GET /api/socios/pending — list pending socios for the waiting list
router.get('/pending', verifyToken, async (req, res) => {
    try {
        const socios = await prisma.socio.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: socioListInclude
        });
        const enriched = socios.map((s) => {
            const q = normalizeQuestionnaireRow(s.questionnaire);
            const { ok, missingSections } = evaluateQuestionnaireCompleteness({
                part1: q?.part1,
                part2: q?.part2,
                part3: q?.part3,
            });
            return {
                ...s,
                questionnaire: q,
                questionnaireComplete: ok,
                questionnaireMissingSections: ok ? [] : missingSections,
            };
        });
        res.json(enriched);
    } catch (error) {
        console.error("Error fetching pending socios:", error);
        res.status(500).json({ message: 'Error interno al cargar lista de espera.' });
    }
});

// GET /api/socios/me/questionnaire — socio logueado (cualquier estado)
router.get('/me/questionnaire', verifyToken, async (req, res) => {
    try {
        const socioId = req.user.socioId;
        if (!socioId || req.user.role !== 'SOCIO') {
            return res.status(403).json({ message: 'Solo los socios pueden acceder a este formulario.' });
        }
        const socio = await prisma.socio.findUnique({
            where: { id: socioId },
            include: { questionnaire: true, delegation: true },
        });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });
        const qNorm = normalizeQuestionnaireRow(socio.questionnaire);
        const completeness = evaluateQuestionnaireCompleteness({
            part1: qNorm?.part1,
            part2: qNorm?.part2,
            part3: qNorm?.part3,
        });
        res.json({
            socio: {
                id: socio.id,
                status: socio.status,
                municipio: socio.municipio,
                delegationId: socio.delegationId,
                phone: socio.phone,
                email: socio.email,
            },
            questionnaire: qNorm,
            completeness,
        });
    } catch (error) {
        console.error('Error loading questionnaire:', error);
        res.status(500).json({ message: 'Error al cargar el formulario.' });
    }
});

// PUT /api/socios/me/questionnaire — guardar formulario (solo postuladores PENDING)
router.put('/me/questionnaire', verifyToken, async (req, res) => {
    try {
        const socioId = req.user.socioId;
        if (!socioId || req.user.role !== 'SOCIO') {
            return res.status(403).json({ message: 'No autorizado.' });
        }
        const socio = await prisma.socio.findUnique({ where: { id: socioId } });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });
        if (socio.status !== 'PENDING') {
            return res.status(403).json({ message: 'Solo puede editar el formulario de alta mientras está en lista de espera.' });
        }

        const body = req.body || {};
        if (body.part1 === undefined && body.part2 === undefined && body.part3 === undefined) {
            return res.status(400).json({ message: 'No hay datos para guardar.' });
        }
        const existingQ = await prisma.socioQuestionnaire.findUnique({ where: { socioId } });
        const p1Parsed = parseQuestionnairePart(existingQ?.part1);
        const p2Parsed = parseQuestionnairePart(existingQ?.part2);
        const p3Parsed = parseQuestionnairePart(existingQ?.part3);
        const exP1 = p1Parsed && typeof p1Parsed === 'object' ? p1Parsed : {};
        const exP2 = p2Parsed && typeof p2Parsed === 'object' ? p2Parsed : {};
        const exP3 = p3Parsed && typeof p3Parsed === 'object' ? p3Parsed : {};

        const mergedPart1 = body.part1 !== undefined ? { ...exP1, ...body.part1 } : p1Parsed;

        let mergedPart2 = p2Parsed;
        if (body.part2 !== undefined) {
            const ans = { ...(exP2.answers || {}), ...(body.part2.answers || {}) };
            mergedPart2 = {
                variant: body.part2.variant !== undefined ? body.part2.variant : exP2.variant,
                answers: ans,
            };
        }

        const mergedPart3 = body.part3 !== undefined ? { ...exP3, ...body.part3 } : p3Parsed;

        if (mergedPart1 && typeof mergedPart1 === 'object') {
            if (mergedPart1.municipio && typeof mergedPart1.municipio === 'string') {
                mergedPart1.municipio = mergedPart1.municipio.trim();
                if (!ALL_MUNICIPIOS.includes(mergedPart1.municipio)) {
                    return res.status(400).json({ message: 'Municipio no válido.' });
                }
            }
            if (mergedPart1.delegationId !== undefined && mergedPart1.delegationId !== null && mergedPart1.delegationId !== '') {
                const did = parseInt(String(mergedPart1.delegationId), 10);
                if (!Number.isFinite(did)) {
                    return res.status(400).json({ message: 'Delegación no válida.' });
                }
                const del = await prisma.delegation.findUnique({ where: { id: did } });
                if (!del) return res.status(400).json({ message: 'Delegación no encontrada.' });
                mergedPart1.delegationId = did;
            }
        }

        const updateSocioData = {};
        if (mergedPart1 && typeof mergedPart1 === 'object' && part1FieldErrors(mergedPart1).length === 0) {
            if (mergedPart1.phone) updateSocioData.phone = String(mergedPart1.phone).trim();
            if (mergedPart1.email) {
                const em = String(mergedPart1.email).trim();
                const taken = await prisma.socio.findFirst({ where: { email: em, id: { not: socioId } } });
                if (taken) return res.status(400).json({ message: 'El correo ya está en uso por otro socio.' });
                updateSocioData.email = em;
            }
            if (mergedPart1.municipio) updateSocioData.municipio = mergedPart1.municipio;
            if (mergedPart1.delegationId !== undefined && mergedPart1.delegationId !== null) {
                updateSocioData.delegationId = parseInt(String(mergedPart1.delegationId), 10);
            }
        }

        if (Object.keys(updateSocioData).length > 0) {
            await prisma.socio.update({ where: { id: socioId }, data: updateSocioData });
            const linkedUser = await prisma.user.findFirst({ where: { socioId } });
            if (linkedUser && (updateSocioData.email || updateSocioData.phone)) {
                await prisma.user.update({
                    where: { id: linkedUser.id },
                    data: {
                        ...(updateSocioData.email ? { email: updateSocioData.email } : {}),
                        ...(updateSocioData.phone !== undefined ? { phone: updateSocioData.phone } : {}),
                    },
                });
            }
        }

        const createData = { socioId };
        if (mergedPart1 !== null && mergedPart1 !== undefined) {
            createData.part1 = stringifyQuestionnairePart(mergedPart1);
        }
        if (mergedPart2 !== null && mergedPart2 !== undefined) {
            createData.part2 = stringifyQuestionnairePart(mergedPart2);
        }
        if (mergedPart3 !== null && mergedPart3 !== undefined) {
            createData.part3 = stringifyQuestionnairePart(mergedPart3);
        }

        const updateData = {};
        if (body.part1 !== undefined) updateData.part1 = stringifyQuestionnairePart(mergedPart1);
        if (body.part2 !== undefined) updateData.part2 = stringifyQuestionnairePart(mergedPart2);
        if (body.part3 !== undefined) updateData.part3 = stringifyQuestionnairePart(mergedPart3);

        let questionnaire;
        if (existingQ) {
            if (Object.keys(updateData).length === 0) {
                questionnaire = existingQ;
            } else {
                questionnaire = await prisma.socioQuestionnaire.update({
                    where: { socioId },
                    data: updateData,
                });
            }
        } else {
            questionnaire = await prisma.socioQuestionnaire.create({ data: createData });
        }

        const updatedSocio = await prisma.socio.findUnique({
            where: { id: socioId },
            include: { questionnaire: true, delegation: true },
        });

        const qNorm = normalizeQuestionnaireRow(questionnaire);
        const completeness = evaluateQuestionnaireCompleteness({
            part1: qNorm?.part1,
            part2: qNorm?.part2,
            part3: qNorm?.part3,
        });

        res.json({
            success: true,
            questionnaire: qNorm,
            socio: {
                ...updatedSocio,
                questionnaire: normalizeQuestionnaireRow(updatedSocio.questionnaire),
            },
            completeness,
        });
    } catch (error) {
        console.error('Error saving questionnaire:', error);
        res.status(500).json({ message: 'Error al guardar el formulario.' });
    }
});

// POST /api/socios — create a new socio + linked User account
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            name, lastName, dni, email, phone, phone2, address,
            gender, pronouns, customPronouns, notes, status,
            username, password, municipio, delegationId
        } = req.body;

        // Validate required fields
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });
        if (!email) return res.status(400).json({ message: 'El email es obligatorio.' });
        if (!password || password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return res.status(400).json({ message: 'El formato del email no es válido.' });

        // Check email uniqueness in socios
        const existingEmail = await prisma.socio.findFirst({ where: { email } });
        if (existingEmail) return res.status(400).json({ message: 'El email ya está registrado como socio.' });

        // Check DNI uniqueness
        if (dni) {
            const existingDni = await prisma.socio.findFirst({ where: { dni } });
            if (existingDni) return res.status(400).json({ message: 'El DNI ya está registrado.' });
        }

        // Generate username if empty
        const finalUsername = username?.trim() || (name.trim().toLowerCase() + (lastName ? lastName.trim().charAt(0).toLowerCase() : ''));

        // Check username uniqueness
        const existingUser = await prisma.user.findUnique({ where: { username: finalUsername } });
        if (existingUser) return res.status(400).json({ message: `El nombre de usuario "${finalUsername}" ya está en uso.` });

        // Check email uniqueness in users table too
        const existingUserEmail = await prisma.user.findFirst({ where: { email: email.trim() } });
        if (existingUserEmail) return res.status(400).json({ message: 'El email ya está en uso por otro usuario.' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let municipioVal = null;
        if (municipio && String(municipio).trim()) {
            const m = String(municipio).trim();
            if (!ALL_MUNICIPIOS.includes(m)) return res.status(400).json({ message: 'Municipio no válido.' });
            municipioVal = m;
        }
        let delId = null;
        if (delegationId !== undefined && delegationId !== null && delegationId !== '') {
            const did = parseInt(String(delegationId), 10);
            if (Number.isFinite(did)) {
                const del = await prisma.delegation.findUnique({ where: { id: did } });
                if (!del) return res.status(400).json({ message: 'Delegación no encontrada.' });
                delId = did;
            }
        }

        // Create socio with temporary memberCode
        const socio = await prisma.socio.create({
            data: {
                memberCode: 'TEMP',
                name: name.trim(),
                lastName: (lastName || '').trim(),
                dni: dni ? dni.trim() : null,
                email: email.trim(),
                phone: phone ? phone.trim() : null,
                phone2: phone2 ? phone2.trim() : null,
                address: address ? address.trim() : null,
                gender: gender || null,
                pronouns: pronouns || null,
                customPronouns: customPronouns ? customPronouns.trim() : null,
                notes: notes ? notes.trim() : null,
                status: status || 'ACTIVE',
                municipio: municipioVal,
                delegationId: delId,
            }
        });

        // Generate SOC-XXXXX code
        const memberCode = 'SOC-' + String(socio.id).padStart(5, '0');
        await prisma.socio.update({
            where: { id: socio.id },
            data: { memberCode },
        });

        // Find the "soci" AppRole to assign
        const socioAppRole = await prisma.appRole.findUnique({ where: { name: 'soci' } });

        // Create linked User account with SOCIO role
        await prisma.user.create({
            data: {
                username: finalUsername,
                password: hashedPassword,
                role: 'SOCIO',
                name: `${name.trim()} ${(lastName || '').trim()}`.trim(),
                email: email.trim(),
                phone: phone ? phone.trim() : null,
                socioId: socio.id,
                appRoleId: socioAppRole ? socioAppRole.id : null,
            }
        });

        res.status(201).json({
            success: true,
            message: 'Socio creado correctamente con acceso al sistema',
            memberCode,
        });

    } catch (error) {
        console.error('Error creating socio:', error);
        res.status(500).json({ message: 'No se pudo crear el socio: ' + error.message });
    }
});

// PUT /api/socios/:id — update an existing socio
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.socio.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Socio no encontrado.' });

        const {
            name, lastName, dni, email, phone, phone2, address, gender, pronouns, customPronouns, notes, status,
            municipio, delegationId, iban,
            sepaMandateUm, sepaMandateSignedAt,
            sepaMonthlyTemplateId, sepaMonthlyNextChargeAt,
        } = req.body;

        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

        // Check email uniqueness (exclude self)
        if (email) {
            const existingEmail = await prisma.socio.findFirst({ where: { email, id: { not: id } } });
            if (existingEmail) return res.status(400).json({ message: 'El email ya está registrado por otro socio.' });
        }
        // Check DNI uniqueness (exclude self)
        if (dni) {
            const existingDni = await prisma.socio.findFirst({ where: { dni, id: { not: id } } });
            if (existingDni) return res.status(400).json({ message: 'El DNI ya está registrado.' });
        }

        let delegationConnect = undefined;
        if (delegationId !== undefined && delegationId !== null && delegationId !== '') {
            const did = parseInt(String(delegationId), 10);
            if (Number.isFinite(did)) {
                const del = await prisma.delegation.findUnique({ where: { id: did } });
                if (!del) return res.status(400).json({ message: 'Delegación no encontrada.' });
                delegationConnect = did;
            }
        }
        let municipioVal = undefined;
        if (municipio !== undefined) {
            if (municipio === null || municipio === '') municipioVal = null;
            else {
                const m = String(municipio).trim();
                if (!ALL_MUNICIPIOS.includes(m)) return res.status(400).json({ message: 'Municipio no válido.' });
                municipioVal = m;
            }
        }

        const sepaRow = await prisma.sepaSettings.findUnique({ where: { id: 1 } });
        const sepaEnabledOrg = sepaRow?.sepaEnabled === true;
        const mergedStatus = status !== undefined ? status || 'ACTIVE' : existing.status;

        let ibanVal = existing.iban;
        if (iban !== undefined) {
            if (iban === null || String(iban).trim() === '') {
                if (sepaEnabledOrg && mergedStatus === 'ACTIVE') {
                    const ibanCheck = validateIban('');
                    return res.status(400).json({ message: ibanCheck.message });
                }
                ibanVal = null;
            } else if (sepaEnabledOrg && mergedStatus === 'ACTIVE') {
                const ibanCheck = validateIban(iban);
                if (!ibanCheck.ok) return res.status(400).json({ message: ibanCheck.message });
                ibanVal = ibanCheck.normalized;
            } else {
                const raw = String(iban).replace(/\s+/g, '').toUpperCase();
                if (raw.length > 34) return res.status(400).json({ message: 'El IBAN es demasiado largo (máx. 34 caracteres).' });
                ibanVal = raw || null;
            }
        }

        let umVal =
            sepaMandateUm !== undefined
                ? sepaMandateUm === null || String(sepaMandateUm).trim() === ''
                    ? null
                    : String(sepaMandateUm).trim()
                : existing.sepaMandateUm;

        let signedVal = existing.sepaMandateSignedAt;
        if (sepaMandateSignedAt !== undefined) {
            if (sepaMandateSignedAt === null || sepaMandateSignedAt === '') {
                signedVal = null;
            } else {
                const p = parseMandateSignedAt(sepaMandateSignedAt);
                if (!p.ok) return res.status(400).json({ message: p.message });
                signedVal = p.date;
            }
        }

        // Actualización del plan (plantilla + próxima fecha). Permite dejarlo sin definir.
        let monthlyTemplateIdVal = existing.sepaMonthlyTemplateId;
        if (sepaMonthlyTemplateId !== undefined) {
            if (sepaMonthlyTemplateId === null || sepaMonthlyTemplateId === '' || String(sepaMonthlyTemplateId).trim() === '') {
                monthlyTemplateIdVal = null;
            } else {
                const n = Number(sepaMonthlyTemplateId);
                if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: 'Plantilla de cuota inválida.' });
                const tpl = await prisma.sepaReceiptTemplate.findUnique({ where: { id: Math.trunc(n) } });
                if (!tpl || !tpl.active) return res.status(400).json({ message: 'La plantilla seleccionada no es válida.' });
                monthlyTemplateIdVal = Math.trunc(n);
            }
        }

        let nextChargeVal = existing.sepaMonthlyNextChargeAt;
        if (sepaMonthlyNextChargeAt !== undefined) {
            if (sepaMonthlyNextChargeAt === null || sepaMonthlyNextChargeAt === '' || String(sepaMonthlyNextChargeAt).trim() === '') {
                nextChargeVal = null;
            } else {
                const d = new Date(String(sepaMonthlyNextChargeAt));
                if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Fecha de cargo inválida.' });
                nextChargeVal = d;
            }
        }
        if (!monthlyTemplateIdVal) {
            nextChargeVal = null;
        }

        let umStored = umVal;
        if (umStored) {
            const umCheck = validateMandateUm(umStored);
            if (!umCheck.ok) return res.status(400).json({ message: umCheck.message });
            umStored = umCheck.value;
            const clash = await prisma.socio.findFirst({
                where: { sepaMandateUm: umStored, NOT: { id } },
            });
            if (clash) {
                return res.status(400).json({
                    message: 'Esa referencia de mandato (UMR) ya está en uso por otro socio.',
                });
            }
        }

        const sepaCheck = assertSepaCompleteForActiveSocio({
            sepaOrgEnabled: sepaEnabledOrg,
            status: mergedStatus,
            iban: ibanVal,
            sepaMandateUm: umStored,
            sepaMandateSignedAt: signedVal,
            docSepa: existing.docSepa,
        });
        if (!sepaCheck.ok) {
            return res.status(400).json({ message: sepaCheck.message });
        }

        const socio = await prisma.socio.update({
            where: { id },
            data: {
                name: name.trim(),
                lastName: (lastName || '').trim(),
                dni: dni ? dni.trim() : null,
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                phone2: phone2 ? phone2.trim() : null,
                address: address ? address.trim() : null,
                gender: gender || null,
                pronouns: pronouns || null,
                customPronouns: customPronouns ? customPronouns.trim() : null,
                notes: notes ? notes.trim() : null,
                status: mergedStatus,
                iban: ibanVal,
                sepaMandateUm: umStored,
                sepaMandateSignedAt: signedVal,
                sepaMonthlyTemplateId: monthlyTemplateIdVal,
                sepaMonthlyNextChargeAt: nextChargeVal,
                ...(municipioVal !== undefined ? { municipio: municipioVal } : {}),
                ...(delegationConnect !== undefined
                    ? { delegationId: delegationConnect }
                    : delegationId === null
                      ? { delegationId: null }
                      : {}),
            },
        });

        // Sync changes to linked User account
        const linkedUser = await prisma.user.findFirst({ where: { socioId: id } });
        if (linkedUser) {
            await prisma.user.update({
                where: { id: linkedUser.id },
                data: {
                    name: `${name.trim()} ${(lastName || '').trim()}`.trim(),
                    email: email ? email.trim() : linkedUser.email,
                    phone: phone ? phone.trim() : null,
                }
            });
        }

        res.json({ success: true, message: 'Socio actualizado correctamente', socio });
    } catch (error) {
        console.error('Error updating socio:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('sepaMandateUm')) {
            return res.status(400).json({
                message: 'Esa referencia de mandato (UMR) ya está en uso por otro socio.',
            });
        }
        res.status(500).json({ message: 'No se pudo actualizar el socio: ' + error.message });
    }
});

// DELETE /api/socios/:id — delete socio and linked user
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Delete linked user first
        await prisma.user.deleteMany({ where: { socioId: id } });

        // Delete socio (cascades to patients)
        await prisma.socio.delete({ where: { id } });

        res.json({ success: true, message: 'Socio eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting socio:', error);
        res.status(500).json({ message: 'No se pudo eliminar el socio.' });
    }
});


// PATCH /api/socios/:id/status — update socio status (approve/deactivate)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, sepaPlanTemplateId, sepaPlanNextChargeAt } = req.body;

        if (!['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
            return res.status(400).json({ message: 'Estado no válido.' });
        }

        let prev = null;
        if (status === 'ACTIVE') {
            prev = await prisma.socio.findUnique({
                where: { id },
                include: { questionnaire: true },
            });
            if (prev && prev.status === 'PENDING') {
                const qPrev = normalizeQuestionnaireRow(prev.questionnaire);
                const { ok, missingSections } = evaluateQuestionnaireCompleteness({
                    part1: qPrev?.part1,
                    part2: qPrev?.part2,
                    part3: qPrev?.part3,
                });
                if (!ok) {
                    return res.status(400).json({
                        message: 'No se puede aprobar este socio. Faltan los siguientes apartados:',
                        missingSections,
                    });
                }
            }
        }

        // Si se aprueba, permitir confirmar el plan SEPA (plantilla + próxima fecha)
        // (fase cuotas por socio). No obliga aquí aún; la UI lo hará según configuración.
        let planTemplateId = undefined;
        if (sepaPlanTemplateId !== undefined) {
            if (sepaPlanTemplateId === null || sepaPlanTemplateId === '' || String(sepaPlanTemplateId).trim() === '') {
                planTemplateId = null;
            } else {
                const n = Number(sepaPlanTemplateId);
                if (!Number.isFinite(n) || n <= 0) {
                    return res.status(400).json({ message: 'Plan SEPA inválido.' });
                }
                planTemplateId = Math.trunc(n);
            }
        }

        let nextChargeAt = undefined;
        if (sepaPlanNextChargeAt !== undefined) {
            if (sepaPlanNextChargeAt === null || sepaPlanNextChargeAt === '' || String(sepaPlanNextChargeAt).trim() === '') {
                nextChargeAt = null;
            } else {
                const d = new Date(String(sepaPlanNextChargeAt));
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({ message: 'Fecha de cargo inválida.' });
                }
                nextChargeAt = d;
            }
        }

        // Validar que la plantilla existe si se proporciona
        if (planTemplateId !== undefined && planTemplateId !== null) {
            const tpl = await prisma.sepaReceiptTemplate.findUnique({ where: { id: planTemplateId } });
            if (!tpl || !tpl.active) {
                return res.status(400).json({ message: 'La plantilla seleccionada no es válida.' });
            }
        }

        // Al aprobar desde PENDING -> ACTIVE: generar UMR automáticamente si falta
        let umrToSet = undefined;
        if (status === 'ACTIVE') {
            if (!prev) {
                prev = await prisma.socio.findUnique({ where: { id } });
            }
            if (prev && prev.status === 'PENDING' && !(prev.sepaMandateUm && String(prev.sepaMandateUm).trim())) {
                try {
                    umrToSet = await generateUniqueUmrForSocio({ socioId: id, memberCode: prev.memberCode });
                } catch (e) {
                    console.error('UMR auto-generate:', e);
                }
            }
        }

        const socio = await prisma.socio.update({
            where: { id },
            data: {
                status,
                ...(planTemplateId !== undefined ? { sepaMonthlyTemplateId: planTemplateId } : {}),
                ...(nextChargeAt !== undefined ? { sepaMonthlyNextChargeAt: nextChargeAt } : {}),
                ...(umrToSet ? { sepaMandateUm: umrToSet } : {}),
            },
        });

        // If approving (ACTIVE), promote the linked user from Postulador to Socio role
        if (status === 'ACTIVE') {
            const socioRole = await prisma.appRole.findUnique({ where: { name: 'soci' } });
            if (socioRole) {
                await prisma.user.updateMany({
                    where: { socioId: id },
                    data: { appRoleId: socioRole.id }
                });
            }
        }

        // If deactivating back to PENDING, demote to Postulador role
        if (status === 'PENDING') {
            const postuladorRole = await prisma.appRole.findUnique({ where: { name: 'user' } });
            if (postuladorRole) {
                await prisma.user.updateMany({
                    where: { socioId: id },
                    data: { appRoleId: postuladorRole.id }
                });
            }
        }

        res.json({ success: true, message: 'Estado actualizado correctamente.', socio });
    } catch (error) {
        console.error('Error updating socio status:', error);
        res.status(500).json({ message: 'No se pudo actualizar el estado.' });
    }
});

// PATCH /api/socios/:id/contacted — update contactedAt timestamp for pending socios
router.patch('/:id/contacted', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const socio = await prisma.socio.findUnique({ where: { id } });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });

        const updatedSocio = await prisma.socio.update({
            where: { id },
            data: { contactedAt: new Date() }
        });

        res.json({ success: true, message: 'Socio marcado como contactado.', socio: updatedSocio });
    } catch (error) {
        console.error('Error updating contacted status:', error);
        res.status(500).json({ message: 'No se pudo actualizar el estado de contacto.' });
    }
});

module.exports = router;
