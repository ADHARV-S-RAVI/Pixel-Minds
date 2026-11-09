import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

interface RegistrationData {
  recipientEmail: string;
  recipientName?: string;
  opportunityTitle: string;
  opportunityId?: string;
  organizer?: string;
  category?: string;
  mode?: string;
  deadline?: string;
  officialUrl?: string;
}

interface SubmissionData {
  recipientEmail: string;
  recipientName?: string;
  opportunityTitle: string;
  submissionId?: string;
  organizer?: string;
  category?: string;
  mode?: string;
  deadline?: string;
  submissionPixels?: number;
  approvalPixels?: number;
}

interface RequestBody {
  type: 'registration_confirmation' | 'submission_confirmation';
  data: RegistrationData | SubmissionData;
}

// ============================================================================
// Security Helpers & Rate Limiting
// ============================================================================

function escapeHtml(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 emails per window per user

interface RateRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateRecord>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(identifier, record);
    return true;
  }

  record.timestamps.push(now);
  rateLimitMap.set(identifier, record);

  // Periodic cleanup if map grows too large
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      val.timestamps = val.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
      if (val.timestamps.length === 0) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

// ============================================================================
// Email Template Builders
// ============================================================================

function buildRegistrationHtml(data: RegistrationData): string {
  const name = escapeHtml(data.recipientName || 'Builder');
  const title = escapeHtml(data.opportunityTitle || 'Opportunity');
  const organizer = escapeHtml(data.organizer || 'Official Host');
  const category = escapeHtml(data.category || 'Competitions');
  const mode = escapeHtml(data.mode || 'Online');
  const deadline = escapeHtml(data.deadline || 'Closing Soon');
  const recipientEmail = escapeHtml(data.recipientEmail);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - Pixel Minds</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07101f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07101f; min-height: 100vh; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0e1b33; border: 1px solid #1e3a5f; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #13274a 0%, #0e1b33 100%); border-bottom: 1px solid #1e3a5f;">
              <div style="display: inline-block; padding: 8px 14px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
                ✦ Pixel Minds Official
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Pixel Minds
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                The Hub for Builders, Hackathons & Opportunities
              </p>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #34d399;">
                  ✓ Application Received
                </h2>
                <p style="margin: 0; font-size: 13px; color: #a7f3d0; line-height: 1.5;">
                  Your application for <strong>${title}</strong> has been successfully received.
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px;">
                Hi <strong>${name}</strong>,<br><br>
                Thank you for applying to <strong>${title}</strong> through Pixel Minds!<br><br>
                Your registration has been successfully received. We appreciate your interest and will share further updates with you through email.
              </p>

              <!-- Event Details Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07101f; border: 1px solid #1e3a5f; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600; width: 35%;">Event / Opportunity</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #ffffff; font-weight: 700;">${title}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Organizer</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #cbd5e1;">${organizer}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Category</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #38bdf8; font-weight: 600;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Mode</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #cbd5e1;">${mode}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #94a3b8; font-weight: 600;">Deadline</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #fbbf24; font-weight: 600;">${deadline}</td>
                </tr>
              </table>

              <!-- Relevant Next Steps -->
              <div style="background-color: #13274a; border-left: 4px solid #38bdf8; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
                <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #ffffff;">
                  Relevant Next Steps:
                </h3>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                  <li style="margin-bottom: 6px;">Check the official portal to ensure any team member invites or prerequisites are completed before the deadline.</li>
                  <li style="margin-bottom: 6px;">Track this and all your event applications anytime in your <strong>Pixel Minds Applications Dashboard</strong>.</li>
                  <li>Confirm your participation on the platform to unlock and credit your <strong>+10 Pixels</strong> reward.</li>
                </ul>
              </div>

              <!-- Action Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://pixelmindss.vercel.app/profile?tab=applications" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);">
                      Open Applications Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #38bdf8;">Pixel Minds Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #07101f; border-top: 1px solid #1e3a5f; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
                This transactional email was sent to <span style="color: #94a3b8;">${recipientEmail}</span> for your activity on Pixel Minds.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Official Sender: <a href="mailto:info.pixellminds@gmail.com" style="color: #64748b; text-decoration: underline;">info.pixellminds@gmail.com</a> · &copy; ${year} Pixel Minds. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSubmissionHtml(data: SubmissionData): string {
  const name = escapeHtml(data.recipientName || 'Builder');
  const title = escapeHtml(data.opportunityTitle || 'Opportunity');
  const organizer = escapeHtml(data.organizer || 'Community Contributor');
  const category = escapeHtml(data.category || 'Opportunities');
  const mode = escapeHtml(data.mode || 'Online');
  const deadline = escapeHtml(data.deadline || 'Closing Soon');
  const submissionReward = data.submissionPixels ?? 20;
  const approvalReward = data.approvalPixels ?? 50;
  const recipientEmail = escapeHtml(data.recipientEmail);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opportunity Submission Received - Pixel Minds</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07101f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07101f; min-height: 100vh; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0e1b33; border: 1px solid #1e3a5f; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #13274a 0%, #0e1b33 100%); border-bottom: 1px solid #1e3a5f;">
              <div style="display: inline-block; padding: 8px 14px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
                ✦ Pixel Minds Community
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                Pixel Minds
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                Submission Confirmation
              </p>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <div style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #38bdf8;">
                  ✓ Opportunity Submitted for Review
                </h2>
                <p style="margin: 0; font-size: 13px; color: #bae6fd; line-height: 1.5;">
                  Thank you for contributing to the builder ecosystem! Your submission has been received.
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px;">
                Hi <strong>${name}</strong>,<br><br>
                Your opportunity submission <strong>${title}</strong> is currently under review by the Pixel Minds curation team.
              </p>

              <!-- Submission Details Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07101f; border: 1px solid #1e3a5f; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600; width: 35%;">Title</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #ffffff; font-weight: 700;">${title}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Organizer</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #cbd5e1;">${organizer}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Category</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #38bdf8; font-weight: 600;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12px; color: #94a3b8; font-weight: 600;">Status</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13px; color: #fbbf24; font-weight: 700;">Under Review</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #94a3b8; font-weight: 600;">Reward Breakdown</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #34d399; font-weight: 700;">+${submissionReward} on submission · +${approvalReward} upon approval</td>
                </tr>
              </table>

              <!-- Review Steps -->
              <div style="background-color: #13274a; border-left: 4px solid #fbbf24; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
                <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #ffffff;">
                  What happens next?
                </h3>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                  <li style="margin-bottom: 6px;">Your submission has been safely recorded in the moderation queue (<strong>+${submissionReward} Pixels</strong> submission reward).</li>
                  <li style="margin-bottom: 6px;">Our moderators verify the official links, dates, and eligibility criteria within 24 to 48 hours.</li>
                  <li>Once approved and published to the community, an additional <strong>+${approvalReward} Pixels</strong> bonus will be credited to your account.</li>
                </ul>
              </div>

              <!-- Action Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://pixelmindss.vercel.app/profile?tab=submissions" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);">
                      View My Submissions &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #07101f; border-top: 1px solid #1e3a5f; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
                This transactional email was sent to <span style="color: #94a3b8;">${recipientEmail}</span> for your submission on Pixel Minds.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Official Sender: <a href="mailto:info.pixellminds@gmail.com" style="color: #64748b; text-decoration: underline;">info.pixellminds@gmail.com</a> · &copy; ${year} Pixel Minds. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// Serverless Handler
// ============================================================================

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body: RequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, data } = body || {};

    // 1. Basic Schema Validation
    if (!type || !data || !data.recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type and data.recipientEmail are required.'
      });
    }

    if (type !== 'registration_confirmation' && type !== 'submission_confirmation') {
      return res.status(400).json({
        success: false,
        error: `Invalid email notification type: ${type}`
      });
    }

    const recipientEmail = data.recipientEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid recipient email format.' });
    }

    if (!data.opportunityTitle || typeof data.opportunityTitle !== 'string' || data.opportunityTitle.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Opportunity title is required.' });
    }

    if (data.opportunityTitle.length > 200) {
      return res.status(400).json({ success: false, error: 'Opportunity title exceeds maximum length (200).' });
    }

    // 2. Authentication Verification with Supabase
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authentication token.'
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Empty token.' });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://gdvycwwonnfpvldgbatb.supabase.co';

    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      '';

    if (!supabaseAnonKey) {
      console.error('[send-email] Server authentication config missing (SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY).');
      return res.status(500).json({
        success: false,
        error: 'Server security configuration missing.'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid, expired, or revoked authentication session.'
      });
    }

    const authenticatedUser = authData.user;
    const authenticatedEmail = authenticatedUser.email?.trim().toLowerCase();

    // 3. User Ownership Verification: The target email must match the logged-in user
    if (!authenticatedEmail || recipientEmail !== authenticatedEmail) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only dispatch notifications to your own verified account email.'
      });
    }

    // 4. Rate Limiting Protection (per authenticated user)
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const rateLimitKey = `${authenticatedUser.id}_${clientIp}`;
    if (isRateLimited(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded: You have sent too many notification requests. Please wait a few minutes.'
      });
    }

    // 5. SMTP Configuration (never exposed to client bundle)
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || 'info.pixellminds@gmail.com';
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
    const fromAddress = process.env.SMTP_FROM || `"Pixel Minds" <${user}>`;

    // Graceful fallback if credentials are not configured in environment variables
    if (!pass) {
      console.warn('[send-email] SMTP password is not configured (SMTP_PASS or GMAIL_APP_PASSWORD). Notification logged without sending.');
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'SMTP credentials not configured yet. Configure SMTP_PASS in Vercel environment variables to send live emails.'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    let subject = '';
    let html = '';

    if (type === 'registration_confirmation') {
      const regData = data as RegistrationData;
      subject = 'Your Event Application Has Been Received!';
      html = buildRegistrationHtml(regData);
    } else if (type === 'submission_confirmation') {
      const subData = data as SubmissionData;
      subject = `Submission Received: ${subData.opportunityTitle || 'Opportunity'} - Pixel Minds`;
      html = buildSubmissionHtml(subData);
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      html
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail
    });
  } catch (err: any) {
    console.error('[send-email] Error sending email notification:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch email notification.'
    });
  }
}
