import { create } from 'zustand';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  openAlert: (title: string, message: string, onConfirm?: () => void) => void;
  closeAlert: () => void;
}

const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null,
  openAlert: (title, message, onConfirm) => set({ isOpen: true, title, message, onConfirm: onConfirm || (() => {}) }),
  closeAlert: () => set({ isOpen: false, title: '', message: '', onConfirm: null }),
}));

export default useAlertStore; 