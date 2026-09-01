'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  async function logout() {
    setIsPending(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* Local session navigation still completes. */ }
    finally { router.push('/login'); router.refresh(); }
  }
  return <button className="text-sm text-[var(--color-text-secondary)]" disabled={isPending} onClick={logout} type="button">{isPending ? 'Выходим…' : 'Выйти'}</button>;
}
