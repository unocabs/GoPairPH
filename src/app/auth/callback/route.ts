import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const AUTH_NEXT_COOKIE = 'auth_next';

function getSafeNext(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return '/browse';
  }

  return rawNext;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = cookies();
      const next = getSafeNext(searchParams.get('next') ?? cookieStore.get(AUTH_NEXT_COOKIE)?.value ?? null);
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set(AUTH_NEXT_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: origin.startsWith('https://'),
        maxAge: 0,
        path: '/',
      });

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_error`);
}
