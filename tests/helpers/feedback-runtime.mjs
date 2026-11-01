import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function installFeedbackMocks() {
  const virtual = {
    'server-only': '',
    'next/server': 'export const NextResponse={json:(body,init)=>Response.json(body,init)};',
    '@/lib/supabase/server': 'export const createClient=()=>globalThis.feedbackMocks.client; export const createServiceClient=()=>globalThis.feedbackMocks.service;',
    '@/lib/email/resend': 'export const sendTransactionalEmail=(args)=>globalThis.feedbackMocks.email(args);',
    '@/lib/email/adminNotifications': 'export const getAdminNotificationEmails=async()=>["admin@example.com"];',
  };
  const root = new URL('../../src/', import.meta.url);
  registerHooks({
    resolve(specifier, context, next) {
      if (Object.hasOwn(virtual, specifier)) return { url: `feedback-mock:${specifier}`, shortCircuit: true };
      if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith('feedback-mock:')) return { format: 'module', source: virtual[url.slice('feedback-mock:'.length)], shortCircuit: true };
      return next(url, context);
    },
  });
}
