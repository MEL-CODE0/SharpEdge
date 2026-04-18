import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const safeParseUser = () => {
  try {
    const raw = localStorage.getItem('sharpedge-user')
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('sharpedge-user')
    return null
  }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'sharpedge-auth',
      // Custom storage to avoid JSON.parse crashes
      storage: {
        getItem: (name) => {
          try {
            const raw = localStorage.getItem(name)
            if (!raw || raw === 'undefined') return null
            return JSON.parse(raw)
          } catch {
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
