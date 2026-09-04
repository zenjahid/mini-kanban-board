'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Board, BoardMember, BoardRole, Column, Task } from '@/lib/types';
import ColumnCard from './ColumnCard';
import SharePanel from './SharePanel';
import TaskEditorModal from './TaskEditorModal';
import { TaskCardLayout } from './TaskCard';

const TASK_PREFIX = 'task:';
const COLUMN_PREFIX = 'column:';

/** Locate a task across columns. */
function locateTask(
  cols: Column[],
  taskId: string,
): { ci: number; ti: number } | null {
  for (let ci = 0; ci < cols.length; ci++) {
    const ti = cols[ci].tasks.findIndex((t) => t.id === taskId);
    if (ti >= 0) return { ci, ti };
  }
  return null;
}

/**
 * Pure helper that returns a new columns array with the active task moved
 * into the position indicated by the pointer (over a task or an empty column),
 * plus the insertion point so the UI can render a drop indicator.
 */
function planMove(
  cols: Column[],
  activeId: string,
  overId: string,
  activeTop: number,
  overTop: number,
  overHeight: number,
): {
  columns: Column[];
  drop: { columnId: string; index: number } | null;
} {
  const activeTaskId = activeId.slice(TASK_PREFIX.length);
  const src = locateTask(cols, activeTaskId);
  if (!src) return { columns: cols, drop: null };

  let destColumnIndex: number;
  if (overId.startsWith(COLUMN_PREFIX)) {
    destColumnIndex = cols.findIndex(
      (c) => c.id === overId.slice(COLUMN_PREFIX.length),
    );
  } else {
    const loc = locateTask(cols, overId.slice(TASK_PREFIX.length));
    destColumnIndex = loc ? loc.ci : -1;
  }
  if (destColumnIndex < 0) return { columns: cols, drop: null };

  const next = cols.map((c) => ({ ...c, tasks: [...c.tasks] }));
  const srcCol = next[src.ci];
  const destCol = next[destColumnIndex];
  const [moved] = srcCol.tasks.splice(src.ti, 1);

  let insertAt: number;
  if (overId.startsWith(COLUMN_PREFIX)) {
    insertAt = destCol.tasks.length;
  } else {
    const overTaskId = overId.slice(TASK_PREFIX.length);
    const overIndex = destCol.tasks.findIndex((t) => t.id === overTaskId);
    const isBelowPointer = activeTop > overTop + overHeight / 2;
    insertAt =
      overIndex >= 0 ? overIndex + (isBelowPointer ? 1 : 0) : destCol.tasks.length;
  }

  destCol.tasks.splice(insertAt, 0, moved);
  return { columns: next, drop: { columnId: destCol.id, index: insertAt } };
}

export default function BoardView({ boardId }: { boardId: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [dropIndicator, setDropIndicator] = useState<{
    columnId: string;
    index: number;
  } | null>(null);

  // columnsRef is the synchronous source of truth while a drag is in flight.
  const columnsRef = useRef<Column[]>([]);
  const draggingRef = useRef(false);
  const skipBoardBlur = useRef(false);
  // Suppress the click right after a drag so dropping a card doesn't open it.
  const suppressClick = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  const applyBoard = useCallback((b: Board) => {
    setBoard(b);
    setColumns(b.columns);
    columnsRef.current = b.columns;
    setBoardName(b.name);
  }, []);

  // Load board.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api<Board>(`/boards/${boardId}`)
      .then((b) => {
        if (!active) return;
        applyBoard(b);
      })
      .catch((e) => {
        if (active) {
          setLoadError(
            e instanceof Error ? e.message : 'Failed to load board.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [boardId, applyBoard]);

  // Keep render state in sync when not actively dragging.
  useEffect(() => {
    if (!draggingRef.current && board) {
      setColumns(board.columns);
      columnsRef.current = board.columns;
    }
  }, [board]);

  const myRole: BoardRole =
    board?.members.find((m) => m.user.id === user?.id)?.role ?? 'VIEWER';
  const canEdit = myRole !== 'VIEWER';
  const isOwner = myRole === 'OWNER';

  // ---- Drag & drop ----

  const onDragStart = (event: DragStartEvent) => {
    draggingRef.current = true;
    const taskId = String(event.active.id).slice(TASK_PREFIX.length);
    const loc = locateTask(columnsRef.current, taskId);
    if (loc) {
      setActiveTask(columnsRef.current[loc.ci].tasks[loc.ti]);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeRect = active.rect.current.translated;
    const overRect = over.rect;
    if (!activeRect || !overRect) return;

    const { columns: next, drop } = planMove(
      columnsRef.current,
      String(active.id),
      String(over.id),
      activeRect.top,
      overRect.top,
      overRect.height,
    );
    columnsRef.current = next;
    setColumns(next);
    setDropIndicator(drop);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDropIndicator(null);
    draggingRef.current = false;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 150);

    if (!over || !board) {
      setColumns(board?.columns ?? []);
      columnsRef.current = board?.columns ?? [];
      return;
    }

    const taskId = String(active.id).slice(TASK_PREFIX.length);
    const loc = locateTask(columnsRef.current, taskId);
    if (!loc) return;

    const targetColumn = columnsRef.current[loc.ci];
    try {
      const updated = await api<Board>(
        `/boards/${boardId}/tasks/${taskId}/move`,
        {
          method: 'PATCH',
          body: JSON.stringify({ columnId: targetColumn.id, index: loc.ti }),
        },
      );
      applyBoard(updated);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Move failed');
      setColumns(board.columns);
      columnsRef.current = board.columns;
    }
  };

  const onDragCancel = () => {
    setActiveTask(null);
    setDropIndicator(null);
    draggingRef.current = false;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 150);
    setColumns(board?.columns ?? []);
    columnsRef.current = board?.columns ?? [];
  };

  // ---- Mutations ----

  const addTask = async (columnId: string, title: string) => {
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/columns/${columnId}/tasks`, {
          method: 'POST',
          body: JSON.stringify({ title }),
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not add task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/tasks/${taskId}`, {
          method: 'DELETE',
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not delete task');
    }
  };

  const openTask = (task: Task) => {
    if (suppressClick.current) return;
    setEditingTask(task);
  };

  const saveTask = async (
    taskId: string,
    data: {
      title: string;
      description: string | null;
      assigneeId: string | null;
    },
  ) => {
    applyBoard(
      await api<Board>(`/boards/${boardId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    );
  };

  const addColumn = async (name: string) => {
    setNewColumnName('');
    setAddingColumn(false);
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/columns`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not add column');
    }
  };

  const renameColumn = async (columnId: string, name: string) => {
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/columns/${columnId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not rename column');
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!window.confirm('Delete this column and all its tasks?')) return;
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/columns/${columnId}`, {
          method: 'DELETE',
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not delete column');
    }
  };

  const moveColumn = async (columnId: string, direction: -1 | 1) => {
    const current = columns.findIndex((c) => c.id === columnId);
    const nextIndex = current + direction;
    if (nextIndex < 0 || nextIndex >= columns.length) return;
    try {
      applyBoard(
        await api<Board>(`/boards/${boardId}/columns/${columnId}/move`, {
          method: 'PATCH',
          body: JSON.stringify({ index: nextIndex }),
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not move column');
    }
  };

  const finishRenameBoard = (cancelled: boolean) => {
    setEditingBoardName(false);
    const name = boardName.trim();
    if (cancelled || !name || name === board?.name) {
      setBoardName(board?.name ?? '');
      return;
    }
    void (async () => {
      try {
        await api(`/boards/${boardId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        });
        setBoard((prev) => (prev ? { ...prev, name } : prev));
      } catch (e) {
        setBoardName(board?.name ?? '');
        flash(e instanceof Error ? e.message : 'Could not rename board');
      }
    })();
  };

  const deleteBoard = async () => {
    if (!window.confirm('Delete this entire board?')) return;
    try {
      await api(`/boards/${boardId}`, { method: 'DELETE' });
      router.replace('/boards');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not delete board');
    }
  };

  // ---- Sharing ----

  const addMember = async (email: string, role: BoardRole) => {
    const members = await api<BoardMember[]>(
      `/boards/${boardId}/members`,
      { method: 'POST', body: JSON.stringify({ email, role }) },
    );
    setBoard((prev) => (prev ? { ...prev, members } : prev));
  };

  const updateMemberRole = async (userId: string, role: BoardRole) => {
    const members = await api<BoardMember[]>(
      `/boards/${boardId}/members/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
    );
    setBoard((prev) => (prev ? { ...prev, members } : prev));
  };

  const removeMember = async (userId: string) => {
    const members = await api<BoardMember[]>(
      `/boards/${boardId}/members/${userId}`,
      { method: 'DELETE' },
    );
    setBoard((prev) => (prev ? { ...prev, members } : prev));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading board…
      </div>
    );
  }

  if (loadError || !board) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-600">{loadError || 'Board not found.'}</p>
        <Link
          href="/boards"
          className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          Back to boards
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-4">
      {/* Board header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          {editingBoardName ? (
            <input
              autoFocus
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={() => {
                if (skipBoardBlur.current) {
                  skipBoardBlur.current = false;
                  return;
                }
                finishRenameBoard(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  skipBoardBlur.current = true;
                  finishRenameBoard(false);
                }
                if (e.key === 'Escape') {
                  skipBoardBlur.current = true;
                  finishRenameBoard(true);
                }
              }}
              className="w-full max-w-sm rounded-md border border-brand-500 px-2 py-1 text-xl font-semibold outline-none"
            />
          ) : (
            <h1
              className="text-xl font-semibold"
              onDoubleClick={
                canEdit ? () => setEditingBoardName(true) : undefined
              }
              title={canEdit ? 'Double-click to rename' : board.name}
            >
              {board.name}
              {myRole === 'VIEWER' && (
                <span className="ml-2 align-middle rounded-full bg-slate-200 px-2 py-0.5 text-xs font-normal text-slate-600">
                  Read-only
                </span>
              )}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Share
          </button>
          {isOwner && (
            <button
              onClick={deleteBoard}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {canEdit && (
        <p className="mb-3 text-xs text-slate-400">
          Drag cards to reorder — drop them in another column to move them.
          Click a card to edit.
        </p>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="kanban-scroll flex items-start gap-4 overflow-x-auto pb-4">
          {columns.map((column, i) => (
            <ColumnCard
              key={column.id}
              column={column}
              index={i}
              columnCount={columns.length}
              canEdit={canEdit}
              dropIndex={
                dropIndicator && dropIndicator.columnId === column.id
                  ? dropIndicator.index
                  : undefined
              }
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              onOpenTask={openTask}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
              onMoveColumn={moveColumn}
            />
          ))}

          {canEdit &&
            (addingColumn ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addColumn(newColumnName.trim() || 'New column');
                }}
                className="w-72 shrink-0 rounded-xl border border-dashed border-slate-300 bg-white/50 p-3"
              >
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name…"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700"
                  >
                    Add column
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingColumn(false)}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-72 shrink-0 rounded-xl border border-dashed border-slate-300 bg-white/50 p-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600"
              >
                + Add column
              </button>
            ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-64">
              <TaskCardLayout
                task={activeTask}
                canEdit={canEdit}
                onDelete={() => {}}
                onOpen={() => {}}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Share panel */}
      {shareOpen && (
        <SharePanel
          board={board}
          isOwner={isOwner}
          onAddMember={addMember}
          onUpdateRole={updateMemberRole}
          onRemoveMember={removeMember}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Task editor */}
      {editingTask && (
        <TaskEditorModal
          task={editingTask}
          members={board.members}
          onSave={saveTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}