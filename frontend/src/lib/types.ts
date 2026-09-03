export interface User {
  id: string;
  email: string;
  name: string;
}

export type BoardRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

export interface BoardMember {
  id: string;
  role: BoardRole;
  user: User;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  owner: User;
  members: BoardMember[];
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  role: BoardRole;
  columnCount: number;
  updatedAt: string;
}