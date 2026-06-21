<script setup lang="ts">
const i18n = useI18n();
const modal = useTemplateRef("modal");
const trustedHosts = useLocalStorage("trustedHosts", [] as string[]);
const remoteUrl = ref<string>();

const host = computed<string | undefined>(() => {
  if (!remoteUrl.value) return;
  try {
    return new URL(remoteUrl.value).host;
  } catch {
    return;
  }
});

function getRemoteUrl(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== "/linkout") return;
    return url.searchParams.get("remoteUrl") || undefined;
  } catch {
    return;
  }
}

function open(url: string) {
  remoteUrl.value = url;
  if (host.value && trustedHosts.value.includes(host.value)) {
    go();
    return;
  }
  modal.value?.open();
}

function handleClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link) return;

  const url = getRemoteUrl(link.href);
  if (!url) return;

  event.preventDefault();
  event.stopPropagation();
  open(url);
}

function trust() {
  if (host.value) {
    trustedHosts.value = [...new Set([...trustedHosts.value, host.value])];
  }
  go();
}

function go() {
  if (remoteUrl.value) {
    window.location.href = remoteUrl.value;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClick, true);
  document.addEventListener("auxclick", handleClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClick, true);
  document.removeEventListener("auxclick", handleClick, true);
});
</script>

<template>
  <Modal
    ref="modal"
    :title="i18n.t('linkout.title')"
    window-classes="w-full max-w-xl !rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg !bg-white dark:!bg-charcoal-900"
    close-button-right
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        You are about to visit an external website. Only continue if you trust the destination.
      </p>

      <InputText :model-value="remoteUrl" label="External link" readonly />

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button button-type="secondary" size="small" @click="modal?.close()">{{ i18n.t("linkout.abort") }}</Button>
        <Button button-type="secondary" size="small" @click="trust">{{ i18n.t("linkout.trust") }}</Button>
        <Button size="small" @click="go">{{ i18n.t("linkout.continue") }}</Button>
      </div>
    </div>
  </Modal>
</template>
