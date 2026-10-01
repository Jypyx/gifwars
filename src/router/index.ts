import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/combat',
      name: 'battle',
      // Lazy-loaded: keeps PixiJS out of the home page bundle.
      component: () => import('../views/BattleView.vue'),
    },
  ],
})

export default router
