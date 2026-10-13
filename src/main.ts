import { createApp } from 'vue'
import './index.css'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from './App.vue'
import Dashboard from './Presentation/Views/Dashboard.vue'
import Login from './Presentation/Views/Login.vue'
import { useAuthStore } from './Presentation/Store/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const authStore = useAuthStore(pinia)
authStore.initializeAuth().then(() => {
  app.mount('#app')
})
