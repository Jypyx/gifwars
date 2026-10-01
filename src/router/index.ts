import { createRouter, createWebHistory } from 'vue-router'
import SplashView from '../views/SplashView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: SplashView,
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
