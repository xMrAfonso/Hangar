<script setup lang="ts">
import type { Step } from "#shared/types/components/design/Steps";
import {
  getSpigotResourceCategory,
  getSpigotResourceIcon,
  getSpigotResourceId,
  getSpigotResourcePrice,
  getSpigotResourceTitle,
  getSpigotResourceVersion,
} from "~/composables/useProjectImporter";
import type { ImportedProject, SpigotAuthor, SpigotResource } from "~/composables/useProjectImporter";
import { Category, Tag } from "#shared/types/backend";

definePageMeta({
  loginRequired: true,
});

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

const selectedStep = ref("intro");
const steps: Step[] = [
  {
    value: "intro",
    header: t("importer.step1.title"),
    showBack: false,
  },
  {
    value: "userSelection",
    header: t("importer.step2.title"),
    showBack: false,
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }
      spigotResources.value = [];
      if (spigotAuthor.value) {
        spigotResources.value = await getAllSpigotResourcesByAuthor(spigotAuthor.value.id);
        return true;
      } else {
        return false;
      }
    },
  },
  {
    value: "projectSelection",
    header: t("importer.step3.title"),
    showBack: true,
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
    showNext: computed(() => spigotResources.value?.length > 0),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }
      hangarResources.value = [];
      if (auth.user) {
        const ownerId = auth.user.id;
        const selected = spigotResources.value.filter((r) => selectedSpigotResources.value.includes(getSpigotResourceId(r)));
        hangarResources.value = (await convertSpigotProjects(selected, ownerId)) as ImportedProject[];
        return true;
      } else {
        return false;
      }
    },
  },
  {
    value: "projectConversion",
    header: t("importer.step4.title"),
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }
      createProjects();
      return true;
    },
  },
  { value: "finishing", header: t("importer.step5.title"), showNext: false, showBack: false },
];

const { projectOwners } = usePossibleOwners();
const username = ref();
const spigotAuthor = ref<SpigotAuthor | undefined>();
const spigotResources = ref<SpigotResource[]>([]);
const selectedSpigotResources = ref<string[]>([]);
const hangarResources: Ref<ImportedProject[]> = ref([]);
const selectedResourceCount = computed(() => selectedSpigotResources.value.length);
const createdStatuses = computed(() => Object.values(status));

const additionalRules = {
  spigotAuthor: {
    required,
  },
};
const additionalModel = computed(() => ({
  spigotAuthor: spigotAuthor.value,
}));
const v = useVuelidate(additionalRules, additionalModel);

watchDebounced(
  username,
  async () => {
    spigotAuthor.value = undefined;
    if (!username.value?.trim()) {
      return;
    }
    try {
      spigotAuthor.value = await getSpigotAuthor(username.value);
    } catch (err) {
      // don't need popup about not found and wrong format
      if (!(err instanceof Error) || (!err.message.includes("404") && !err.message.includes("400"))) {
        handleRequestError(err);
      }
    }
  },
  { debounce: 250 }
);

function remove(project: ImportedProject) {
  hangarResources.value = hangarResources.value.filter((p) => p !== project);
}

function updatePageContent(project: ImportedProject, raw: string) {
  project.pageContent = raw;
}

const status = reactive<Record<string, { project: ImportedProject; loading: boolean; success: boolean; result: string; errors: string[] }>>({});

function createProjects() {
  for (const project of hangarResources.value) {
    createProject(project);
  }
}

function createProject(project: ImportedProject) {
  status[project.name] = { project, loading: true, success: true, result: "", errors: [] };
  if (!project.pageContent) {
    project.pageContent = "# " + project.name + "  \nWelcome to your new project!";
  }
  if (!project.util.isCustomLicense) {
    project.settings.license.name = undefined as unknown as string;
  }
  if (project.util.licenseUnset) {
    project.settings.license.url = undefined;
  }
  useInternalApi<string>("projects/create", "post", project, { timeout: 10_000 })
    .then((u) => {
      status[project.name]!.success = true;
      status[project.name]!.result = u;
    })
    .catch((err) => {
      if (err.response?.data.fieldErrors == undefined) {
        status[project.name]!.errors.push("Unknown error");
      } else {
        for (const e of err.response.data.fieldErrors) {
          status[project.name]!.errors.push(t(e.errorMsg));
        }
      }

      handleRequestError(err);
    })
    .finally(() => {
      status[project.name]!.loading = false;
    });
}

const loggedIn = useAuthStore().user !== null;

useSeo(computed(() => ({ title: t("importer.title"), route })));
</script>

<template>
  <div class="min-w-0">
    <PageTitle>{{ t("importer.title") }}</PageTitle>
    <p v-if="!loggedIn">{{ t("importer.notLoggedIn") }}</p>

    <Steps v-else v-model="selectedStep" :steps="steps" button-lang-key="importer.step" tracking-name="importer">
      <template #intro>
        <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <h2 class="text-xl font-bold">Bring projects into Hangar</h2>
            <p class="mt-1 max-w-2xl text-sm leading-relaxed text-gray">{{ t("importer.step1.text1") }}</p>
            <div class="mt-5 space-y-3 text-sm">
              <p class="flex items-start gap-2">
                <IconMdiCheck class="mt-0.5 flex-shrink-0 color-primary" />
                <span>Importer data can be reviewed before anything is created.</span>
              </p>
              <p class="flex items-start gap-2">
                <IconMdiCheck class="mt-0.5 flex-shrink-0 color-primary" />
                <span>You can adjust owners, names, categories, licenses, links, and project page content.</span>
              </p>
            </div>
            <Link
              to="/support/guidelines"
              class="group mt-5 flex max-w-2xl items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800"
            >
              <IconMdiFileDocumentOutline class="flex-shrink-0 text-lg text-gray" />
              <span class="min-w-0 flex-grow">
                <span class="block font-semibold">{{ t("importer.step1.text2") }}</span>
                <span class="block text-xs text-gray">Projects must follow Hangar publication rules.</span>
              </span>
              <IconMdiChevronRight class="flex-shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <aside class="border-gray-200 lg:border-l lg:pl-8 dark:border-gray-800">
            <IconMdiImport class="text-2xl text-gray" />
            <h2 class="mt-2 text-lg font-bold">Supported source</h2>
            <p class="mt-1 text-sm leading-relaxed text-gray">Spigot resources are supported right now. More import sources can use this flow later.</p>
          </aside>
        </div>
      </template>

      <template #userSelection>
        <div class="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section>
            <h2 class="text-lg font-bold">Find the source author</h2>
            <p class="mt-1 text-sm text-gray">{{ t("importer.step2.text") }}</p>
            <div class="mt-4">
              <InputText v-model="username" label="Spigot username" :rules="[required()]" />
            </div>
          </section>

          <section class="min-w-0">
            <h2 class="text-lg font-bold">Result</h2>
            <div v-if="spigotAuthor" class="mt-3 flex items-center gap-4 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-800">
              <UserAvatar :username="spigotAuthor.username" :avatar-url="spigotAuthor.avatar" disable-link size="md" />
              <div class="min-w-0">
                <div class="truncate text-lg font-semibold">{{ spigotAuthor.username }}</div>
                <div class="text-sm text-gray">#{{ spigotAuthor.id }} · {{ spigotAuthor.resource_count }} resources</div>
              </div>
            </div>
            <div v-else-if="username" class="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray dark:border-gray-700">
              Nothing found for this username yet.
            </div>
            <div v-else class="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray dark:border-gray-700">
              Search for a Spigot author to continue.
            </div>
          </section>
        </div>
      </template>

      <template #projectSelection>
        <div class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-bold">Choose projects</h2>
              <p class="mt-1 text-sm text-gray">{{ t("importer.step3.label") }}</p>
            </div>
            <span class="text-sm text-gray">{{ selectedResourceCount }} selected</span>
          </div>
          <Alert v-if="spigotResources.length === 0">No projects found!</Alert>
          <InputGroup
            v-else
            v-model="selectedSpigotResources"
            :rules="[required('Select at least one project!'), minLength()(1)]"
            label=""
            :silent-errors="false"
            full-width
          >
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <label
                v-for="project in spigotResources"
                :key="getSpigotResourceId(project)"
                class="relative flex min-h-24 cursor-pointer gap-3 rounded-lg border px-3 py-3 pr-10 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                :class="
                  selectedSpigotResources.includes(getSpigotResourceId(project)) ? 'border-primary-500 color-primary' : 'border-gray-200 dark:border-gray-800'
                "
                :style="
                  selectedSpigotResources.includes(getSpigotResourceId(project))
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--primary-500) 12%, transparent)',
                      }
                    : {}
                "
              >
                <input v-model="selectedSpigotResources" type="checkbox" :value="getSpigotResourceId(project)" class="sr-only" />
                <img
                  v-if="getSpigotResourceIcon(project)"
                  :src="getSpigotResourceIcon(project)"
                  alt=""
                  class="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <span v-else class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-lg text-gray dark:bg-gray-800">
                  <IconMdiPuzzleOutline />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold" :title="getSpigotResourceTitle(project)">{{ getSpigotResourceTitle(project) }}</span>
                  <span v-if="project.tag" class="mt-0.5 line-clamp-2 block text-xs leading-snug text-gray" :title="project.tag">
                    {{ project.tag }}
                  </span>
                  <span class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray">
                    <span v-if="getSpigotResourceVersion(project)">v{{ getSpigotResourceVersion(project) }}</span>
                    <span v-if="getSpigotResourceCategory(project)">{{ getSpigotResourceCategory(project) }}</span>
                    <span v-if="project.downloads !== undefined">{{ project.downloads.toLocaleString() }} downloads</span>
                    <span v-if="getSpigotResourcePrice(project)">{{ getSpigotResourcePrice(project) }}</span>
                  </span>
                </span>
                <IconMdiCheck
                  v-if="selectedSpigotResources.includes(getSpigotResourceId(project))"
                  class="absolute right-3 top-3 text-lg color-primary"
                  aria-hidden="true"
                />
              </label>
            </div>
          </InputGroup>
        </div>
      </template>

      <template #projectConversion>
        <div class="space-y-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-bold">Review converted projects</h2>
              <p class="mt-1 text-sm text-gray">Adjust imported data before creating Hangar projects.</p>
            </div>
            <span class="text-sm text-gray">{{ hangarResources.length }} projects ready</span>
          </div>

          <section
            v-for="project in hangarResources"
            :key="project.externalId"
            class="border-t border-gray-200 pt-5 first:border-t-0 first:pt-0 dark:border-gray-800"
          >
            <div class="grid gap-4 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] lg:items-start">
              <div class="flex min-w-0 items-center gap-3 lg:pt-6">
                <UserAvatar :username="project.name" :avatar-url="project.avatarUrl" disable-link class="flex-shrink-0" />
                <div class="min-w-0">
                  <h3 class="truncate text-lg font-bold">{{ project.name }}</h3>
                  <p class="text-xs text-gray">Imported resource</p>
                </div>
              </div>

              <div class="min-w-0 flex-grow space-y-4">
                <div class="grid gap-x-3 gap-y-4 lg:grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)]">
                  <DropdownSelect v-model="project.ownerId" :values="projectOwners" item-value="id" item-text="name" label="Create as" :rules="[required()]" />
                  <div class="hidden lg:block">
                    <span class="mb-1 block text-sm font-semibold opacity-0">Separator</span>
                    <span class="flex h-10.5 items-center justify-center text-xl text-gray">/</span>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold">Name</label>
                    <InputText
                      v-model="project.name"
                      label="Name"
                      :maxlength="useBackendData.validations.project.name.max"
                      counter
                      :rules="[
                        required(),
                        maxLength()(useBackendData.validations.project.name.max!),
                        pattern()(useBackendData.validations.project.name.regex!),
                        validProjectName()(),
                      ]"
                    />
                  </div>

                  <div>
                    <label class="mb-1 block text-sm font-semibold">Description</label>
                    <InputText
                      v-model="project.description"
                      label="Description"
                      :rules="[required()]"
                      :maxlength="useBackendData.validations.project.desc.max"
                      counter
                    />
                  </div>
                  <span class="hidden lg:block" />
                  <DropdownSelect
                    v-model="project.category"
                    :values="useCategoryOptions"
                    label="Category"
                    :rules="[required(), (category) => category !== Category.Undefined]"
                    i18n-text-values
                  />
                </div>

                <details class="group border-t border-gray-200 pt-4 dark:border-gray-800">
                  <summary class="flex cursor-pointer list-none items-center gap-2 font-semibold">
                    <IconMdiChevronDown class="text-lg transition-transform group-open:rotate-180" />
                    Page content
                  </summary>
                  <div class="mt-3 px-3">
                    <ClientOnly>
                      <MarkdownEditor
                        :raw="project.pageContent"
                        :editing="true"
                        :deletable="false"
                        :saveable="false"
                        :cancellable="false"
                        no-padding-top
                        max-height="320px"
                        @update:raw="(e: string) => updatePageContent(project, e)"
                      />
                    </ClientOnly>
                  </div>
                </details>

                <details class="group border-t border-gray-200 pt-4 dark:border-gray-800">
                  <summary class="flex cursor-pointer list-none items-center gap-2 font-semibold">
                    <IconMdiChevronDown class="text-lg transition-transform group-open:rotate-180" />
                    Additional information
                  </summary>

                  <div class="mt-4 space-y-6">
                    <section>
                      <h4 class="mb-2 flex items-center gap-2 font-semibold"><IconMdiLink /> {{ t("project.new.step3.links") }}</h4>
                      <ProjectLinksForm v-model="project.settings.links" />
                    </section>

                    <section>
                      <h4 class="mb-2 flex items-center gap-2 font-semibold"><IconMdiTag /> {{ t("project.settings.tags.title") }}</h4>
                      <div class="grid gap-2 sm:grid-cols-3">
                        <button
                          v-for="tag in Object.values(Tag)"
                          :key="tag"
                          type="button"
                          class="flex h-10 items-center rounded-lg border px-3 text-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                          :class="project.settings.tags.includes(tag) ? 'color-primary' : 'border-gray-200 dark:border-gray-800'"
                          :style="
                            project.settings.tags.includes(tag)
                              ? {
                                  backgroundColor: 'color-mix(in srgb, var(--primary-500) 20%, transparent)',
                                  borderColor: 'var(--primary-500)',
                                }
                              : {}
                          "
                          @click="
                            project.settings.tags = project.settings.tags.includes(tag)
                              ? project.settings.tags.filter((currentTag) => currentTag !== tag)
                              : [...project.settings.tags, tag]
                          "
                        >
                          <IconMdiPuzzleOutline v-if="tag === Tag.ADDON" />
                          <IconMdiBookshelf v-else-if="tag === Tag.LIBRARY" />
                          <IconMdiLeaf v-else-if="tag === Tag.SUPPORTS_FOLIA" />
                          <span class="ml-1">{{ t("project.settings.tags." + tag + ".title") }}</span>
                          <IconMdiCheck v-if="project.settings.tags.includes(tag)" class="ml-auto" />
                        </button>
                      </div>
                    </section>

                    <section>
                      <h4 class="mb-2 flex items-center gap-2 font-semibold"><IconMdiLicense /> {{ t("project.new.step3.license") }}</h4>
                      <div class="grid gap-3 lg:grid-cols-2">
                        <DropdownSelect
                          v-model="project.settings.license.type"
                          :values="useLicenseOptions"
                          :label="t('project.new.step3.type')"
                          :rules="[required()]"
                        />
                        <InputText
                          v-if="project.util.isCustomLicense"
                          v-model.trim="project.settings.license.name"
                          :label="t('project.new.step3.customName')"
                          :rules="[
                            requiredIf()(project.util.isCustomLicense),
                            maxLength()(useBackendData.validations.project.license.max!),
                            pattern()(useBackendData.validations.project.license.regex!),
                          ]"
                        />
                        <InputText
                          v-if="!project.util.licenseUnset"
                          v-model.trim="project.settings.license.url"
                          :label="t('project.new.step3.url')"
                          :rules="[validUrl()]"
                        />
                      </div>
                    </section>

                    <section>
                      <h4 class="mb-2 flex items-center gap-2 font-semibold"><IconMdiCloudSearch /> {{ t("project.new.step3.keywords") }}</h4>
                      <InputTag
                        v-model="project.settings.keywords"
                        :label="t('project.new.step3.keywords')"
                        :tag-maxlength="useBackendData.validations?.project?.keywordName?.max || 16"
                        :rules="[maxLength()(useBackendData?.validations?.project?.keywords?.max || 5), noDuplicated()(() => project.settings.keywords)]"
                        :maxlength="useBackendData?.validations?.project?.keywords?.max || 5"
                        counter
                      />
                    </section>
                  </div>
                </details>
              </div>

              <Button
                button-type="borderless"
                class="justify-self-start lg:mt-6 lg:!h-10.5 hover:!border-red-600 hover:!bg-red-900/50"
                @click="remove(project)"
              >
                <IconMdiDeleteOutline class="mr-1" />
                Remove
              </Button>
            </div>
          </section>
        </div>
      </template>

      <template #finishing>
        <div class="space-y-4">
          <div>
            <h2 class="text-lg font-bold">Creation status</h2>
            <p class="mt-1 text-sm text-gray">Review the result of each project creation request.</p>
          </div>
          <div v-for="s in createdStatuses" :key="s.project.name" class="rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-800">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="truncate font-bold">{{ s.project.name }}</div>
                <div v-if="s.loading" class="text-sm text-gray">Creating project...</div>
              </div>
              <IconMdiLoading v-if="s.loading" class="animate-spin text-xl color-primary" />
              <IconMdiCheck v-else-if="s.success && s.errors.length === 0" class="text-xl text-green" />
              <IconMdiAlertOutline v-else class="text-xl text-red" />
            </div>
            <template v-if="s.errors && s.errors.length > 0">
              <div class="mt-2 text-sm text-red-400">
                {{ t("project.new.error.create") }}
                {{ s.errors.join(", ") }}
              </div>
              <Button class="mt-2" button-type="secondary" @click="createProject(s.project)">Retry</Button>
            </template>
            <template v-else-if="s.success && s.result">
              <Link :href="s.result" target="_blank" class="mt-2 inline-flex">Open project</Link>
            </template>
          </div>
          <div class="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-100/60 px-3 py-3 dark:border-gray-700 dark:bg-charcoal-500/60">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <IconMdiInformationOutline />
            </span>
            <div class="min-w-0">
              <div class="font-semibold">Upload your jar files next</div>
              <div class="text-sm text-gray">Imported projects are created without release files, so add versions before publishing them.</div>
            </div>
          </div>
        </div>
      </template>
    </Steps>
  </div>
</template>
