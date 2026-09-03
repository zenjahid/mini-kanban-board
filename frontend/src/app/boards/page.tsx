'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { BoardSummary } from '@/lib/types';
import NavBar from '@/components/NavBar';

const ROLE_STYLES: Record<string, string> = {
  OWNER: 'bg-brand-50 text-brand-700',
  EDITOR: 'bg-amber-50 text-amber-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

export default function BoardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingBoards, setLoadingBoards] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<BoardSummary[]>('/boards')
      .then(setBoards)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Could not load boards'),
      )
      .finally(() => setLoadingBoards(false));
  }, [user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const board = await api<BoardSummary>('/boards', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setBoards((prev) => [board, ...prev]);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create board');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <NavBar />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Your boards</h1>
          <form onSubmit={onCreate} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New board name…"
              className="w-52 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {loadingBoards ? (
          <p className="mt-8 text-slate-400">Loading boards…</p>
        ) : boards.length === 0 ? (
          <div className="mt-16 text-center text-slate-500">
            <p className="text-lg">No boards yet</p>
            <p className="mt-1 text-sm">
              Create your first board to start organizing work.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold group-hover:text-brand-700">
                    {board.name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_STYLES[board.role] ?? ROLE_STYLES.VIEWER
                    }`}
                  >
                    {board.role}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Owner: {board.ownerName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {board.columnCount} column{board.columnCount === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}