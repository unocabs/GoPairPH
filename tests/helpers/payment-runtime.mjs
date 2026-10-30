import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Isolate payment orchestration from Next cookies and Supabase networking while
// exercising the actual API handlers and provider validation code.
export function installPaymentMocks() {
  const virtual = {
    'server-only': '',
    '@/lib/supabase/server': 'export const createServiceClient=()=>globalThis.paymentMocks.service; export const createClient=()=>globalThis.paymentMocks.authClient;',
    './notifications': 'export const sendPromotionPaymentEmail=async()=>{};',
    'next/server': 'export const NextResponse={json:(body,init)=>Response.json(body,init)};',
  };
  const root = new URL('../../src/', import.meta.url);
  registerHooks({
    resolve(specifier, context, next) {
      if (Object.hasOwn(virtual, specifier)) return { url: `payment-mock:${specifier}`, shortCircuit: true };
      if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith('payment-mock:')) return { format: 'module', source: virtual[url.slice('payment-mock:'.length)], shortCircuit: true };
      return next(url, context);
    },
  });
}
