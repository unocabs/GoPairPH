import { createClient } from '@/lib/supabase/server';
import { getSafeNext, resolvePostSignInPath } from '@/lib/auth/postSignInRedirect';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const AUTH_NEXT_COOKIE = 'auth_next';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = cookies();
      const next = getSafeNext(searchParams.get('next') ?? cookieStore.get(AUTH_NEXT_COOKIE)?.value ?? null);
      const { data: { user } } = await supabase.auth.getUser();
      const destination = user
        ? await resolvePostSignInPath(supabase, user.id, next)
        : next;
      const response = NextResponse.redirect(`${origin}${destination}`);
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
