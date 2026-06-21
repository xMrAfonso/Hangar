<script setup lang="ts">
import type { Project, ProjectCompact } from "#shared/types/backend";

defineProps<{
  project: Project | ProjectCompact;
}>();
</script>

<template>
  <NuxtLink
    :to="`/${project.namespace.owner}/${project.namespace.slug}`"
    class="flex h-full min-h-156px gap-4 overflow-hidden rounded-lg border border-[var(--charcoal-500)] bg-[var(--charcoal-700)] p-4 text-[#e0e6f0] transition hover:translate-y-[-1px] hover:border-primary-500 lt-sm:min-h-176px lt-sm:flex-col"
  >
    <UserAvatar
      :username="project.namespace.owner"
      :img-src="project.avatarUrl"
      disable-link
      decorative
      class="h-76px w-76px flex-shrink-0 overflow-hidden rounded-lg lt-sm:h-58px lt-sm:w-58px"
    />

    <div class="min-w-0 flex-1">
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-[850]">{{ project.name }}</h3>
          <p class="truncate text-[var(--charcoal-200)]">by {{ project.namespace.owner }}</p>
        </div>
        <span
          class="inline-flex max-w-[42%] flex-shrink-0 items-center gap-1 overflow-hidden truncate rounded-md border border-[var(--charcoal-500)] bg-[var(--charcoal-600)] px-2 py-1 text-xs text-[var(--charcoal-100)] font-bold lt-sm:max-w-[52%]"
        >
          <CategoryLogo :category="project.category" :size="16" />
          {{ $t("project.category." + project.category) }}
        </span>
      </div>

      <p class="compact-card-description mt-3 overflow-hidden text-[var(--charcoal-200)] leading-normal">{{ project.description }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.compact-card-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
