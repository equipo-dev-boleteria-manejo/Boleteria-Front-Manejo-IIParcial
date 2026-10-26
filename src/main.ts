import { createApp } from 'vue'
import './index.css'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './Presentation/Router'
import { useAuthStore } from './Presentation/Store/authStore'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const authStore = useAuthStore(pinia)
authStore.initializeAuth().finally(() => {
  router.isReady().then(() => {
    app.mount('#app')
  })
})
