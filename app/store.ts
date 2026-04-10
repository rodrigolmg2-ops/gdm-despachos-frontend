import { create } from 'zustand';

interface Analysis {
  id: string;
  timestamp: string;
  processText: string;
  enquadramento: {
    tipo: string;
    objeto: string;
    fase: string;
    destinatario: string;
    modelo: string;
  };
  alertas: string[];
  minuta: string;
  savedFile?: {
    id: string;
    link: string;
    name: string;
  };
}

interface AppStore {
  apiUrl: string;
  folderIdConfigured: boolean;
  setApiUrl: (url: string) => void;
  setFolderIdConfigured: (configured: boolean) => void;
  analyses: Analysis[];
  addAnalysis: (analysis: Analysis) => void;
  clearAnalyses: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedAnalysisId: string | null;
  setSelectedAnalysisId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  apiUrl: typeof window !== 'undefined' 
    ? localStorage.getItem('apiUrl') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  folderIdConfigured: typeof window !== 'undefined'
    ? localStorage.getItem('folderIdConfigured') === 'true'
    : false,
  setApiUrl: (url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apiUrl', url);
    }
    set({ apiUrl: url });
  },
  setFolderIdConfigured: (configured: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('folderIdConfigured', String(configured));
    }
    set({ folderIdConfigured: configured });
  },

  analyses: typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('analyses') || '[]')
    : [],
  addAnalysis: (analysis: Analysis) => {
    set((state) => {
      const newAnalyses = [analysis, ...state.analyses];
      if (typeof window !== 'undefined') {
        localStorage.setItem('analyses', JSON.stringify(newAnalyses));
      }
      return { analyses: newAnalyses };
    });
  },
  clearAnalyses: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('analyses');
    }
    set({ analyses: [] });
  },

  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  selectedAnalysisId: null,
  setSelectedAnalysisId: (id: string | null) => set({ selectedAnalysisId: id }),
}));
