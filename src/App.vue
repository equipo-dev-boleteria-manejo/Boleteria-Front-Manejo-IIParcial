<template>
  <AppLayout>
    <router-view />
  </AppLayout>
  <NotificationSystem />
</template>

<script setup lang="ts">
import AppLayout from './Presentation/Components/AppLayout.vue'
import NotificationSystem from './Presentation/Components/NotificationSystem.vue'
</script>
