import { create } from 'zustand';
import { Workspace } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  getWorkspaceById: (id: string) => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [
    {
      id: '1',
      user_id: 1,
      title: '성균관대학교',
      description: '성균관대학교 AI 역량 진단 프로젝트',
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    },
    {
      id: '2',
      user_id: 1,
      title: '숙명여자대학교',
      description: '숙명여자대학교 AI 역량 진단 프로젝트',
      created_at: '2024-03-02T00:00:00Z',
      updated_at: '2024-03-02T00:00:00Z'
    },
    {
      id: '3',
      user_id: 1,
      title: '경남대학교',
      description: '경남대학교 AI 역량 진단 프로젝트',
      created_at: '2024-03-03T00:00:00Z',
      updated_at: '2024-03-03T00:00:00Z'
    }
  ],
  currentWorkspace: null,
  
  setWorkspaces: (workspaces) =>
    set({ workspaces }),
  
  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),
    
  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, ...updates } : workspace
      ),
    })),
    
  deleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
    })),
    
  setCurrentWorkspace: (workspace) =>
    set({ currentWorkspace: workspace }),
    
  getWorkspaceById: (id: string) => {
    const state = get();
    return state.workspaces.find((workspace: Workspace) => workspace.id === id);
  },
})); 