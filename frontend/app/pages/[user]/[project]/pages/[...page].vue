<script lang="ts" setup>
import { NamedPermission } from "#shared/types/backend";
import type { HangarProject, User } from "#shared/types/backend";
import { useDataLoader } from "~/composables/useDataLoader";

const props = defineProps<{
  user?: User;
  project?: HangarProject;
}>();

const route = useRoute("user-project-pages-page");

const { data: page } = useDataLoader("page");

definePageMeta({
  dataLoader_page: true,
});

const open = useOpenProjectPages(route, props.project);
// useSeo is in ProjectPageMarkdown
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
    <section class="min-w-0 overflow-auto">
      <ProjectPageMarkdown
        :key="route.fullPath"
        v-slot="{ editingPage, changeEditingPage, savePage, deletePage }"
        :project="props.project"
        :page="page"
        :main-page="false"
      >
        <Card v-if="page" class="!p-0 pb-0 overflow-clip overflow-hidden">
          <ClientOnly v-if="hasPerms(NamedPermission.EditPage)">
            <MarkdownEditor
              class="project-page-editor"
              :editing="editingPage"
              :raw="page.contents"
              :deletable="page.deletable"
              :saveable="true"
              :cancellable="true"
              @update:editing="changeEditingPage"
              @save="savePage"
              @delete="deletePage"
            />
            <template #fallback>
              <Markdown :raw="page.contents" />
            </template>
          </ClientOnly>
          <Markdown v-else :raw="page.contents" />
        </Card>
      </ProjectPageMarkdown>
      <!--We have to blow up v-model:editing into :editing and @update:editing as we are inside a scope--->
    </section>
    <aside class="space-y-4 self-start lg:sticky lg:top-4">
      <ProjectPageList :project="project" :open="open" />
    </aside>
  </div>
</template>
