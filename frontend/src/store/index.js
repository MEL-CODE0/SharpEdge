import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

// ── Notification store (session-only, not persisted) ──────────
export const useNotificationStore = create((set, get) => ({
  notifications: [],   // [{id, type, title, detail, time}]
  unreadCount: 0,
  seenArbIds: new Set(),
  seenVbIds: new Set(),

  checkNew: (arbs = [], vbs = []) => {
    const { seenArbIds, seenVbIds } = get()

    const newArbs = arbs.filter(a => !seenArbIds.has(a.id))
    const newVbs  = vbs.filter(v => !seenVbIds.has(v.id))

    // Update seen sets in place
    arbs.forEach(a => seenArbIds.add(a.id))
    vbs.forEach(v => seenVbIds.add(v.id))

    if (newArbs.length === 0 && newVbs.length === 0) return

    const fresh = [
      ...newArbs.map(a => ({
        id: `arb-${a.id}`,
        type: 'arb',
        title: a.match_name,
        detail: `+${a.profit_pct?.toFixed(2)}% arb · ${a.sport_title}`,
        time: new Date().toISOString(),
      })),
      ...newVbs.map(v => ({
        id: `vb-${v.id}`,
        type: 'value',
        title: v.match_name,
        detail: `+${v.ev_pct?.toFixed(2)}% EV · ${v.bookmaker}`,
        time: new Date().toISOString(),
      })),
    ]

    set(s => ({
      notifications: [...fresh, ...s.notifications].slice(0, 30),
      unreadCount: s.unreadCount + fresh.length,
      seenArbIds,
      seenVbIds,
    }))
  },

  markAllRead: () => set({ unreadCount: 0 }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
