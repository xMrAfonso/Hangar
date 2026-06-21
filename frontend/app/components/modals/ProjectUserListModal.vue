<script setup lang="ts">
import type { PaginatedResultUser, User } from "#shared/types/backend";

const props = defineProps<{
  title: string;
  count?: number;
  users?: PaginatedResultUser;
  status?: "idle" | "loading" | "success" | "error";
  canLoadMore?: boolean;
  loadingMore?: boolean;
}>();

const emit = defineEmits<{
  (e: "loadMore"): void;
}>();

const search = ref("");
const filteredUsers = computed<User[]>(() => {
  const query = search.value.trim().toLowerCase();
  const users = props.users?.result ?? [];
  if (!query) {
    return users;
  }
  return users.filter((user) => user.name.toLowerCase().includes(query));
});

function maybeLoadMore(event: Event) {
  if (!props.canLoadMore || props.loadingMore || search.value.trim()) {
    return;
  }

  const target = event.currentTarget as HTMLElement;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
    emit("loadMore");
  }
}
</script>

<template>
  <Modal :title="title" window-classes="w-full max-w-xl !rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg !bg-white dark:!bg-charcoal-900" close-button-right>
    <template #default="{ on }">
      <div class="relative mb-3 h-10 rounded-md">
        <input
          v-model="search"
          class="h-full w-full rounded-lg border border-transparent bg-gray-100 py-2 pr-9 pl-9 outline-none transition-all duration-200 hover:border-gray-700 focus:border-gray-700 focus-visible:border-gray-700 dark:bg-gray-800"
          placeholder="Search users..."
          type="text"
        />
        <IconMdiMagnify class="absolute top-2.75 left-3 text-gray-500" />
        <button
          v-if="search"
          type="button"
          class="absolute top-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Clear search"
          @click="search = ''"
        >
          <IconMdiClose />
        </button>
      </div>

      <div v-if="status === 'error' && !filteredUsers.length" class="rounded-xl border border-[#ff544b] bg-[#ff544b60] px-4 py-2.5 text-sm font-semibold">
        This list couldn't be loaded.
      </div>
      <ul v-else-if="filteredUsers.length" class="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain pr-1" @scroll="maybeLoadMore" @wheel.stop>
        <li v-for="user in filteredUsers" :key="user.name">
          <NuxtLink
            :to="'/' + user.name"
            class="mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-current no-underline transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 hover:no-underline dark:hover:border-gray-700 dark:hover:bg-gray-800"
            @click="on.click"
          >
            <UserAvatar :username="user.name" :avatar-url="user.avatarUrl" size="xs" disable-link class="flex-shrink-0" />
            <span class="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">{{ user.name }}</span>
          </NuxtLink>
        </li>
        <li v-if="loadingMore" class="px-3 py-2 text-center text-sm text-gray">Loading more...</li>
      </ul>
      <div v-else class="rounded-lg bg-gray-100 px-3 py-8 text-center text-sm text-gray dark:bg-charcoal-500">
        {{ status === "loading" || status === "idle" ? "Loading users..." : "No users found." }}
      </div>
    </template>
    <template #activator="{ on }">
      <button
        type="button"
        class="flex min-h-17 flex-col rounded-lg border border-charcoal-500 bg-gray-100 p-1.5 text-center transition-colors hover:border-gray-700 dark:bg-charcoal-500"
        v-on="on"
      >
        <slot :count="count" />
      </button>
    </template>
  </Modal>
</template>
