<script setup lang="ts">
import SupportPage from "~/components/support/SupportPage.vue";

const route = useRoute();
const section = computed(() => {
  const routeSection = "section" in route.params ? route.params.section : undefined;
  return Array.isArray(routeSection) ? routeSection[0] : routeSection?.toString();
});

definePageMeta({
  pageTransition: false,
});
</script>

<template>
  <SupportPage :section="section">
    <NuxtPage />
  </SupportPage>
</template>
