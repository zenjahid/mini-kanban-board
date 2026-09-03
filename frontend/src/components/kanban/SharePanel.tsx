'use client';

import { useState } from 'react';
import type { Board, BoardRole } from '@/lib/types';

interface SharePanelProps {
  board: Board;
  isOwner: boolean;
  onAddMember: (email: string, role: BoardRole) => Promise<void>;
  onUpdateRole: (userId: string, role: BoardRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onClose: () => void;
}

export default function SharePanel({
  board,
  isOwner,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
  onClose,
}: SharePanelProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BoardRole>('VIEWER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onAddMember(email, role);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member');
    } finally {
      setBusy(false);
    }
  };

  const roleLabel: Record<BoardRole, string> = {
    OWNER: 'Owner',
    EDITOR: 'Editor',
    VIEWER: 'Viewer',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share board</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Member list */}
        <div className="mt-4 divide-y divide-slate-100">
          {board.members.map((m) => {
            const isCurrentOwner = m.role === 'OWNER';
            return (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {m.user.email}
                  </p>
                </div>
                {isCurrentOwner ? (
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                    Owner
                  </span>
                ) : isOwner ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        onUpdateRole(m.user.id, e.target.value as BoardRole)
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      onClick={() => onRemoveMember(m.user.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                      aria-label="Remove member"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {roleLabel[m.role]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Add member */}
        {isOwner && (
          <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium">Invite a registered user</p>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as BoardRole)}
                className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}