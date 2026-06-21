<script lang="ts" setup>
import { Tooltip } from "floating-vue";

const props = withDefaults(
  defineProps<{
    hover?: boolean;
    click?: boolean;
    show?: boolean;
  }>(),
  {
    hover: true,
    click: false,
    show: undefined,
  }
);

const triggers = computed(() => {
  const values: Array<"hover" | "click"> = [];
  if (props.hover) {
    values.push("hover");
  }
  if (props.click) {
    values.push("click");
  }
  return values;
});
</script>

<template>
  <!-- hardcoding the id is meh, but else hydration breaks and it doesn't actually seem to be used for accessibility? -->
  <Tooltip :triggers="triggers" :delay="{ show: 200, hide: 100 }" :shown="show" aria-id="tooltip">
    <slot />
    <template #popper>
      <slot name="content" />
    </template>
  </Tooltip>
</template>

<style>
.v-popper--theme-tooltip {
  display: inline-block;
}

.v-popper--theme-tooltip .v-popper__inner {
  max-width: 700px;
  @apply max-w-2xl rounded-lg border border-gray-700 bg-charcoal-500 px-4 py-2 text-center text-white;
}

.v-popper--theme-tooltip .v-popper__arrow-outer {
  @apply border-gray-700;
}
</style>
