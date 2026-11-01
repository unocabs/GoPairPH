import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
export function installMessagingMocks() {
  const virtual = {
    '@/lib/feedbackServer': 'export const processFeedbackEmails=async()=>({sent:0,suppressed:0,retrying:0});',
    '@/lib/supabase/server': 'export const createClient=()=>globalThis.chatMocks.client; export const createServiceClient=()=>globalThis.chatMocks.service;',
    '@/lib/email/resend': 'export const sendTransactionalEmail=(args)=>globalThis.chatMocks.email(args);',
    'next/server': 'export const NextResponse={json:(body,init)=>Response.json(body,init)};',
  };
  const root = new URL('../../src/', import.meta.url);
  registerHooks({
    resolve(specifier, context, next) {
      if (Object.hasOwn(virtual, specifier)) return { url: `chat-mock:${specifier}`, shortCircuit: true };
      if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith('chat-mock:')) return { format: 'module', source: virtual[url.slice('chat-mock:'.length)], shortCircuit: true };
      return next(url, context);
    },
  });
}
