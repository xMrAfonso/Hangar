<script lang="ts" setup>
import type { HangarProjectPage } from "#shared/types/backend";

interface PageOption {
  value: number;
  text: string;
  depth: number;
}

const props = defineProps<{
  projectId: number;
  pages: HangarProjectPage[];
}>();

const i18n = useI18n();
const v = useVuelidate();

const updateProjectPagesCallback = inject<(pages: HangarProjectPage[]) => void>("updateProjectPages");
const modal = useTemplateRef("modal");

const pageRoots = computed<PageOption[]>(() => [{ value: -1, text: "No parent", depth: 0 }, ...flatDeep(props.pages)]);
const selectedParent = computed(() => pageRoots.value.find((page) => page.value === (body.parentId ?? -1)) ?? pageRoots.value[0]);
const loading = ref<boolean>(false);

const body = reactive({
  projectId: props.projectId,
  name: "",
  parentId: undefined as number | undefined,
});
const rules = [
  required(),
  maxLength()(useBackendData.validations.project.pageName.max!),
  minLength()(useBackendData.validations.project.pageName.min!),
  pattern()(useBackendData.validations.project.pageName.regex!),
  validPageName()(body),
];

function flatDeep(pages: HangarProjectPage[], depth = 0): PageOption[] {
  let ps: PageOption[] = [];
  for (const page of pages) {
    ps.push({ value: page.id, text: page.name, depth });
    if (page.children.length > 0) {
      ps = [...ps, ...flatDeep(page.children, depth + 1)];
    }
  }
  return ps;
}

function optionDepth(option: string | Record<string, any>) {
  return typeof option === "object" && option && "depth" in option ? Number(option.depth) || 0 : 0;
}

async function createPage() {
  try {
    loading.value = true;
    if (!(await v.value.$validate())) return;
    await useInternalApi<string>(`pages/create/${props.projectId}`, "post", {
      name: body.name,
      parentId: body.parentId === -1 ? undefined : body.parentId,
    });

    body.name = "";
    body.parentId = undefined;

    if (updateProjectPagesCallback) {
      updateProjectPagesCallback(await useInternalApi<HangarProjectPage[]>(`pages/list/${props.projectId}`, "get"));
    }

    v.value.$reset();
    modal.value?.close();
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal
    ref="modal"
    :title="i18n.t('page.new.title')"
    window-classes="compact-page-modal w-full max-w-lg !rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg !bg-white dark:!bg-charcoal-900"
    close-button-right
  >
    <div class="space-y-3">
      <InputText
        v-model.trim="body.name"
        :label="i18n.t('page.new.name')"
        counter
        :maxlength="useBackendData.validations.project.pageName.max"
        :minlength="useBackendData.validations.project.pageName.min"
        :rules="rules"
      />
      <div>
        <DropdownSelect
          v-model="body.parentId"
          :values="pageRoots"
          item-text="text"
          item-value="value"
          :label="i18n.t('page.new.parent')"
          button-class="!h-9 !justify-start !py-1 text-sm"
          :container="false"
        >
          <template #button-label>
            <span class="flex w-full min-w-0 justify-start">
              <span class="truncate text-left text-sm">{{ selectedParent?.text }}</span>
            </span>
          </template>
          <template #option="{ option }">
            <span class="flex min-w-0 items-center gap-2 text-sm" :style="{ paddingLeft: `${optionDepth(option) * 0.875}rem` }">
                <span
                  v-if="optionDepth(option) > 0"
                  class="h-2.5 w-2.5 flex-shrink-0 rounded-bl-md border-b border-l border-gray-300 dark:border-gray-700"
                />
                <span class="truncate">{{ typeof option === "string" ? option : option.text }}</span>
              </span>
          </template>
        </DropdownSelect>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <Button button-type="secondary" class="!h-9 !px-3 !py-1 text-sm" :disabled="loading" @click="modal?.close()">Cancel</Button>
      <Button class="!h-9 !px-3 !py-1 text-sm" :disabled="loading" :loading="loading" @click="createPage">{{ i18n.t("general.create") }}</Button>
    </div>
    <template #activator="{ on }">
      <Button v-bind="$attrs" size="small" v-on="on">
        <IconMdiPlus />
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
:global(.compact-page-modal) {
  padding: 1.25rem;
}

:global(.compact-page-modal [data-close]) {
  height: 2rem !important;
  width: 2rem !important;
}

:global(.compact-page-modal input) {
  min-height: 2.25rem;
  font-size: 0.875rem;
}

:global(.compact-page-modal label:has(input)) {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

</style>
