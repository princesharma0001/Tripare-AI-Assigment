import { create } from 'zustand';

export type SizeBand = 'small' | 'medium' | 'large' | 'giant' | 'unknown';
export type CoatLength = 'short' | 'medium' | 'long' | 'wire';

export interface ExplorerFilters {
  groupIds: string[];
  sizeBands: SizeBand[];
  coatLengths: CoatLength[];
  hypoallergenic: boolean | null;
  minTraitScore: number;
  traitKey: 'good_with_children' | 'good_with_dogs' | 'good_with_strangers' | null;
}

interface ExplorerState {
  query: string;
  filters: ExplorerFilters;
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<ExplorerFilters>) => void;
  resetFilters: () => void;
}

const initialFilters: ExplorerFilters = {
  groupIds: [], sizeBands: [], coatLengths: [], hypoallergenic: null,
  minTraitScore: 3, traitKey: null
};

export const useExplorerStore = create<ExplorerState>((set) => ({
  query: '',
  filters: initialFilters,
  setQuery: query => set({ query }),
  setFilters: filters => set(state => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: initialFilters })
}));
