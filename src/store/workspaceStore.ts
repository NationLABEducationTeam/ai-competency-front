import { create } from 'zustand';
import { Workspace } from '../types';
import { workspaceAPI } from '../services/apiService';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  getWorkspaceById: (id: string) => Workspace | undefined;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,
  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await workspaceAPI.getAll();
      set({ workspaces, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch workspaces', loading: false });
    }
  },
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  getWorkspaceById: (id) => get().workspaces.find((ws) => ws.id === id),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  updateWorkspace: (workspace) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspace.id ? workspace : ws
      ),
    })),
  deleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((ws) => ws.id !== id),
    })),
})); 