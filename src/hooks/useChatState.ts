import { create } from 'zustand';

interface ChatState {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const useChatState = create<ChatState>(set => ({
  chatOpen: false,
  setChatOpen: open => set({ chatOpen: open }),
}));

export default useChatState;
