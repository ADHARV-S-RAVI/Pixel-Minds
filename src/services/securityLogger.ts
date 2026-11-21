import { supabase } from '../lib/supabase';

export type SecurityEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SecurityEventPayload {
  eventType: string;
  severity?: SecurityEventSeverity;
  details?: Record<string, any>;
  correlationId?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pass',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'cookie',
  'authorization',
  'apikey',
  'api_key',
  'credentials',
  'credential',
  'smtp',
  'bearer',
  'private_key',
  'private',
  'session_id',
  'session_token',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
  'pin'
]);

/**
 * Generate a random correlation ID for request tracing
 */
export const generateCorrelationId = (): string => {
  return 'sec_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

const sanitizeArray = (arr: any[]): any[] => {
  return arr.slice(0, 50).map((item) => {
    if (typeof item === 'string') {
      return item.replace(/[\r\n\t]/g, ' ').substring(0, 300);
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      return item;
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return sanitizeDetails(item);
    }
    if (Array.isArray(item)) {
      return sanitizeArray(item);
    }
    return item;
  });
};

/**
 * Sanitize metadata details: Strip sensitive keys and truncate long strings to prevent log injection.
 * Recursively sanitizes nested objects and arrays.
 */
export const sanitizeDetails = (details?: Record<string, any>): Record<string, any> => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.includes('token') ||
      lowerKey.includes('pass') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('credential') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('private') ||
      lowerKey.includes('bearer')
    ) {
      clean[key] = '[REDACTED]';
      continue;
    }

    if (typeof val === 'string') {
      // Prevent log injection / multi-line pollution
      clean[key] = val.replace(/[\r\n\t]/g, ' ').substring(0, 300);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      clean[key] = val;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeDetails(val);
    } else if (Array.isArray(val)) {
      clean[key] = sanitizeArray(val);
    }
  }

  return clean;
};

/**
 * Dispatch structured security events to console (Vercel Log Drain) and to Supabase security_logs.
 *
 * Failure handling:
 *   - Backend write errors are no longer silently swallowed.
 *   - A warning is always emitted to console so Vercel Log Drain captures it.
 *   - For 'critical' severity events, the backend error is re-thrown so callers
 *     can decide whether to surface it to the user or escalate.
 *   - For all other severities, the error is logged and the function resolves
 *     (non-blocking for UX) but the failure is clearly recorded.
 */
export const logSecurityEvent = async (event: SecurityEventPayload): Promise<void> => {
  const correlationId = event.correlationId || generateCorrelationId();
  const severity = event.severity || 'warning';
  const cleanDetails = sanitizeDetails(event.details);

  const structuredLog = {
    timestamp: new Date().toISOString(),
    event_type: event.eventType,
    severity,
    correlation_id: correlationId,
    details: cleanDetails
  };

  // Structured console log for Vercel Observability
  if (severity === 'critical' || severity === 'error') {
    console.error('[SECURITY_ALERT]', JSON.stringify(structuredLog));
  } else {
    console.warn('[SECURITY_EVENT]', JSON.stringify(structuredLog));
  }

  // Persist to Supabase security_logs via secure RPC.
  // Failures are reported — not silently swallowed — so monitoring can detect
  // when the backend logging pipeline is broken.
  try {
    const { error: rpcError } = await (supabase.rpc as any)('log_security_event', {
      p_event_type:     event.eventType,
      p_severity:       severity,
      p_details:        cleanDetails,
      p_correlation_id: correlationId
    });

    if (rpcError) {
      // Always surface the backend error to the console/log drain
      console.warn(
        '[securityLogger] Backend write failed — event NOT persisted to security_logs:',
        {
          event_type:      event.eventType,
          severity,
          correlation_id:  correlationId,
          rpc_error_code:  rpcError.code,
          rpc_error_msg:   rpcError.message
        }
      );

      // For critical events, re-throw so caller code can escalate or alert
      if (severity === 'critical') {
        throw new Error(
          `[securityLogger] CRITICAL event "${event.eventType}" could not be persisted: ${rpcError.message}`
        );
      }
    }
  } catch (err: any) {
    // Catch network-level or unexpected errors and always surface them
    if (err?.message?.startsWith('[securityLogger] CRITICAL')) {
      throw err; // propagate critical re-throw
    }
    console.warn(
      '[securityLogger] Unexpected error dispatching security event:',
      {
        event_type:     event.eventType,
        severity,
        correlation_id: correlationId,
        error:          err?.message || String(err)
      }
    );
  }
};

export const logFailedPost = (userId: string | undefined, reason: string, meta?: Record<string, any>) => {
  logSecurityEvent({
    eventType: 'failed_post_submission',
    severity: 'warning',
    details: { userId: userId || 'anonymous', reason, ...meta }
  });
};

export const logRateLimitExceeded = (userId: string | undefined, action: string, meta?: Record<string, any>) => {
  logSecurityEvent({
    eventType: 'rate_limit_exceeded',
    severity: 'warning',
    details: { userId: userId || 'anonymous', action, ...meta }
  });
};

export const logUnauthorizedAttempt = (userId: string | undefined, action: string, targetId?: string) => {
  logSecurityEvent({
    eventType: 'unauthorized_action_attempt',
    severity: 'error',
    details: { userId: userId || 'anonymous', action, targetId }
  });
};

export const logValidationFailure = (userId: string | undefined, field: string, error: string) => {
  logSecurityEvent({
    eventType: 'input_validation_failure',
    severity: 'info',
    details: { userId: userId || 'anonymous', field, error }
  });
};

export const logFailedUpload = (userId: string | undefined, fileName: string, error: string) => {
  logSecurityEvent({
    eventType: 'failed_image_upload',
    severity: 'warning',
    details: { userId: userId || 'anonymous', fileName, error }
  });
};

export const logFeedError = (error: any, context: string, userId?: string) => {
  logSecurityEvent({
    eventType: 'feed_operation_error',
    severity: 'error',
    details: {
      userId: userId || 'anonymous',
      context,
      message: error?.message || String(error),
      code: error?.code
    }
  });
};
