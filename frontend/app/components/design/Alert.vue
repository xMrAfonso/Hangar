<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    type?: "success" | "info" | "warning" | "danger" | "neutral";
  }>(),
  {
    type: "info",
  }
);

const color = computed(() => {
  return {
    success: "border-green-500 bg-green-500/30",
    info: "border-primary-500 bg-primary-500/25",
    warning: "border-yellow-500 bg-yellow-500/30",
    danger: "border-[#ff544b] bg-[#ff544b60] font-semibold",
    neutral: "border-gray-300 bg-gray-100/60 dark:border-gray-800 dark:bg-charcoal-500/60",
  }[props.type];
});
</script>

<template>
  <div :class="'flex flex-row items-center rounded-xl border border-solid px-4 py-2.5 text-black dark:text-white ' + color">
    <slot name="icon" clazz="mr-3 w-6 h-6 min-w-6">
      <IconMdiAlert v-if="props.type === 'danger'" class="mr-3 h-6 min-w-6 w-6" />
      <IconMdiAlertBox v-else-if="props.type === 'warning'" class="mr-3 h-6 min-w-6 w-6" />
      <IconMdiInformation v-else-if="props.type === 'info' || props.type === 'neutral'" class="mr-3 h-6 min-w-6 w-6" />
      <IconMdiTrophy v-else-if="props.type === 'success'" class="mr-3 h-6 min-w-6 w-6" />
    </slot>
    <slot />
  </div>
</template>
