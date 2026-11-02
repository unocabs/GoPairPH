import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const root = new URL('../../src/', import.meta.url);
export function installGrowthMocks() {
  const virtual = {
    '@/lib/supabase/server': 'export const createClient=()=>globalThis.growthMocks.client; export const createServiceClient=()=>{globalThis.growthMocks.serviceCalls++;return globalThis.growthMocks.service;};',
    'next/server': 'export const NextResponse={json:(body,init)=>Response.json(body,init)};',
    'next/cache': 'export const revalidateTag=(...args)=>globalThis.growthMocks.invalidations.push(args);export const revalidatePath=(...args)=>globalThis.growthMocks.invalidations.push(args);',
  };
  registerHooks({
    resolve(specifier, context, next) {
      if (Object.hasOwn(virtual, specifier)) return { url: `growth-mock:${specifier}`, shortCircuit: true };
      if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith('growth-mock:')) return { format: 'module', source: virtual[url.slice('growth-mock:'.length)], shortCircuit: true };
      return next(url, context);
    },
  });
}
