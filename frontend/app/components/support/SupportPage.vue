<script setup lang="ts">
import { getSupportSection, supportSections } from "~/components/support/SupportNav";

const props = withDefaults(
  defineProps<{
    section?: string;
  }>(),
  {
    section: "overview",
  }
);

const activeSection = computed(() => getSupportSection(props.section));
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
    <aside class="min-w-0 lg:sticky lg:top-4">
      <nav
        aria-label="Support"
        class="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2 dark:border-gray-800 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:pr-3 lg:pb-0"
      >
        <NuxtLink
          v-for="navSection in supportSections"
          :key="navSection.id"
          :to="navSection.to"
          class="inline-flex h-10 min-w-max items-center rounded-lg border px-3 text-sm font-semibold transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800 lg:min-w-0 lg:justify-start"
          :class="activeSection === navSection.id ? 'border-primary-500 color-primary' : 'border-transparent text-gray-700 dark:text-gray-300'"
          :style="
            activeSection === navSection.id
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--primary-500) 18%, transparent)',
                  borderColor: 'var(--primary-500)',
                }
              : {}
          "
        >
          <span class="truncate">{{ navSection.label }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <slot />
  </div>
</template>
