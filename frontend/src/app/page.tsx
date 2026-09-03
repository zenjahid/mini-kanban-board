'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/boards' : '/login');
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      Loading…
    </div>
  );
}