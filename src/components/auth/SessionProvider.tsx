'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { type User, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface ProfileFlags {
  id: string;
  is_admin: boolean;
  is_verified: boolean;
}

interface SessionContextValue {
  user: User | null;
  profile: ProfileFlags | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({ user: null, profile: null, loading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileFlags | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadProfile(u: User | null) {
      if (!u) { setProfile(null); return; }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, is_admin, is_verified')
          .eq('user_id', u.id)
          .maybeSingle();
        if (active) setProfile((data as ProfileFlags | null) ?? null);
      } catch {
        // Profile columns may not exist yet (migration not run). Don't block the UI.
        if (active) setProfile(null);
      }
    }

    supabase.auth.getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (!active) return;
        setUser(data.user);
        setLoading(false);
        // Profile loads in the background — never blocks the avatar.
        loadProfile(data.user);
      })
      .catch(() => { if (active) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(false);
      loadProfile(nextUser);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return (
    <SessionContext.Provider value={{ user, profile, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
