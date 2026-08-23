import { useCallback, useEffect, useState } from 'react';

/**
 * Identity, only where it is actually needed.
 *
 * Sending a card to one person is a private exchange between two people and
 * stays frictionless — no account, no sign-in. Posting to the public wall is a
 * different act: it puts images in front of strangers, so it is gated behind a
 * real Google account. That is the accountability half of moderation; the
 * enforcement half lives on the server (see MODERATION.md), because anything
 * checked in the browser can simply be skipped by not using the browser.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const authAvailable = Boolean(SUPABASE_URL && SUPABASE_KEY);

const TOKEN_KEY = 'lenticard-session';

export interface Account {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  token: string;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Storage blocked; the session simply lasts this page view. */
  }
}

/** OAuth returns the token in the fragment; lift it out and tidy the URL. */
function tokenFromRedirect(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.includes('access_token')) return null;
  const token = new URLSearchParams(hash).get('access_token');
  if (token) {
    writeToken(token);
    window.history.replaceState(null, '', window.location.pathname);
  }
  return token;
}

async function fetchAccount(token: string): Promise<Account | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY!, authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name,
    avatar: user.user_metadata?.avatar_url,
    token,
  };
}

export function signInWithGoogle(): void {
  const redirect = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href =
    `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
}

export function useAccount(): {
  account: Account | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
} {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(authAvailable);

  useEffect(() => {
    if (!authAvailable) return;
    let cancelled = false;
    void (async () => {
      const token = tokenFromRedirect() ?? readToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const found = await fetchAccount(token).catch(() => null);
      if (cancelled) return;
      // A token that no longer resolves is a stale one; drop it.
      if (!found) writeToken(null);
      setAccount(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(() => {
    writeToken(null);
    setAccount(null);
  }, []);

  return { account, loading, signIn: signInWithGoogle, signOut };
}
