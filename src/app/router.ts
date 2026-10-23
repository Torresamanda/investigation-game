import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { getCurrentMatch } from '../services/match-session'
import { useMatchStore } from '../stores/match'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'worlds',
        component: () => import('../features/worlds/WorldSelection.vue'),
      },
      {
        path: '/investigacao',
        name: 'investigation',
        component: () => import('../features/investigation/InvestigationView.vue'),
        beforeEnter: async () => {
          const match = useMatchStore()
          if (match.investigatorId) return true
          const matchId = getCurrentMatch()
          if (!matchId) return { name: 'worlds' }
          try {
            await match.resumeRemoteMatch(matchId)
            return true
          } catch {
            return { name: 'worlds' }
          }
        },
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })
  return router
}

export const router = createAppRouter()
