import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useInvestigationStore } from '../stores/investigation'

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
        beforeEnter: () => (useInvestigationStore().investigatorId ? true : { name: 'worlds' }),
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })
  router.afterEach((to, from, failure) => {
    if (!failure && from.name === 'investigation' && to.name !== 'investigation') {
      useInvestigationStore().abandonInvestigation()
    }
  })
  return router
}

export const router = createAppRouter()
