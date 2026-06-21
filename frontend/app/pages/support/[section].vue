<script setup lang="ts">
import SupportContent from "~/components/support/SupportContent.vue";

const route = useRoute();
const section = computed(() => route.params.section?.toString());

definePageMeta({
  pageTransition: false,
});
</script>

<template>
  <SupportContent :section="section" />
</template>
