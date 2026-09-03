'use client';

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void;
}

interface TaskCardLayoutProps {
  task: Task;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  overlay?: boolean;
}

/** Presentational card body (also reused by the DragOverlay). */
export function TaskCardLayout({
  task,
  canEdit,
  onDelete,
  onSaveTitle,
  overlay,
}: TaskCardLayoutProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const skipBlur = useRef(false);

  const commit = (cancelled: boolean) => {
    setEditing(false);
    if (cancelled) {
      setTitle(task.title);
      return;
    }
    const next = title.trim();
    if (next && next !== task.title) onSaveTitle(task.id, next);
    else setTitle(task.title);
  };

  return (
    <div
      className={`group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-500 hover:shadow ${
        overlay ? 'rotate-1 shadow-lg ring-2 ring-brand-400' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              commit(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                skipBlur.current = true;
                commit(false);
              }
              if (e.key === 'Escape') {
                skipBlur.current = true;
                commit(true);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-brand-500 px-1 py-0.5 text-sm outline-none"
          />
        ) : (
          <p
            className="flex-1 break-words text-sm font-medium"
            onDoubleClick={canEdit ? () => setEditing(true) : undefined}
            title={canEdit ? 'Double-click to edit' : task.title}
          >
            {task.title}
          </p>
        )}

        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="invisible rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:visible"
            aria-label="Delete task"
          >
            ✕
          </button>
        )}
      </div>

      {(task.description || task.assignee) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          {task.description && (
            <span className="line-clamp-2">{task.description}</span>
          )}
          {task.assignee && (
            <span className="ml-auto whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {task.assignee.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Sortable draggable task card for editor users. */
export default function SortableTaskCard({
  task,
  canEdit,
  onDelete,
  onSaveTitle,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task:${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded p-1 text-slate-300 hover:text-slate-500"
          aria-label="Drag task"
        >
          ⠿
        </button>
        <div className="pl-6">
          <TaskCardLayout
            task={task}
            canEdit={canEdit}
            onDelete={onDelete}
            onSaveTitle={onSaveTitle}
          />
        </div>
      </div>
    </div>
  );
}