<script setup lang="ts" generic="T">
import type { ValidationRule } from "@vuelidate/core";

const i18n = useI18n();

const props = withDefaults(
  defineProps<{
    values: Record<string, any>[] | string[];
    itemValue?: string;
    itemText?: string;
    disabled?: boolean;
    label?: string;
    loading?: boolean;
    messages?: string[];
    errorMessages?: string[];
    rules?: ValidationRule<T | undefined>[];
    i18nTextValues?: boolean;
    buttonClass?: string;
    buttonSize?: "small" | "medium" | "large";
    container?: string | Element | false;
  }>(),
  {
    itemValue: "value",
    itemText: "text",
    disabled: false,
    label: "",
    loading: false,
    messages: () => [],
    errorMessages: () => [],
    rules: () => [],
    i18nTextValues: false,
    buttonClass: "!h-10.5 !py-2",
    buttonSize: "medium",
    container: "body",
  }
);

const model = defineModel<T | undefined>();
const errorMessages = computed(() => props.errorMessages);
const { v, errors, hasError } = useValidation(props.label, props.rules, model, errorMessages);

function optionValue(option: Record<string, any> | string): T {
  return (typeof option === "object" ? option[props.itemValue] : option) as T;
}

function optionText(option: Record<string, any> | string): string {
  const text = typeof option === "object" ? option[props.itemText] : option;
  return props.i18nTextValues ? i18n.t(text) : text;
}

const selectedText = computed(() => {
  const selected = props.values.find((option) => optionValue(option) === model.value);
  return selected ? optionText(selected) : props.label;
});

function selectOption(option: Record<string, any> | string, close: () => void) {
  model.value = optionValue(option);
  v.value.$touch();
  close();
}

defineSlots<{
  "button-label"?: (props: { selected?: Record<string, any> | string; selectedText: string }) => any;
  option?: (props: { option: Record<string, any> | string; selected: boolean; text: string }) => any;
}>();
</script>

<template>
  <div>
    <label v-if="label" class="mb-1 block text-sm font-semibold">{{ label }}</label>
    <DropdownButton
      :button-size="buttonSize"
      button-type="transparent"
      :button-class="buttonClass"
      match-width
      spread-arrow
      :disabled="disabled || loading"
      :loading="loading"
      :container="container"
    >
      <template #button-label>
        <slot name="button-label" :selected="values.find((option) => optionValue(option) === model)" :selected-text="selectedText">
          <span class="flex w-full min-w-0 justify-start">
            <span class="truncate text-left">{{ selectedText }}</span>
          </span>
        </slot>
      </template>
      <template #default="{ close }">
        <div class="flex max-h-lg w-full max-w-lg flex-col gap-1 overflow-y-auto overflow-x-visible">
          <DropdownItem
            v-for="option in values"
            :key="optionValue(option) as PropertyKey"
            :style="
              optionValue(option) === model
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--primary-500) 25%, transparent)',
                    borderColor: 'var(--primary-500)',
                  }
                : {}
            "
            @click="selectOption(option, close)"
          >
            <slot name="option" :option="option" :selected="optionValue(option) === model" :text="optionText(option)">
              {{ optionText(option) }}
            </slot>
          </DropdownItem>
        </div>
      </template>
    </DropdownButton>
    <span v-if="messages" class="text-small">
      <span v-for="message in messages" :key="message"> {{ message }}<br /> </span>
    </span>
    <span v-if="errors && !disabled" class="mt-1 block text-sm text-red-400">
      <span v-for="message in errors" :key="isErrorObject(message) ? unref(message.$message) : message">
        {{ isErrorObject(message) ? unref(message.$message) : message }}<br />
      </span>
    </span>
    <span v-if="hasError" class="sr-only">Invalid selection</span>
  </div>
</template>
