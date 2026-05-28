const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const requireAdminAppRole = require('../middleware/requireAdminAppRole');
const { validateIban } = require('../lib/ibanValidation');
const { validateCreditorIdentifierRelaxed } = require('../lib/creditorIdentifierValidation');

const router = express.Router();
const prisma = new PrismaClient();

async function getOrCreateSepaSettings() {
    return prisma.sepaSettings.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            sepaEnabled: false,
        },
        update: {},
    });
}

function normalizeBankExtra(bodyVal) {
    if (bodyVal === undefined || bodyVal === null || bodyVal === '') return null;
    if (typeof bodyVal === 'string') {
        const t = bodyVal.trim();
        if (!t) return null;
        try {
            JSON.parse(t);
            return t;
        } catch {
            return JSON.stringify({ notes: t });
        }
    }
    if (typeof bodyVal === 'object') {
        return JSON.stringify(bodyVal);
    }
    return null;
}

/** Sin auth: solo bandera (para condicionar validaciones en ficha socio / futuras pantallas). */
router.get('/public', async (req, res) => {
    try {
        const row = await getOrCreateSepaSettings();
        res.json({
            sepaEnabled: row.sepaEnabled,
            memberChoosesPlan: row.memberChoosesPlan,
            memberAllowedPlanFrequencies: row.memberAllowedPlanFrequencies,
            defaultPlanTemplateId: row.defaultPlanTemplateId,
            requirePlanConfirmOnApproval: row.requirePlanConfirmOnApproval,
        });
    } catch (e) {
        console.error('sepaSettings public:', e);
        res.status(500).json({ message: 'Error al leer la configuración.' });
    }
});

router.use(verifyToken);
router.use(requireAdminAppRole);

router.get('/', async (req, res) => {
    try {
        const row = await getOrCreateSepaSettings();
        res.json({
            sepaEnabled: row.sepaEnabled,
            creditorLegalName: row.creditorLegalName,
            creditorIban: row.creditorIban,
            creditorIdentifier: row.creditorIdentifier,
            bankExtraJson: row.bankExtraJson,
            memberChoosesPlan: row.memberChoosesPlan,
            memberAllowedPlanFrequencies: row.memberAllowedPlanFrequencies,
            defaultPlanTemplateId: row.defaultPlanTemplateId,
            requirePlanConfirmOnApproval: row.requirePlanConfirmOnApproval,
            updatedAt: row.updatedAt,
            updatedByUserId: row.updatedByUserId,
        });
    } catch (e) {
        console.error('sepaSettings GET:', e);
        res.status(500).json({ message: 'Error al cargar la configuración SEPA.' });
    }
});

router.put('/', async (req, res) => {
    try {
        const body = req.body || {};
        const sepaEnabled = Boolean(body.sepaEnabled);

        const creditorLegalName =
            body.creditorLegalName !== undefined && body.creditorLegalName !== null
                ? String(body.creditorLegalName).trim()
                : null;
        const creditorIbanRaw = body.creditorIban;
        const creditorIdentifierRaw = body.creditorIdentifier;
        const bankExtraJson = normalizeBankExtra(body.bankExtraJson);
        const memberChoosesPlan = Boolean(body.memberChoosesPlan);
        const requirePlanConfirmOnApproval =
            body.requirePlanConfirmOnApproval === undefined ? true : Boolean(body.requirePlanConfirmOnApproval);

        const memberAllowedPlanFrequenciesRaw = body.memberAllowedPlanFrequencies;
        let memberAllowedPlanFrequencies = null;
        if (memberAllowedPlanFrequenciesRaw !== undefined && memberAllowedPlanFrequenciesRaw !== null) {
            const t = String(memberAllowedPlanFrequenciesRaw).trim();
            memberAllowedPlanFrequencies = t ? t : null;
        }

        let defaultPlanTemplateId = null;
        if (body.defaultPlanTemplateId !== undefined && body.defaultPlanTemplateId !== null && String(body.defaultPlanTemplateId).trim()) {
            const n = Number(body.defaultPlanTemplateId);
            if (!Number.isFinite(n) || n <= 0) {
                return res.status(400).json({ message: 'Plantilla por defecto inválida.' });
            }
            defaultPlanTemplateId = Math.trunc(n);
        }

        if (bankExtraJson && bankExtraJson.length > 16000) {
            return res.status(400).json({ message: 'El campo de datos adicionales del banco es demasiado largo.' });
        }

        if (sepaEnabled) {
            if (!creditorLegalName) {
                return res.status(400).json({
                    message: 'Con SEPA activado, el nombre legal del acreedor es obligatorio.',
                });
            }
            const ibanCheck = validateIban(creditorIbanRaw);
            if (!ibanCheck.ok) {
                return res.status(400).json({ message: `IBAN del acreedor: ${ibanCheck.message}` });
            }
            const cid = validateCreditorIdentifierRelaxed(creditorIdentifierRaw);
            if (!cid.ok) {
                return res.status(400).json({ message: cid.message });
            }

            const updated = await prisma.sepaSettings.upsert({
                where: { id: 1 },
                create: {
                    id: 1,
                    sepaEnabled: true,
                    creditorLegalName,
                    creditorIban: ibanCheck.normalized,
                    creditorIdentifier: cid.value,
                    bankExtraJson,
                    memberChoosesPlan,
                    memberAllowedPlanFrequencies,
                    defaultPlanTemplateId,
                    requirePlanConfirmOnApproval,
                    updatedByUserId: req.user.id,
                },
                update: {
                    sepaEnabled: true,
                    creditorLegalName,
                    creditorIban: ibanCheck.normalized,
                    creditorIdentifier: cid.value,
                    bankExtraJson,
                    memberChoosesPlan,
                    memberAllowedPlanFrequencies,
                    defaultPlanTemplateId,
                    requirePlanConfirmOnApproval,
                    updatedByUserId: req.user.id,
                },
            });
            return res.json({
                sepaEnabled: updated.sepaEnabled,
                creditorLegalName: updated.creditorLegalName,
                creditorIban: updated.creditorIban,
                creditorIdentifier: updated.creditorIdentifier,
                bankExtraJson: updated.bankExtraJson,
                memberChoosesPlan: updated.memberChoosesPlan,
                memberAllowedPlanFrequencies: updated.memberAllowedPlanFrequencies,
                defaultPlanTemplateId: updated.defaultPlanTemplateId,
                requirePlanConfirmOnApproval: updated.requirePlanConfirmOnApproval,
                updatedAt: updated.updatedAt,
                updatedByUserId: updated.updatedByUserId,
            });
        }

        // SEPA desactivado: permitir guardar sin exigir acreedor; validar IBAN solo si viene informado
        let creditorIbanNorm = null;
        if (creditorIbanRaw !== undefined && creditorIbanRaw !== null && String(creditorIbanRaw).trim()) {
            const ibanCheck = validateIban(creditorIbanRaw);
            if (!ibanCheck.ok) {
                return res.status(400).json({ message: `IBAN del acreedor: ${ibanCheck.message}` });
            }
            creditorIbanNorm = ibanCheck.normalized;
        }

        let creditorIdentifierNorm = null;
        if (creditorIdentifierRaw !== undefined && creditorIdentifierRaw !== null && String(creditorIdentifierRaw).trim()) {
            const cid = validateCreditorIdentifierRelaxed(creditorIdentifierRaw);
            if (!cid.ok) {
                return res.status(400).json({ message: cid.message });
            }
            creditorIdentifierNorm = cid.value;
        }

        const updated = await prisma.sepaSettings.upsert({
            where: { id: 1 },
            create: {
                id: 1,
                sepaEnabled: false,
                creditorLegalName: creditorLegalName || null,
                creditorIban: creditorIbanNorm,
                creditorIdentifier: creditorIdentifierNorm,
                bankExtraJson,
                memberChoosesPlan,
                memberAllowedPlanFrequencies,
                defaultPlanTemplateId,
                requirePlanConfirmOnApproval,
                updatedByUserId: req.user.id,
            },
            update: {
                sepaEnabled: false,
                creditorLegalName: creditorLegalName === '' ? null : creditorLegalName,
                creditorIban: creditorIbanNorm,
                creditorIdentifier: creditorIdentifierNorm,
                bankExtraJson,
                memberChoosesPlan,
                memberAllowedPlanFrequencies,
                defaultPlanTemplateId,
                requirePlanConfirmOnApproval,
                updatedByUserId: req.user.id,
            },
        });

        return res.json({
            sepaEnabled: updated.sepaEnabled,
            creditorLegalName: updated.creditorLegalName,
            creditorIban: updated.creditorIban,
            creditorIdentifier: updated.creditorIdentifier,
            bankExtraJson: updated.bankExtraJson,
            memberChoosesPlan: updated.memberChoosesPlan,
            memberAllowedPlanFrequencies: updated.memberAllowedPlanFrequencies,
            defaultPlanTemplateId: updated.defaultPlanTemplateId,
            requirePlanConfirmOnApproval: updated.requirePlanConfirmOnApproval,
            updatedAt: updated.updatedAt,
            updatedByUserId: updated.updatedByUserId,
        });
    } catch (e) {
        console.error('sepaSettings PUT:', e);
        res.status(500).json({ message: 'Error al guardar la configuración SEPA.' });
    }
});

module.exports = router;
