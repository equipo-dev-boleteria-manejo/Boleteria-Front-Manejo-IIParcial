<template>
  <AppLayout v-if="!isPublicRoute">
    <router-view />
  </AppLayout>
  <router-view v-else />
  <NotificationSystem />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './Presentation/Components/AppLayout.vue'
import NotificationSystem from './Presentation/Components/NotificationSystem.vue'

const route = useRoute()
const isPublicRoute = computed(() => Boolean(route.meta?.public))
</script>
