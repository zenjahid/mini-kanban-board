'use client';

import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableTaskCard, { TaskCardLayout } from './TaskCard';
import type { Column, Task } from '@/lib/types';

interface ColumnCardProps {
  column: Column;
  index: number;
  columnCount: number;
  canEdit: boolean;
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTask: (task: Task) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
}

export default function ColumnCard(props: ColumnCardProps) {
  const {
    column,
    index,
    columnCount,
    canEdit,
    onAddTask,
    onDeleteTask,
    onOpenTask,
    onRenameColumn,
    onDeleteColumn,
    onMoveColumn,
  } = props;

  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
  });

  const [name, setName] = useState(column.name);
  const [editingName, setEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const skipBlur = useRef(false);

  const commitName = (cancelled: boolean) => {
    setEditingName(false);
    if (cancelled) {
      setName(column.name);
      return;
    }
    const next = name.trim();
    if (next && next !== column.name) onRenameColumn(column.id, next);
    else setName(column.name);
  };

  const submitTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onAddTask(column.id, title);
    setNewTitle('');
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-slate-100 transition ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              commitName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                skipBlur.current = true;
                commitName(false);
              }
              if (e.key === 'Escape') {
                skipBlur.current = true;
                commitName(true);
              }
            }}
            className="w-full rounded border border-brand-500 bg-white px-1 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <h3
            className="flex-1 truncate px-1 text-sm font-semibold"
            onDoubleClick={canEdit ? () => setEditingName(true) : undefined}
            title={canEdit ? 'Double-click to rename' : column.name}
          >
            {column.name}
          </h3>
        )}

        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {column.tasks.length}
        </span>

        {canEdit && (
          <div className="flex items-center text-slate-400">
            <button
              disabled={index === 0}
              onClick={() => onMoveColumn(column.id, -1)}
              className="px-0.5 hover:text-slate-700 disabled:opacity-30"
              aria-label="Move column left"
            >
              ◀
            </button>
            <button
              disabled={index === columnCount - 1}
              onClick={() => onMoveColumn(column.id, 1)}
              className="px-0.5 hover:text-slate-700 disabled:opacity-30"
              aria-label="Move column right"
            >
              ▶
            </button>
            <button
              onClick={() => onDeleteColumn(column.id)}
              className="px-0.5 hover:text-red-600"
              aria-label="Delete column"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={column.tasks.map((t) => `task:${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) =>
            canEdit ? (
              <SortableTaskCard
                key={task.id}
                task={task}
                canEdit={canEdit}
                onDelete={onDeleteTask}
                onOpen={onOpenTask}
              />
            ) : (
              <TaskCardLayout
                key={task.id}
                task={task}
                canEdit={false}
                onDelete={onDeleteTask}
                onOpen={onOpenTask}
              />
            ),
          )}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            {canEdit ? 'Drop tasks here' : 'No tasks'}
          </div>
        )}
      </div>

      {/* Add task */}
      {canEdit && (
        <form onSubmit={submitTask} className="border-t border-slate-200 p-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="+ Add a task…"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white"
          />
        </form>
      )}
    </div>
  );
}