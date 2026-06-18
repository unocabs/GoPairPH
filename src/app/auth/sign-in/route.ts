import { createClient } from '@/lib/supabase/server';
import { getSafeNext, resolvePostSignInPath } from '@/lib/auth/postSignInRedirect';
import { NextResponse } from 'next/server';

const AUTH_NEXT_COOKIE = 'auth_next';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = getSafeNext(searchParams.get('next'));
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const destination = await resolvePostSignInPath(supabase, user.id, next);
    return NextResponse.redirect(`${origin}${destination}`);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?error=auth_error`);
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(AUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
