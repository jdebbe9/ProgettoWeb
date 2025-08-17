// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

module.exports = async function sendEmail(to, subject, text) {
  // se hai configurato MAIL_* usa SMTP, altrimenti logga in console
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'PsicoCare <no-reply@psicocare.local>',
      to, subject, text
    });
  } else {
    console.log('\n[DEV EMAIL]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:\n', text, '\n');
  }
};
