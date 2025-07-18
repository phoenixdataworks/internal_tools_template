'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavState {
  expanded: boolean;
  previousState: boolean;
  setExpanded: (expanded: boolean) => void;
  setPreviousState: (expanded: boolean) => void;
}

const useNavState = create<NavState>()(
  persist(
    set => ({
      expanded: true,
      previousState: true,
      setExpanded: (expanded: boolean) => set({ expanded }),
      setPreviousState: (expanded: boolean) => set({ previousState: expanded }),
    }),
    {
      name: 'nav-state',
      partialize: state => ({
        expanded: state.expanded,
      }),
    }
  )
);

export default useNavState;
