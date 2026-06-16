<script lang="ts" setup>
import type { Platform, Version, PluginDependency } from "#shared/types/backend";
import DependencyTableRow from "~/components/projects/DependencyTableRow.vue";

const i18n = useI18n();
const t = i18n.t;

const props = withDefaults(
  defineProps<{
    pluginDependencies: Version["pluginDependencies"];
    platform: Platform;
    noEditing?: boolean;
  }>(),
  {
    noEditing: false,
  }
);

const dependencies = ref<(PluginDependency & { id?: string; mode: "file" | "url" })[]>([]);

watch(
  () => props.pluginDependencies[props.platform],
  (newVal) => (dependencies.value = newVal ? [...newVal].map((dep) => ({ ...dep, id: "id" + Math.random(), mode: dep.externalUrl ? "url" : "file" })) : []),
  { immediate: true }
);

function addDep() {
  dependencies.value.push({
    platform: props.platform,
    name: "",
    required: true,
    mode: "file",
    id: "id" + Math.random(),
    externalUrl: undefined,
    projectId: -1,
  });
}

function deleteDep(index: number) {
  dependencies.value.splice(index, 1);
}

function reset() {
  dependencies.value.splice(0);
}

defineExpose({ dependencies, reset });
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <table class="w-full flex-shrink-0 table-fixed">
      <colgroup>
        <col class="w-30" />
        <col />
        <col class="w-32" />
        <col class="w-20" />
        <col v-if="!noEditing" class="w-12" />
      </colgroup>
      <thead class="text-left text-xs font-semibold text-gray">
        <tr class="border-b dark:border-gray-800">
          <th class="px-2 py-2.5">Source</th>
          <th class="px-3 py-2.5">Dependency</th>
          <th class="px-2 py-2.5">Name</th>
          <th class="px-2 py-2.5">Required</th>
          <th v-if="!noEditing" class="px-2 py-2.5" />
        </tr>
      </thead>
    </table>
    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <table class="w-full table-fixed">
        <colgroup>
          <col class="w-30" />
          <col />
          <col class="w-32" />
          <col class="w-20" />
          <col v-if="!noEditing" class="w-12" />
        </colgroup>
        <tbody>
          <DependencyTableRow
            v-for="(dep, index) in dependencies"
            :key="`${platform}-${dep.id}`"
            v-model="dependencies[index]!"
            :idx="index"
            :no-editing="noEditing"
            @delete="deleteDep(index)"
          />
          <tr v-if="dependencies.length === 0">
            <td :colspan="noEditing ? 4 : 5" class="px-4 py-8 text-center">
              <IconMdiLinkVariant class="mx-auto mb-2 text-2xl text-gray" />
              <p class="font-semibold">No dependencies</p>
              <p class="mt-1 text-sm text-gray">Add a Hangar project or an external plugin URL.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!noEditing" class="flex-shrink-0 border-t p-2 dark:border-gray-800">
      <Button button-type="secondary" size="medium" class="w-full" @click="addDep">
        <IconMdiPlus class="mr-1" />
        {{ t("general.add") }} dependency
      </Button>
    </div>
  </div>
</template>
