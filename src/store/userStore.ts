import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserState = {
  name: string | null
  setName: (name: string) => void
  clearName: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: null,
      setName: (name: string) => set({ name }),
      clearName: () => set({ name: null }),
    }),
    {
      name: 'dopamine-user-storage',
    }
  )
)
