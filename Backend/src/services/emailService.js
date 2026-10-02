/**
 * CoalSetu — Email Notification Service (Nodemailer)
 * Sends Ministry-grade HTML email alerts for:
 * - Overdue corrective actions
 * - High/Critical flags
 * - Parliamentary deadline warnings
 * - Daily automated report delivery
 */

const nodemailer = require('nodemailer');

// ── Transporter Configuration ──
// Uses environment variables. For NIC/govt SMTP, set SMTP_HOST etc.
// For development/testing, set EMAIL_PROVIDER=ethereal to auto-create test account.

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_PROVIDER === 'ethereal' || process.env.NODE_ENV === 'development') {
    // Auto-create Ethereal test account (no real emails sent)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('[EmailService] Using Ethereal test account:', testAccount.user);
  } else {
    // Production: NIC SMTP / Gmail / MSG91
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.nic.in',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }, // For govt SMTP
    });
  }

  return transporter;
}

// ── HTML Email Template Builder ──
function buildEmailHtml({ title, subtitle, bodyHtml, ctaText, ctaUrl, urgency = 'normal' }) {
  const colors = {
    critical: '#dc2626',
    high: '#d97706',
    normal: '#1a3c6b',
  };
  const accentColor = colors[urgency] || colors.normal;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 12px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:${accentColor};padding:20px 28px;">
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:1px;text-transform:uppercase;">Coal India Limited · CoalSetu Platform</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">${title}</h1>
          ${subtitle ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${subtitle}</p>` : ''}
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:24px 28px;color:#333;font-size:14px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        ${ctaText && ctaUrl ? `
        <!-- CTA -->
        <tr><td style="padding:0 28px 24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-size:13px;font-weight:600;">${ctaText}</a>
        </td></tr>` : ''}
        <!-- Footer -->
        <tr><td style="padding:16px 28px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;">CoalSetu AI Platform · Coal India Limited · Ministry of Coal, Government of India<br>This is an automated notification. Do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email Sending Function ──
async function sendEmail({ to, subject, title, subtitle, bodyHtml, ctaText, ctaUrl, urgency = 'normal' }) {
  try {
    const t = await getTransporter();
    const html = buildEmailHtml({ title: title || subject, subtitle, bodyHtml, ctaText, ctaUrl, urgency });

    const info = await t.sendMail({
      from: `"CoalSetu Platform" <${process.env.SMTP_FROM || 'coalsetu@coalindia.in'}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });

    // In development, log the preview URL (Ethereal)
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('[EmailService] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    console.log(`[EmailService] Email sent to ${to}: ${subject}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Pre-built Notification Templates ──

async function sendOverdueActionAlert({ to, actionId, issue, assignedTo, dueDate, mineName }) {
  return sendEmail({
    to,
    subject: `⚠️ Overdue Corrective Action — ${actionId}`,
    title: 'Overdue Corrective Action Alert',
    subtitle: `Action ${actionId} is past its due date`,
    urgency: 'high',
    bodyHtml: `
      <p><strong>${issue}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="background:#fff8e1;"><td style="padding:8px;border:1px solid #ffe082;"><strong>Mine</strong></td><td style="padding:8px;border:1px solid #ffe082;">${mineName || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Assigned To</strong></td><td style="padding:8px;border:1px solid #eee;">${assignedTo}</td></tr>
        <tr style="background:#fff8e1;"><td style="padding:8px;border:1px solid #ffe082;"><strong>Due Date</strong></td><td style="padding:8px;border:1px solid #ffe082;">${dueDate}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Status</strong></td><td style="padding:8px;border:1px solid #eee;color:#dc2626;font-weight:bold;">OVERDUE</td></tr>
      </table>
      <p style="margin-top:16px;">Immediate action is required to address this compliance obligation.</p>
    `,
    ctaText: 'View Action Details',
    ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/corrective-actions/${actionId}`,
  });
}

async function sendCriticalFlagAlert({ to, flagId, description, severity, mineName, category }) {
  return sendEmail({
    to,
    subject: `🚨 ${severity} Flag Raised — ${flagId}`,
    title: `${severity} Flag Alert`,
    subtitle: `A ${severity.toLowerCase()} flag has been raised at ${mineName || 'an operational site'}`,
    urgency: severity === 'CRITICAL' ? 'critical' : 'high',
    bodyHtml: `
      <p><strong>Description:</strong><br>${description}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="background:#fef2f2;"><td style="padding:8px;border:1px solid #fca5a5;"><strong>Mine</strong></td><td style="padding:8px;border:1px solid #fca5a5;">${mineName || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Category</strong></td><td style="padding:8px;border:1px solid #eee;">${category}</td></tr>
        <tr style="background:#fef2f2;"><td style="padding:8px;border:1px solid #fca5a5;"><strong>Severity</strong></td><td style="padding:8px;border:1px solid #fca5a5;color:#dc2626;font-weight:bold;">${severity}</td></tr>
      </table>
    `,
    ctaText: 'Review Flag Now',
    ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/flags/${flagId}`,
  });
}

async function sendParliamentaryDeadlineWarning({ to, inquiryId, title, dueDate, raisedBy, daysRemaining }) {
  return sendEmail({
    to,
    subject: `📋 Parliamentary Inquiry Due in ${daysRemaining} Days — ${inquiryId}`,
    title: 'Parliamentary Inquiry Deadline Warning',
    subtitle: `Response required within ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    urgency: daysRemaining <= 2 ? 'critical' : daysRemaining <= 5 ? 'high' : 'normal',
    bodyHtml: `
      <p><strong>Inquiry:</strong> ${title}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="background:#eff6ff;"><td style="padding:8px;border:1px solid #bfdbfe;"><strong>Raised By</strong></td><td style="padding:8px;border:1px solid #bfdbfe;">${raisedBy}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;"><strong>Due Date</strong></td><td style="padding:8px;border:1px solid #eee;">${dueDate}</td></tr>
        <tr style="background:#eff6ff;"><td style="padding:8px;border:1px solid #bfdbfe;"><strong>Days Remaining</strong></td><td style="padding:8px;border:1px solid #bfdbfe;font-weight:bold;color:#1a3c6b;">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</td></tr>
      </table>
    `,
    ctaText: 'Draft Response',
    ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parliamentary/${inquiryId}`,
  });
}

async function sendDailyReportEmail({ to, reportTitle, reportUrl, stats }) {
  return sendEmail({
    to,
    subject: `📊 Daily Automated Report — ${reportTitle}`,
    title: 'Daily Report Ready',
    subtitle: reportTitle,
    urgency: 'normal',
    bodyHtml: `
      <p>Your scheduled automated report has been generated and is ready for review.</p>
      ${stats ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
        <tr style="background:#1a3c6b;color:#fff;"><td style="padding:8px;"><strong>Metric</strong></td><td style="padding:8px;"><strong>Value</strong></td></tr>
        ${Object.entries(stats).map(([k, v], i) => `
          <tr style="${i % 2 === 0 ? 'background:#f0f4fb;' : ''}">
            <td style="padding:8px;border:1px solid #ddd;">${k}</td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${v}</td>
          </tr>`).join('')}
      </table>` : ''}
    `,
    ctaText: 'Download Report',
    ctaUrl: reportUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reports`,
  });
}

module.exports = {
  sendEmail,
  sendOverdueActionAlert,
  sendCriticalFlagAlert,
  sendParliamentaryDeadlineWarning,
  sendDailyReportEmail,
};
