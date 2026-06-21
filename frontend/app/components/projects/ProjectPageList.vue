<script setup lang="ts">
import { NamedPermission } from "#shared/types/backend";
import type { HangarProject } from "#shared/types/backend";

defineProps<{
  project?: HangarProject;
  open: string[];
}>();

const i18n = useI18n();
const route = useRoute("user-project");

function pageUrl(page: HangarProject["pages"][number]): string {
  if (page.home) {
    return `/${route.params.user}/${route.params.project}`;
  }
  return `/${route.params.user}/${route.params.project}/pages/${page.slug}`;
}
</script>

<template>
  <Card class="!p-0 overflow-hidden">
    <template #header>
      <div class="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h2>{{ i18n.t("page.plural") }}</h2>
        <div class="flex-grow" />
        <NewPageModal v-if="project && hasPerms(NamedPermission.EditPage)" :pages="project.pages" :project-id="project.id" />
      </div>
    </template>

    <div class="px-3 py-3">
      <div v-if="project">
        <TreeView :items="project.pages" item-key="slug" :open="open" clazz="py-0.5" hide-toggle>
          <template #item="{ expanded, hasChildren, item, toggle }">
            <div
              class="flex min-h-9 min-w-0 flex-grow items-center rounded-lg border border-transparent font-semibold transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800"
            >
              <NuxtLink
                :to="pageUrl(item)"
                class="flex min-w-0 flex-grow items-center self-stretch py-1.5 pl-3 text-current decoration-none hover:no-underline"
                exact-active-class="color-primary"
              >
                <span class="truncate">{{ item.name }}</span>
              </NuxtLink>
              <button
                v-if="hasChildren"
                type="button"
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center text-gray transition-colors hover:color-primary"
                :aria-label="expanded ? 'Collapse page' : 'Expand page'"
                @click="toggle"
              >
                <IconMdiChevronDown :class="'text-lg transform transition-transform ' + (expanded ? 'rotate-0' : '-rotate-90')" />
              </button>
              <span v-else class="w-3 flex-shrink-0" />
            </div>
          </template>
        </TreeView>
      </div>
      <Skeleton v-else />
    </div>
  </Card>
</template>
