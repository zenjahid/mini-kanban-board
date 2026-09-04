'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
}

interface TaskCardLayoutProps {
  task: Task;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  overlay?: boolean;
}

/** Six-dot grip icon — a clear "this is draggable" affordance. */
function GripIcon() {
  return (
    <svg
      width="12"
      height="18"
      viewBox="0 0 12 18"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="3.5" cy="3" r="1.5" />
      <circle cx="8.5" cy="3" r="1.5" />
      <circle cx="3.5" cy="9" r="1.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <circle cx="3.5" cy="15" r="1.5" />
      <circle cx="8.5" cy="15" r="1.5" />
    </svg>
  );
}

/** Presentational card body (also reused by the DragOverlay). */
export function TaskCardLayout({
  task,
  canEdit,
  onDelete,
  onOpen,
  overlay,
}: TaskCardLayoutProps) {
  return (
    <div
      onClick={canEdit ? () => onOpen(task) : undefined}
      className={`group flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-400 hover:shadow-md ${
        canEdit ? 'cursor-pointer' : ''
      } ${overlay ? 'rotate-2 shadow-lg ring-2 ring-brand-400' : ''}`}
    >
      <span
        className={`mt-0.5 ${
          canEdit
            ? 'text-slate-400 group-hover:text-brand-500'
            : 'text-slate-300'
        }`}
      >
        <GripIcon />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p
            className="break-words text-sm font-medium text-slate-800"
            title={canEdit ? 'Click to edit' : task.title}
          >
            {task.title}
          </p>
          {canEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="invisible shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:visible"
              aria-label="Delete task"
            >
              ✕
            </button>
          )}
        </div>

        {(task.description || task.assignee) && (
          <div className="mt-1.5 flex items-start gap-2 text-xs text-slate-500">
            {task.description && (
              <span className="line-clamp-2 whitespace-pre-wrap">
                {task.description}
              </span>
            )}
            {task.assignee && (
              <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                {task.assignee.name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Sortable draggable task card. The whole card is the drag handle. */
export default function SortableTaskCard({
  task,
  canEdit,
  onDelete,
  onOpen,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task:${task.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(canEdit ? { touchAction: 'none' } : {}),
  };

  // Whole-card dragging for editors; read-only cards stay inert.
  const dragProps = canEdit ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={canEdit ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <TaskCardLayout
        task={task}
        canEdit={canEdit}
        onDelete={onDelete}
        onOpen={onOpen}
      />
    </div>
  );
}