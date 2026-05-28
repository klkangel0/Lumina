const nodemailer = require('nodemailer');

function createTransport() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || pass === undefined) {
        return null;
    }
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

/**
 * @param {string} to
 * @param {string} code
 * @returns {Promise<{ sent: boolean, simulated: boolean }>}
 */
async function sendPasswordResetCode(to, code) {
    const from = process.env.SMTP_FROM || '"Lumina" <noreply@lumina.local>';
    const transport = createTransport();

    const text = [
        'Ha solicitado restablecer la contraseña de su cuenta en Lumina (Asotea Martorell).',
        '',
        `Su código de verificación es: ${code}`,
        '',
        'El código caduca en 15 minutos. Si no ha solicitado este cambio, ignore este mensaje.',
    ].join('\n');

    const html = `
      <p>Ha solicitado restablecer la contraseña de su cuenta en <strong>Lumina</strong> (Asotea Martorell).</p>
      <p style="font-size:22px;letter-spacing:0.2em;font-weight:bold">${code}</p>
      <p>El código caduca en 15 minutos. Si no ha solicitado este cambio, ignore este mensaje.</p>
    `;

    if (!transport) {
        console.warn(
            '[email] SMTP no configurado (SMTP_HOST / SMTP_USER / SMTP_PASS). Código de recuperación:',
            { to, code }
        );
        return { sent: false, simulated: true };
    }

    await transport.sendMail({
        from,
        to,
        subject: 'Código para restablecer contraseña — Lumina',
        text,
        html,
    });
    return { sent: true, simulated: false };
}

module.exports = { createTransport, sendPasswordResetCode };
