/**
 * Pixel Minds Automated Email Notification Service
 * Sender: info.pixellminds@gmail.com
 * Handles automated transactional notifications for registrations and submissions,
 * duplicate prevention, and graceful error handling.
 */

import { supabase } from '../lib/supabase';

export interface RegistrationEmailParams {
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

export interface SubmissionEmailParams {
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
  pixelsReward?: number;
}

const STORAGE_SENT_KEY = 'pm_sent_email_records';

function getSentEmailKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_SENT_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function recordEmailSent(key: string): void {
  try {
    const keys = getSentEmailKeys();
    keys.add(key);
    // Keep max 200 recent records to prevent unbounded storage
    const arrayKeys = Array.from(keys);
    const trimmed = arrayKeys.length > 200 ? arrayKeys.slice(arrayKeys.length - 200) : arrayKeys;
    localStorage.setItem(STORAGE_SENT_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[emailService] Could not persist email sent record:', err);
  }
}

function isEmailAlreadySent(key: string): boolean {
  try {
    const keys = getSentEmailKeys();
    return keys.has(key);
  } catch {
    return false;
  }
}

/**
 * Dispatches an email notification through the Pixel Minds backend API.
 * Never throws exceptions - handles all failures gracefully.
 */
async function dispatchEmail(type: 'registration_confirmation' | 'submission_confirmation', data: any): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}> {
  try {
    if (!data.recipientEmail || typeof data.recipientEmail !== 'string') {
      return { success: false, error: 'Recipient email is required' };
    }

    // Retrieve active Supabase session token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn('[emailService] No active auth session token found. Skipping notification.');
      return { success: false, error: 'User is not authenticated' };
    }

    const authEmail = sessionData?.session?.user?.email;
    if (authEmail && data.recipientEmail.trim().toLowerCase() !== authEmail.trim().toLowerCase()) {
      console.warn('[emailService] Recipient email does not match authenticated user email.');
      return { success: false, error: 'Recipient must match authenticated user email' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type,
        data
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[emailService] Server responded with error:', errData);
      return {
        success: false,
        error: errData?.error || `HTTP ${response.status}: Failed to send email`
      };
    }

    const resData = await response.json().catch(() => ({}));
    return {
      success: true,
      reason: resData?.message
    };
  } catch (err: any) {
    console.warn('[emailService] Network or dispatch notice:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Email dispatch failed'
    };
  }
}

/**
 * Sends a registration confirmation email to the user when they successfully
 * register for a hackathon, competition or event.
 * Automatically prevents sending duplicate emails for the same registration.
 */
export async function sendRegistrationConfirmationEmail(
  params: RegistrationEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
      return { success: false, error: 'Invalid recipient email' };
    }

    // Deduplication key: user email + opportunity id/title
    const dedupeKey = `reg_${params.recipientEmail.trim().toLowerCase()}_${params.opportunityId || params.opportunityTitle.replace(/\s+/g, '_')}`;

    if (isEmailAlreadySent(dedupeKey)) {
      console.log('[emailService] Registration email already sent for this event, avoiding duplicate.');
      return { success: true, skipped: true };
    }

    const result = await dispatchEmail('registration_confirmation', params);

    if (result.success) {
      recordEmailSent(dedupeKey);
    }

    return result;
  } catch (err: any) {
    console.warn('[emailService] Error in sendRegistrationConfirmationEmail:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Sends an opportunity submission confirmation email to the user.
 * Automatically prevents sending duplicate emails for the same submission.
 */
export async function sendSubmissionConfirmationEmail(
  params: SubmissionEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
      return { success: false, error: 'Invalid recipient email' };
    }

    // Deduplication key: user email + submission id/title
    const dedupeKey = `sub_${params.recipientEmail.trim().toLowerCase()}_${params.submissionId || params.opportunityTitle.replace(/\s+/g, '_')}`;

    if (isEmailAlreadySent(dedupeKey)) {
      console.log('[emailService] Submission email already sent for this opportunity, avoiding duplicate.');
      return { success: true, skipped: true };
    }

    const result = await dispatchEmail('submission_confirmation', params);

    if (result.success) {
      recordEmailSent(dedupeKey);
    }

    return result;
  } catch (err: any) {
    console.warn('[emailService] Error in sendSubmissionConfirmationEmail:', err);
    return { success: false, error: err?.message };
  }
}

