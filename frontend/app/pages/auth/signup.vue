<script lang="ts" setup>
const route = useRoute("auth-signup");
const v = useVuelidate();
const backendData = useBackendData;

interface SignupForm {
  username?: string;
  email?: string;
  password?: string;
  tos?: boolean;
  captcha?: string;
}

const config = useRuntimeConfig();

const done = ref(false);

const notification = useNotificationStore();
const i18n = useI18n();
const form = reactive<SignupForm>({});
const loading = ref(false);
const turnstile = useTemplateRef("turnstile");

const errorMessage = ref<string | undefined>();

async function submit() {
  if (!(await v.value.$validate())) return;
  loading.value = true;
  errorMessage.value = undefined;
  try {
    await useInternalApi("auth/signup", "POST", form);
    done.value = true;
  } catch (err: any) {
    notification.fromError(i18n, err);
    if (err?.response?.data?.message === "error.captcha") {
      turnstile.value?.reset();
    }
  }
  loading.value = false;
}

function providerLabel(provider: string) {
  if (provider === "github") return "GitHub";
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Microsoft";
  return provider;
}

useSeo(computed(() => ({ title: "Sign up", route })));
</script>

<template>
  <main class="flex min-h-[70vh] w-full items-center justify-center px-4 py-10">
    <Card class="w-full max-w-xl">
      <div class="mb-5">
        <h1 class="text-2xl font-bold">Create your account</h1>
        <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Join Hangar with an account or continue with a connected provider.</p>
      </div>

      <div v-if="done" class="flex flex-col gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-100/60 px-3 py-3 text-sm dark:border-gray-800 dark:bg-charcoal-500/60">
          Your account has been created. Please check your email to complete the signup process.
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button v-if="route.query.returnUrl" size="medium" :to="route.query.returnUrl">Back to last page</Button>
          <Button button-type="secondary" size="medium" to="/auth/settings/account">Go to account settings</Button>
        </div>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div v-if="backendData.security.oauthProviders.length > 0" class="grid gap-2 sm:grid-cols-3">
          <Button
            v-for="provider in backendData.security.oauthProviders"
            :key="provider"
            button-type="borderless"
            size="medium"
            class="h-10.5 !border-gray-300 dark:!border-gray-700"
            :disabled="loading"
            :href="'/api/internal/oauth/' + provider + '/login?mode=login&returnUrl=' + (route.query.returnUrl ? route.query.returnUrl : '/')"
          >
            <span class="flex items-center gap-2">
              <IconMdiGithub v-if="provider === 'github'" />
              <IconMdiGoogle v-else-if="provider === 'google'" />
              <IconMdiMicrosoft v-else-if="provider === 'microsoft'" />
              {{ providerLabel(provider) }}
            </span>
          </Button>
        </div>

        <div v-if="backendData.security.oauthProviders.length > 0" class="flex items-center gap-3">
          <hr class="flex-grow border-zinc-200 dark:border-zinc-700" />
          <span class="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-300">or</span>
          <hr class="flex-grow border-zinc-200 dark:border-zinc-700" />
        </div>

        <form class="flex flex-col gap-3">
          <InputText v-model="form.username" label="Username" name="username" autocomplete="username" :rules="[required()]" />
          <InputText v-model="form.email" type="email" label="E-Mail" name="email" autocomplete="email" :rules="[required(), email()]" />
          <InputPassword v-model="form.password" label="Password" name="new-password" autocomplete="new-password" :rules="[required()]" />
          <LazyNuxtTurnstile v-if="config.public.turnstile?.siteKey != '1x00000000000000000000AA'" ref="turnstile" v-model="form.captcha" />
          <div v-if="errorMessage" class="rounded-lg border border-red-600/40 bg-red-900/10 px-3 py-2 text-sm text-red-600">{{ errorMessage }}</div>
          <InputGroup v-model="form.tos" :rules="[sameAs('You need to accept the Terms and Conditions')(true)]" :silent-errors="false" full-width>
            <label class="flex w-max cursor-pointer select-none items-center gap-2">
              <input v-model="form.tos" type="checkbox" class="peer sr-only" />
              <span
                class="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-400 bg-gray-200 text-white transition-colors peer-checked:border-primary-500 peer-checked:bg-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700"
              >
                <IconMdiCheck v-if="form.tos" class="text-sm" />
              </span>
              <span>I agree to the <Link to="/support/tos">Terms and Conditions</Link></span>
            </label>
          </InputGroup>
          <Button type="submit" size="medium" class="h-10.5 w-full" :loading="loading" @click.prevent="submit">Sign up</Button>

          <div class="mt-1 text-sm">
            <Link to="login">Already have an account? Log in</Link>
          </div>
        </form>
      </div>
    </Card>
  </main>
</template>
