import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const proc = (typeof globalThis !== 'undefined' && (globalThis as any).process) || undefined;
const procEnv = proc?.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || procEnv.SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_PUBLISHABLE_KEY || procEnv.VITE_SUPABASE_ANON_KEY || procEnv.SUPABASE_ANON_KEY;

const isTestRunner = Boolean(
  procEnv.NODE_ENV === 'test' ||
  procEnv.VITEST ||
  procEnv.npm_lifecycle_event?.includes('test') ||
  (proc?.argv && Array.isArray(proc.argv) && proc.argv.some((arg: string) => typeof arg === 'string' && arg.includes('test')))
);

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isTestRunner) {
    const missing = [
      !supabaseUrl && 'VITE_SUPABASE_URL',
      !supabaseAnonKey && 'VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)'
    ].filter(Boolean).join(', ');

    throw new Error(
      `[Pixel Minds] Mandatory Supabase configuration is missing: ${missing}. ` +
      'Please configure your environment variables in your .env file or hosting provider settings.'
    );
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
);

if (env.DEV) {
  console.log('[Supabase Client Ready]', {
    url: supabaseUrl ? supabaseUrl.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co') : 'MISSING',
    hasKey: !!supabaseAnonKey,
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'MISSING'
  });
}
