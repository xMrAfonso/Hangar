<script setup lang="ts">
import { guidelinesLastUpdated, guidelinesMarkdown } from "~/content/guidelines";
import { privacyMarkdown } from "~/content/privacy";
import { termsMarkdown } from "~/content/terms";
import { getSupportSection, supportSections } from "~/components/support/SupportNav";
import type { SupportSection } from "~/components/support/SupportNav";
import { legalNoticeMarkdown } from "~/content/legalNotice";

const props = withDefaults(
  defineProps<{
    section?: string;
  }>(),
  {
    section: "overview",
  }
);

const route = useRoute();
const { version, versionStatus } = useVersionInfo();

const activeSection = computed<SupportSection>(() => getSupportSection(props.section));
const activeMeta = computed(() => supportSections.find((section) => section.id === activeSection.value) ?? supportSections[0]!);

const faqItems = [
  {
    question: "What is Hangar?",
    answer: "Hangar is PaperMC's plugin directory for discovering, publishing, and downloading plugins for Paper, Velocity, and Waterfall servers.",
  },
  {
    question: "How do I download plugins from Hangar?",
    answer: "Search or browse for a project, open its project page, then use the download button to get the latest release or pick a specific version.",
  },
  {
    question: "How do I publish a plugin?",
    answer: "Create an account, choose Publish, fill in the project details, then upload versions from your project page.",
  },
  {
    question: "Can I automate publishing?",
    answer: "Yes. Hangar supports automated publishing workflows, including the Hangar publish plugin for Gradle.",
    href: "https://github.com/HangarMC/hangar-publish-plugin",
  },
  {
    question: "Where do I report bugs or platform issues?",
    answer: "Report Hangar bugs and feature requests on the Hangar GitHub issue tracker.",
    href: "https://github.com/HangarMC/Hangar/issues/new/choose",
  },
];

useSeo(
  computed(() => ({
    title: `${activeMeta.value.label} | Hangar Support`,
    description: "Support, legal, project information, and frequently asked questions for Hangar.",
    route,
  }))
);
</script>

<template>
  <section class="min-w-0">
    <PageTitle>{{ activeMeta.label }}</PageTitle>

    <div v-if="activeSection === 'overview'" class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <Card v-for="supportSection in supportSections.filter((item) => item.id !== 'overview')" :key="supportSection.id">
        <h2 class="text-xl font-bold">{{ supportSection.label }}</h2>
        <p class="mt-1 text-sm text-gray">{{ supportSection.description }}</p>
        <Button
          :to="supportSection.to"
          button-type="transparent"
          size="medium"
          class="mt-3 hover:!border-gray-300 hover:!bg-gray-100 dark:hover:!border-gray-700 dark:hover:!bg-gray-800"
        >
          Open
          <IconMdiArrowRight class="ml-1" />
        </Button>
      </Card>
    </div>

    <Card v-else-if="activeSection === 'about'">
      <template v-if="version">
        <p class="mb-2">This instance is running <Link href="https://github.com/HangarMC/Hangar">Hangar</Link> {{ version.version }}.</p>
        <p class="mb-2">
          The most recent commit is
          <Link :href="'https://github.com/HangarMC/Hangar/commit/' + version.commit">{{ version.commitShort }}</Link>
          by <span class="font-bold">{{ version.committer }}</span> at {{ version.time }}.
        </p>
        <p class="rounded-lg bg-gray-100 p-3 text-sm dark:bg-charcoal-500">{{ version.message }}</p>
        <p v-if="version.tag" class="mt-2">Last tag: {{ version.tag }} ({{ version.behind || 0 }} commits since tag)</p>
        <p class="mt-4">
          Please report bugs and other problems to the
          <Link href="https://github.com/HangarMC/Hangar/issues/new/choose">issue tracker</Link>.
        </p>
      </template>
      <Skeleton v-else-if="versionStatus === 'loading' || versionStatus === 'idle'" class="h-36" />
      <div v-else class="rounded-lg border border-[#ff544b] bg-[#ff544b60] px-4 py-2.5 font-semibold">Version info couldn't be loaded.</div>
    </Card>

    <Card v-else-if="activeSection === 'tos'">
      <Markdown :raw="termsMarkdown" />
    </Card>

    <Card v-else-if="activeSection === 'privacy'">
      <Markdown :raw="privacyMarkdown" />
    </Card>

    <Card v-else-if="activeSection === 'legal-notice'">
      <Markdown :raw="legalNoticeMarkdown" />
    </Card>

    <Card v-else-if="activeSection === 'guidelines'">
      <Markdown :raw="guidelinesMarkdown" />
      <div class="mt-3 text-sm text-gray">
        Last updated:
        <Tooltip>
          <template #content><PrettyTime :time="guidelinesLastUpdated" long /></template>
          <PrettyTime :time="guidelinesLastUpdated" short-relative />
        </Tooltip>
      </div>
    </Card>

    <div v-else-if="activeSection === 'faq'" class="space-y-4">
      <Card v-for="item in faqItems" :key="item.question" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h2 class="text-lg font-bold" itemprop="name">{{ item.question }}</h2>
        <div class="mt-1 text-gray-700 dark:text-gray-300" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">{{ item.answer }}</p>
          <Button v-if="item.href" :href="item.href" button-type="secondary" size="small" class="mt-3">
            Learn more
            <IconMdiArrowRight class="ml-1" />
          </Button>
        </div>
      </Card>
    </div>

    <Card v-else-if="activeSection === 'contact'">
      <p class="mb-3">For support questions, policy questions, or legal concerns, contact the Hangar/PaperMC team.</p>
      <div class="flex flex-wrap gap-2">
        <Button href="mailto:admin@papermc.io" size="medium">Email support</Button>
        <Button href="https://github.com/HangarMC/Hangar/issues/new/choose" button-type="secondary" size="medium">GitHub issue tracker</Button>
        <Button href="https://papermc.io/community" button-type="secondary" size="medium">PaperMC community</Button>
      </div>
    </Card>
  </section>
</template>
