<script lang="ts" setup>
import { ref } from "vue";
import Card from "./Card.vue";

// Props passthrough
const props = withDefaults(
  defineProps<{
    accent?: boolean;
    alternateBackground?: boolean;
    initiallyOpen?: boolean;
  }>(),
  {
    accent: false,
    alternateBackground: false,
    initiallyOpen: true,
  }
);

const isOpen = ref(props.initiallyOpen);

// Toggle handler
const toggle = () => {
  isOpen.value = !isOpen.value;
};

const hasSlotContent = (slot: any) => !!slot && slot().length > 0;
</script>

<template>
  <Card :accent="props.accent" :alternate-background="props.alternateBackground">
    <!-- Header Slot -->
    <template #header>
      <div class="flex items-center justify-between">
        <slot name="title" />
        <button class="cursor-pointer flex items-center justify-between" @click="toggle">
          <span
            class="ml-1 text-sm text-gray-400 border border-transparent hover:bg-gray-800 hover:border-gray-700 p-0.5 rounded-md transition-all duration-250"
          >
            <IconMdiChevronDown v-if="isOpen" class="text-xl text-white" />
            <IconMdiChevronUp v-else class="text-xl text-white" />
          </span>
        </button>
      </div>
    </template>

    <template #default>
      <div class="collapsible-content" :class="{ 'is-open': isOpen }">
        <div class="overflow-hidden">
          <slot />
        </div>
      </div>
    </template>

    <!-- Footer -->
    <template v-if="isOpen && hasSlotContent($slots.footer)" #footer>
      <slot name="footer" />
    </template>
  </Card>
</template>

<style scoped>
.collapsible-content {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.25s ease,
    opacity 0.25s ease;
}

.collapsible-content.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}
</style>
