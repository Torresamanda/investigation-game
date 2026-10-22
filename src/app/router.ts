import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
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
        beforeEnter: () => (useMatchStore().investigatorId ? true : { name: 'worlds' }),
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })
  return router
}

export const router = createAppRouter()
