<script lang="ts" setup>
import type { Step } from "#shared/types/components/design/Steps";
import type { HangarChannel, HangarProject, PendingVersion, Platform, PlatformData } from "#shared/types/backend";
import { guidelinesLastUpdated } from "~/content/guidelines";

definePageMeta({
  projectPermsRequired: ["CreateVersion"],
});

const globalData = useGlobalData();
const route = useRoute("user-project-versions-new");
const router = useRouter();
const i18n = useI18n();
const t = i18n.t;
const notification = useNotificationStore();
const props = defineProps<{
  project?: HangarProject;
}>();

const selectedStep = ref("artifact");
const steps: Step[] = [
  {
    value: "artifact",
    header: t("version.new.steps.1.header"),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }
      return createPendingVersion();
    },
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
  },
  {
    value: "basic",
    header: t("version.new.steps.2.header"),
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
    beforeNext: async () => await v.value.$validate(),
  },
  {
    value: "dependencies",
    header: t("version.new.steps.3.header"),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }

      if (!pendingVersion.value || !dependencyTables.value) {
        await notification.error("No pending version?!");
        return false;
      }

      for (let i = 0; i < selectedPlatforms.value.length; i++) {
        const platform = selectedPlatforms.value[i];
        const dependencyTable = dependencyTables.value[i];
        pendingVersion.value.pluginDependencies[platform as Platform] = dependencyTable!.dependencies;
      }

      return true;
    },
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
  },
  {
    value: "changelog",
    header: t("version.new.steps.4.header"),
    beforeNext: async () => {
      if (!(await v.value.$validate())) {
        return false;
      }
      await createVersion();
      return false; // createVersion already hijacks the beforeNext logic, cannot move next on final step.
    },
    disableNext: computed(() => v.value.$errors.length > 0 || v.value.$pending),
    beforeBack: () => {
      if (descriptionEditor.value) {
        lastDescription.value = descriptionEditor.value.rawEdited;
      }
      return true;
    },
  },
];

interface PlatformFile {
  platforms: Platform[];
  selectedTab: string;
  file?: File;
  url?: string;
}

const platformFiles = ref<PlatformFile[]>([{ platforms: [], selectedTab: "file" }]);

function addPlatformFile() {
  platformFiles.value.push({ platforms: [], selectedTab: "file" });
}

function removePlatformFile(id: number) {
  platformFiles.value.splice(id, 1);
}

function onArtifactFileChange(event: Event, platformFile: PlatformFile) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    platformFile.file = file;
  }
}

const dependencyTables = useTemplateRef("dependencyTables");
const pendingVersion = ref<PendingVersion>();
const { channels } = useProjectChannels(() => route.params.project);
const selectedPlatforms = ref<Platform[]>([]);
const descriptionEditor = useTemplateRef("descriptionEditor");
const lastDescription = ref();
const loading = reactive({
  create: false,
  submit: false,
});

const descriptionToLoad = computed(() => {
  if (lastDescription.value) {
    return lastDescription.value;
  }
  return pendingVersion.value?.description ?? "";
});

const selectedChannel = ref<string>("Release");
const currentChannel = computed(() => channels.value?.find((c) => c.name === selectedChannel.value));
const platformVersionSearch = reactive<Record<string, string>>({});
const platformVersionShowAll = reactive<Record<string, boolean>>({});

const selectedPlatformsData = computed<PlatformData[]>(() => {
  const result: PlatformData[] = [];
  for (const platformName of selectedPlatforms.value) {
    const p = usePlatformData(platformName);
    if (p) {
      result.push(p);
    }
  }
  return result;
});

const artifactURLRules = (platformFile: PlatformFile) => [validUrl(), requiredIf()(() => platformFile.selectedTab === "url")];
const platformRules = [required("Select at least one platform!"), minLength()(1), noDuplicated()(() => platformFiles.value.flatMap((f) => f.platforms))];
const versionRules = [required(), pattern()(useBackendData.validations.version.regex!), maxLength()(useBackendData.validations.version.max!)];
const platformVersionRules = [required("Select at least one platform version!"), minLength()(1)];
const changelogRules = [requiredIf()(() => selectedStep.value === "changelog")];

const v = useVuelidate();

const timeout = ref(30_000);
async function createPendingVersion() {
  selectedPlatforms.value.splice(0);

  loading.create = true;
  const formData: FormData = new FormData();
  const data = [];
  for (const platformFile of platformFiles.value) {
    if (platformFile.selectedTab === "file" && !platformFile.file) {
      notification.error("File is required");
      loading.create = false;
      return false;
    }
    if (platformFile.file && platformFile.file.size >= useBackendData.validations.project.maxFileSize) {
      notification.error(i18n.t("validation.maxFileSize"));
      loading.create = false;
      return false;
    }
    data.push({ platforms: platformFile.platforms, externalUrl: platformFile.url });
    for (const platform of platformFile.platforms) {
      selectedPlatforms.value.push(platform);
    }
    if (platformFile.file) {
      formData.append("files", platformFile.file);
    }
  }

  formData.append("channel", selectedChannel.value);
  formData.append(
    "data",
    new Blob([JSON.stringify(data)], {
      type: "application/json",
    })
  );

  pendingVersion.value = await useInternalApi<PendingVersion>(`versions/version/${props.project?.id}/upload`, "post", formData, {
    timeout: timeout.value,
  }).catch<any>((err) => {
    if (err.code === "ECONNABORTED") {
      notification.error("The request timed out, please try again.");
      timeout.value = timeout.value * 2;
    } else {
      handleRequestError(err);
    }
  });
  loading.create = false;

  if (pendingVersion.value && currentChannel.value) {
    pendingVersion.value.channelName = currentChannel.value.name;
    pendingVersion.value.channelDescription = currentChannel.value.description;
    pendingVersion.value.channelColor = currentChannel.value.color;
    pendingVersion.value.channelFlags = currentChannel.value.flags;
  }

  return pendingVersion.value !== undefined;
}

async function createVersion() {
  if (!pendingVersion.value || !currentChannel.value) {
    return;
  }

  loading.submit = true;
  pendingVersion.value.description = descriptionEditor.value!.rawEdited;
  pendingVersion.value.channelDescription = currentChannel.value.description;
  pendingVersion.value.channelColor = currentChannel.value.color;
  pendingVersion.value.channelFlags = currentChannel.value.flags;

  // played around trying to get this to happen in jackson's deserialization, but couldn't figure it out.
  for (const platform in pendingVersion.value.platformDependencies) {
    if (pendingVersion.value.platformDependencies[platform as Platform]?.length === 0) {
      delete pendingVersion.value.platformDependencies[platform as Platform];
    }
  }
  for (const platform in pendingVersion.value.pluginDependencies) {
    if (pendingVersion.value.pluginDependencies[platform as Platform]?.length === 0) {
      delete pendingVersion.value.pluginDependencies[platform as Platform];
    }
  }

  for (const platform in pendingVersion.value.platformDependencies) {
    if (!selectedPlatforms.value.includes(platform as Platform)) {
      delete pendingVersion.value.platformDependencies[platform as Platform];
      delete pendingVersion.value.pluginDependencies[platform as Platform];
    }
  }

  try {
    await useInternalApi(`versions/version/${props.project?.id}/create`, "post", pendingVersion.value, { timeout: 45_000 });
    await router.push(`/${route.params.user}/${route.params.project}/versions/${pendingVersion.value.versionString}`);
  } catch (err: any) {
    handleRequestError(err);
  } finally {
    loading.submit = false;
  }
}

function addChannel(channel: HangarChannel) {
  if (!channels.value) return;
  channels.value = channels.value.filter((c) => !c.temp);
  channels.value.push(Object.assign({ temp: true }, channel));
  selectedChannel.value = channel.name;
}

function channelOption(option: string | Record<string, any>): HangarChannel {
  return option as HangarChannel;
}

function togglePlatform(platformFile: PlatformFile, platform: Platform) {
  if (!globalData.value?.platforms) return;
  if (platformFile.platforms.includes(platform)) {
    platformFile.platforms = platformFile.platforms.filter((p) => p !== platform);
  } else {
    platformFile.platforms.push(platform);
  }
  platformFile.platforms.sort(
    (a, b) => globalData.value!.platforms.findIndex((p) => p.enumName === a) - globalData.value!.platforms.findIndex((p) => p.enumName === b)
  );
}

useSeo(
  computed(() => ({
    title: i18n.t("version.new.title") + " | " + props.project?.name,
    route,
    description: props.project?.description,
    image: props.project?.avatarUrl,
  }))
);
</script>

<template>
  <div>
    <Transition>
      <div v-if="loading.create" class="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/70 px-4">
        <div
          class="background-default flex w-full max-w-sm flex-col items-center rounded-xl border border-gray-200 px-6 py-7 text-center shadow-xl dark:border-gray-800"
        >
          <span class="inline-flex h-12 w-12 items-center justify-center text-2xl color-primary">
            <IconMdiLoading class="animate-spin" />
          </span>
          <h2 class="mt-3 text-xl font-bold">Uploading artifact</h2>
          <p class="mt-1 text-sm text-gray">Hang tight while we upload and prepare your version.</p>
        </div>
      </div>
    </Transition>

    <Steps v-model="selectedStep" :steps="steps" button-lang-key="version.new.steps." tracking-name="new-version">
      <template #artifact>
        <div class="space-y-8">
          <section>
            <div class="grid gap-2 sm:grid-cols-[minmax(0,24rem)_14rem] sm:items-end">
              <div>
                <label class="mb-1 block text-sm font-semibold">{{ t("version.new.form.channel") }}</label>
                <DropdownSelect v-model="selectedChannel" :values="channels || []" item-value="name" item-text="name" button-class="!h-11 !py-2">
                  <template #option="{ option }">
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="h-3 w-3 flex-shrink-0 rounded-full" :style="{ backgroundColor: channelOption(option).color }" />
                      <span class="truncate">{{ channelOption(option).name }}</span>
                    </span>
                  </template>
                </DropdownSelect>
              </div>
              <ChannelModal v-if="project" :project-id="project.id" @create="addChannel as unknown as HangarChannel">
                <template #activator="{ on }">
                  <Button size="medium" class="!h-11 w-full" v-on="on">
                    <IconMdiPlus class="mr-1 flex-shrink-0" />
                    {{ t("version.new.form.addChannel") }}
                  </Button>
                </template>
              </ChannelModal>
            </div>
          </section>

          <section>
            <div class="mb-3">
              <h2 class="text-lg font-bold">Artifacts</h2>
              <p class="mt-1 text-sm text-gray">Upload files or provide external URLs, then choose which platforms each artifact supports.</p>
            </div>

            <div class="background-default overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <div
                class="hidden grid-cols-[5rem_10rem_minmax(0,1fr)_minmax(24rem,30rem)_3rem] items-center gap-3 border-b px-3 py-2.5 text-left text-xs font-semibold text-gray dark:border-gray-800 lg:grid"
              >
                <span>#</span>
                <span>Source</span>
                <span>Artifact</span>
                <span>Platforms</span>
                <span />
              </div>

              <div
                v-for="(platformFile, idx) in platformFiles"
                :key="idx"
                class="grid gap-3 border-b px-3 py-3 last:border-b-0 dark:border-gray-800 lg:grid-cols-[5rem_10rem_minmax(0,1fr)_minmax(24rem,30rem)_3rem] lg:items-center"
              >
                <div class="flex items-center justify-between lg:block">
                  <span class="text-xs font-semibold text-gray lg:hidden">Artifact</span>
                  <span class="font-bold">{{ idx + 1 }}</span>
                </div>

                <div class="lg:flex lg:h-10 lg:items-center">
                  <span class="mb-1 block text-xs font-semibold text-gray lg:hidden">Source</span>
                  <div
                    class="background-default inline-flex h-10 flex-row items-center gap-1 overflow-hidden rounded-lg border border-gray-200 p-0.5 dark:border-gray-800"
                  >
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold leading-normal transition-all duration-250 hover:bg-gray-200 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                      :class="platformFile.selectedTab === 'file' ? 'border-primary-500 color-primary' : 'border-transparent'"
                      :style="
                        platformFile.selectedTab === 'file'
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--primary-500) 25%, transparent)',
                              borderColor: 'var(--primary-500)',
                            }
                          : {}
                      "
                      @click="platformFile.selectedTab = 'file'"
                    >
                      <IconMdiUpload class="mr-1" />
                      File
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold leading-normal transition-all duration-250 hover:bg-gray-200 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                      :class="platformFile.selectedTab === 'url' ? 'border-primary-500 color-primary' : 'border-transparent'"
                      :style="
                        platformFile.selectedTab === 'url'
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--primary-500) 25%, transparent)',
                              borderColor: 'var(--primary-500)',
                            }
                          : {}
                      "
                      @click="platformFile.selectedTab = 'url'"
                    >
                      <IconMdiLinkVariant class="mr-1" />
                      URL
                    </button>
                  </div>
                </div>

                <div class="min-w-0">
                  <span class="mb-1 block text-xs font-semibold text-gray lg:hidden">Artifact</span>
                  <div class="flex h-10 min-w-0 items-center">
                    <template v-if="platformFile.selectedTab === 'file'">
                      <input
                        :id="`artifact-file-${idx}`"
                        type="file"
                        accept=".jar,.zip"
                        class="sr-only"
                        :name="`file-${idx}`"
                        @change="onArtifactFileChange($event, platformFile)"
                      />
                      <label
                        :for="`artifact-file-${idx}`"
                        class="inline-flex h-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-800 bg-charcoal-600 px-3 font-semibold text-white transition-all duration-250 hover:border-gray-700 hover:bg-gray-800"
                      >
                        <IconMdiUpload class="mr-1" />
                        Choose file
                      </label>
                      <span class="min-w-0 truncate px-3 text-sm text-gray">
                        {{ platformFile.file?.name || "No file selected." }}
                      </span>
                    </template>
                    <InputText
                      v-else
                      v-model.trim="platformFile.url"
                      placeholder="External URL"
                      name="url"
                      :rules="artifactURLRules(platformFile)"
                      class="w-full [&>label]:!h-10 [&>label]:!py-0"
                    />
                  </div>
                </div>

                <div>
                  <InputGroup v-model="platformFile.platforms" :rules="platformRules" :silent-errors="false">
                    <div class="flex flex-row flex-wrap gap-1.5 lg:flex-nowrap">
                      <button
                        v-for="platform in globalData?.platforms"
                        :key="platform.name"
                        type="button"
                        class="inline-flex h-10 items-center rounded-lg border px-2.5 text-sm font-semibold transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                        :class="platformFile.platforms.includes(platform.enumName) ? 'color-primary' : 'border-gray-200 dark:border-gray-800'"
                        :style="
                          platformFile.platforms.includes(platform.enumName)
                            ? {
                                backgroundColor: 'color-mix(in srgb, var(--primary-500) 25%, transparent)',
                                borderColor: 'var(--primary-500)',
                              }
                            : {}
                        "
                        @click="togglePlatform(platformFile, platform.enumName)"
                      >
                        <PlatformLogo :platform="platform.enumName" :size="18" class="mr-1.5" />
                        {{ platform.name }}
                        <IconMdiCheck v-if="platformFile.platforms.includes(platform.enumName)" class="ml-1" />
                      </button>
                    </div>
                  </InputGroup>
                </div>

                <div class="flex justify-end">
                  <button
                    v-if="platformFiles.length !== 1"
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray transition-colors hover:border-red-600 hover:bg-red-900/30 hover:text-red-300"
                    aria-label="Remove artifact"
                    @click="removePlatformFile(idx)"
                  >
                    <IconMdiDeleteOutline />
                  </button>
                </div>
              </div>

              <div class="p-2">
                <Button
                  button-type="secondary"
                  size="medium"
                  class="w-full hover:!border-gray-300 hover:!bg-gray-100 dark:hover:!border-gray-700 dark:hover:!bg-gray-800"
                  :disabled="!!globalData?.platforms?.length && platformFiles.length >= globalData.platforms.length"
                  @click="addPlatformFile()"
                >
                  <IconMdiPlus class="mr-1" /> Add file/url for another platform
                </Button>
              </div>
            </div>
          </section>

          <Link
            to="/support/guidelines"
            class="group flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800"
          >
            <IconMdiFileDocumentOutline class="flex-shrink-0 text-lg text-gray" />
            <span class="min-w-0 flex-grow">
              <span class="block font-semibold">{{ i18n.t("project.new.step1.text2") }}</span>
              <span class="block text-xs text-gray">Updated <PrettyTime :time="guidelinesLastUpdated" short-relative /></span>
            </span>
            <IconMdiChevronRight class="flex-shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </template>
      <template #basic>
        <p class="mb-4">{{ i18n.t("version.new.form.versionDescription") }}</p>
        <div class="flex flex-wrap mt-2 md:-space-x-2 lt-md:space-y-2">
          <!-- TODO validate version string against existing versions - now super easy! -->
          <div v-if="pendingVersion" class="basis-full md:basis-4/12 items-center">
            <InputText
              v-model="pendingVersion.versionString"
              :label="t('version.new.form.versionString')"
              :rules="versionRules"
              :maxlength="useBackendData.validations.version.max"
              counter
              name="version"
            />
          </div>
        </div>

        <p class="mt-8 text-xl">{{ t("version.new.form.addedArtifacts") }}</p>
        <div v-for="(pendingFile, idx) in pendingVersion?.files" :key="idx" class="mb-2">
          <div class="flex flex-wrap items-center mt-4 gap-2">
            <div v-if="pendingFile.fileInfo" class="basis-full lt-md:mt-4 md:basis-4/12">
              <InputText :model-value="pendingFile.fileInfo.name" :label="t('version.new.form.fileName')" disabled />
            </div>
            <div v-if="pendingFile.fileInfo" class="basis-full lt-md:mt-4 md:(basis-2/12)">
              <InputText :model-value="String(formatSize(pendingFile.fileInfo.sizeBytes))" :label="t('version.new.form.fileSize')" disabled />
            </div>
            <div v-else class="basis-full lt-md:mt-4 md:basis-6/12">
              <InputText v-model="pendingFile.externalUrl" :label="t('version.new.form.externalUrl')" disabled />
            </div>
            <div class="ml-2 flex flex-wrap items-center">
              <div v-for="platform in pendingFile.platforms" :key="platform">
                <PlatformLogo :platform="platform" :size="30" class="mr-1" />
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #dependencies>
        <div class="mb-4">
          <h2 class="text-lg font-bold">Version support and dependencies</h2>
          <p class="mt-1 text-sm text-gray">{{ i18n.t("version.new.form.platformVersionsDescription") }}</p>
        </div>

        <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section>
            <div class="mb-3">
              <h3 class="text-base font-bold">{{ t("version.new.form.platformVersions") }}</h3>
              <p class="mt-1 text-sm text-gray">Select every platform version supported by this release.</p>
            </div>

            <div class="flex flex-col gap-3">
              <div
                v-for="platform in selectedPlatformsData"
                :key="platform.enumName"
                class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div class="flex items-center gap-2 border-b px-3 py-2.5 dark:border-gray-800">
                  <PlatformLogo :platform="platform.enumName" :size="22" class="flex-shrink-0" />
                  <span class="font-semibold">{{ platform.name }}</span>
                  <span class="ml-auto text-xs text-gray">{{ pendingVersion?.platformDependencies[platform.enumName]?.length || 0 }} selected</span>
                </div>
                <div class="flex h-[28rem] min-h-0 flex-col p-3">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div class="relative min-w-0 flex-grow">
                      <IconMdiMagnify class="pointer-events-none absolute top-3 left-3 text-gray" />
                      <input
                        v-model.trim="platformVersionSearch[platform.enumName]"
                        type="search"
                        class="h-10.5 w-full rounded-lg border border-transparent bg-gray-100 px-9 py-2 outline-none transition-colors hover:border-gray-300 focus:border-gray-400 dark:bg-gray-800 dark:hover:border-gray-700 dark:focus:border-gray-600"
                        placeholder="Search versions"
                      />
                    </div>
                    <Button
                      button-type="secondary"
                      size="medium"
                      class="flex-shrink-0"
                      @click="platformVersionShowAll[platform.enumName] = !platformVersionShowAll[platform.enumName]"
                    >
                      {{ platformVersionShowAll[platform.enumName] ? "Group" : "Show patches" }}
                    </Button>
                  </div>

                  <div class="mt-3 min-h-0 flex-1 overflow-y-auto">
                    <VersionSelector
                      v-if="pendingVersion"
                      v-model="pendingVersion.platformDependencies[platform.enumName]"
                      :versions="platform.platformVersions"
                      :version-search-query="platformVersionSearch[platform.enumName]"
                      :show-all-versions="platformVersionShowAll[platform.enumName]"
                      :rules="platformVersionRules"
                      open
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div class="mb-3">
              <h3 class="text-base font-bold">{{ t("version.new.form.dependencies") }}</h3>
              <p class="mt-1 text-sm text-gray">Add projects or external plugins that each platform release depends on.</p>
            </div>

            <div class="flex flex-col gap-3">
              <div
                v-for="platform in selectedPlatformsData"
                :key="`${platform.enumName}-deps`"
                class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div class="flex items-center gap-2 border-b px-3 py-2.5 dark:border-gray-800">
                  <PlatformLogo :platform="platform.enumName" :size="22" class="flex-shrink-0" />
                  <span class="font-semibold">{{ platform.name }}</span>
                </div>
                <div class="h-[28rem] min-h-0">
                  <DependencyTable
                    v-if="pendingVersion"
                    ref="dependencyTables"
                    :key="`${platform.name}-deps-table`"
                    class="h-full"
                    :platform="platform.enumName"
                    :plugin-dependencies="pendingVersion.pluginDependencies"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </template>
      <template #changelog>
        <h2 class="-mt-2 text-xl">{{ t("version.new.form.changelogTitle") }}</h2>
        <ClientOnly>
          <MarkdownEditor
            ref="descriptionEditor"
            :label="t('version.new.form.release.bulletin')"
            :raw="descriptionToLoad"
            editing
            no-padding-top
            :deletable="false"
            :cancellable="false"
            :saveable="false"
            class="mt-3 -mb-4"
            max-height="250px"
            :rules="changelogRules"
          />
        </ClientOnly>
      </template>
    </Steps>
    <Link
      href="https://github.com/HangarMC/hangar-publish-plugin"
      class="group mt-4 flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800"
    >
      <IconMdiInformationOutline class="flex-shrink-0 text-lg text-gray" />
      <span class="min-w-0 flex-grow">
        <span class="block font-semibold">Publish from your IDE or CI</span>
        <span class="block text-sm text-gray">{{ t("version.new.gradle-plugin-info") }} hangar-publish-plugin.</span>
      </span>
      <IconMdiOpenInNew class="flex-shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
    </Link>
  </div>
</template>
