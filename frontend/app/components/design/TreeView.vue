<script lang="ts" setup generic="T extends Record<string, any>">
const props = defineProps<{
  items?: T[];
  itemKey: string;
  clazz?: string;
  open: string[];
  hideToggle?: boolean;
}>();
const expanded = ref<Record<string, boolean>>({});
watch(
  props.open,
  (val) => {
    if (val) {
      for (const item of val) {
        expanded.value[item] = true;
      }
    }
  },
  { immediate: true }
);
defineSlots<{
  item?: (props: { expanded: boolean; hasChildren: boolean; item: T; toggle: () => void }) => any;
}>();
</script>

<template>
  <div v-for="item in items" :key="item[itemKey]" :class="props.clazz">
    <div class="flex items-center gap-1">
      <button
        v-if="!hideToggle && 'children' in item && item.children?.length"
        type="button"
        class="inline-flex h-9 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800"
        :aria-label="expanded[item[itemKey]] ? 'Collapse page' : 'Expand page'"
        @click="expanded[item[itemKey]] = !expanded[item[itemKey]]"
      >
        <IconMdiMenuDown :class="'transform transition-transform ' + (expanded[item[itemKey]] ? 'rotate-0' : '-rotate-90')" />
      </button>
      <span v-else-if="!hideToggle" class="w-7 flex-shrink-0" />
      <slot
        name="item"
        :expanded="expanded[item[itemKey]] ?? false"
        :has-children="'children' in item && item.children?.length > 0"
        :item="item"
        :toggle="() => (expanded[item[itemKey]] = !expanded[item[itemKey]])"
      />
    </div>
    <TreeView
      v-if="expanded[item[itemKey]] && 'children' in item && item.children?.length"
      :key="item[itemKey]"
      :items="item.children"
      :item-key="itemKey"
      :open="open"
      :hide-toggle="hideToggle"
      clazz="pl-4"
    >
      <template #item="slotProp">
        <slot
          name="item"
          :expanded="slotProp.expanded"
          :has-children="slotProp.hasChildren"
          :item="slotProp.item as T"
          :toggle="slotProp.toggle"
        />
      </template>
    </TreeView>
  </div>
</template>
