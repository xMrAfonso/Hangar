<script lang="ts" setup>
import type { LoginResponse } from "#shared/types/backend";

const route = useRoute("auth-login");
const router = useRouter();
const authStore = useAuthStore();
const v = useVuelidate();
const notification = useNotificationStore();
const i18n = useI18n();
const backendData = useBackendData;

const loading = ref(false);
const supportedMethods = ref<string[]>([]);

const returnUrl = computed(() => (route.query.returnUrl as string) || "/auth/settings/profile");

// aal1
const username = ref("");
const password = ref("");

const privileged = (route.query.privileged as unknown as boolean) || false;
if (privileged) {
  username.value = useAuthStore().user?.name || "";
  loading.value = true;
  const response = await useInternalApi<LoginResponse>("auth/login/sudo", "POST");
  if (response.types?.length) {
    supportedMethods.value.push(...response.types);
  }
  loading.value = false;
}

const dialogTitle = computed(() => {
  if (privileged) {
    return i18n.t("auth.login.sudo.title");
  }
  if (supportedMethods.value.length > 0) {
    return i18n.t("auth.login.twoFactor.title");
  }
  return i18n.t("auth.login.main.title");
});

const dialogInfo = computed(() => {
  if (privileged) {
    return i18n.t("auth.login.sudo.info");
  }
  if (supportedMethods.value.length > 0) {
    return i18n.t("auth.login.twoFactor.info");
  }
  // eslint-disable-next-line unicorn/no-useless-undefined
  return undefined;
});

async function loginPassword() {
  if (!(await v.value.$validate())) return;
  loading.value = true;
  try {
    const response = await useInternalApi<LoginResponse>("auth/login/password", "POST", {
      usernameOrEmail: username.value,
      password: password.value,
    });
    if (response.types?.length) {
      supportedMethods.value.push(...response.types);
    } else {
      await finish(response);
    }
  } catch (err) {
    notification.fromError(i18n, err);
  }
  loading.value = false;
}

// aal2

async function loginWebAuthN() {
  loading.value = true;
  try {
    const credentialGetOptions = await useInternalApi<string>("auth/webauthn/assert", "POST", username.value, { headers: { "content-type": "text/plain" } });
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(JSON.parse(credentialGetOptions).publicKey);
    const publicKeyCredential = await navigator.credentials.get({ publicKey });
    const response = await useInternalApi<LoginResponse>("auth/login/webauthn", "POST", {
      usernameOrEmail: username.value,
      password: password.value,
      publicKeyCredentialJson: JSON.stringify(publicKeyCredential),
    });
    await finish(response);
  } catch (err) {
    if (err?.toString()?.startsWith("NotAllowedError")) {
      notification.error("Security Key Authentication failed!");
    } else {
      notification.fromError(i18n, err);
    }
  }
  loading.value = false;
}

const totpCode = ref();

async function loginTotp() {
  loading.value = true;
  try {
    const response = await useInternalApi<LoginResponse>("auth/login/totp", "POST", {
      usernameOrEmail: username.value,
      password: password.value,
      totpCode: totpCode.value,
    });
    await finish(response);
  } catch (err) {
    notification.fromError(i18n, err);
  }
  loading.value = false;
}

const backupCode = ref();

async function loginBackupCode() {
  loading.value = true;
  try {
    const response = await useInternalApi<LoginResponse>("auth/login/backup", "POST", {
      usernameOrEmail: username.value,
      password: password.value,
      backupCode: backupCode.value,
    });
    await finish(response);
  } catch (err) {
    notification.fromError(i18n, err);
  }
  loading.value = false;
}

async function finish(response: LoginResponse) {
  if (response.aal !== undefined && response.user?.accessToken) {
    authStore.aal = response.aal;
    authStore.user = response.user;
    authStore.authenticated = true;
    authStore.invalidated = false;
    authStore.token = response.user.accessToken;
    await router.push(returnUrl.value);
  } else {
    notification.error("Did not receive user?");
  }
}

function providerLabel(provider: string) {
  if (provider === "github") return "GitHub";
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Microsoft";
  return provider;
}

useSeo(computed(() => ({ title: "Login", route })));
</script>

<template>
  <main class="flex min-h-[70vh] w-full items-center justify-center px-4 py-10">
    <Card class="w-full max-w-xl">
      <div class="mb-5">
        <h1 class="text-2xl font-bold">{{ dialogTitle }}</h1>
        <p v-if="!!dialogInfo" class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{{ dialogInfo }}</p>
      </div>

      <form v-if="supportedMethods.length === 0" class="flex flex-col gap-3">
        <InputText
          v-model="username"
          label="Username"
          name="username"
          autocomplete="username"
          :rules="[required()]"
          :class="{ 'hidden!': privileged }"
          :disabled="privileged"
        />
        <InputPassword v-model="password" label="Password" name="password" autocomplete="current-password" :rules="[required()]" />
        <Button size="medium" class="mt-1 h-10.5 w-full" :loading="loading" @click.prevent="loginPassword">Log in</Button>

        <template v-if="!privileged">
          <div v-if="backendData.security.oauthProviders.length > 0" class="my-2 flex items-center gap-3">
            <hr class="flex-grow border-zinc-200 dark:border-zinc-700" />
            <span class="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-300">or</span>
            <hr class="flex-grow border-zinc-200 dark:border-zinc-700" />
          </div>
          <div v-if="backendData.security.oauthProviders.length > 0" class="grid gap-2 sm:grid-cols-3">
            <Button
              v-for="provider in backendData.security.oauthProviders"
              :key="provider"
              button-type="borderless"
              size="medium"
              class="h-10.5 !border-gray-300 dark:!border-gray-700"
              :disabled="loading"
              :href="'/api/internal/oauth/' + provider + '/login?mode=login&returnUrl=' + returnUrl"
            >
              <span class="flex items-center gap-2">
                <IconMdiGithub v-if="provider === 'github'" />
                <IconMdiGoogle v-else-if="provider === 'google'" />
                <IconMdiMicrosoft v-else-if="provider === 'microsoft'" />
                {{ providerLabel(provider) }}
              </span>
            </Button>
          </div>

          <div class="mt-1 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <Link to="/auth/signup">Create an account</Link>
            <Link to="/auth/reset">Forgot your password?</Link>
          </div>
        </template>
      </form>

      <form v-if="supportedMethods.length > 0" class="flex flex-col gap-3">
        <Button v-if="supportedMethods.includes('WEBAUTHN')" size="medium" class="h-10.5 w-full" :disabled="loading" @click.prevent="loginWebAuthN">
          Use passkey
        </Button>
        <div v-if="supportedMethods.includes('TOTP')" class="flex flex-col gap-3">
          <InputText v-model="totpCode" label="TOTP code" inputmode="numeric" />
          <Button button-type="secondary" size="medium" class="h-10.5 w-full" :disabled="loading" @click.prevent="loginTotp">Use TOTP</Button>
        </div>
        <Modal v-if="supportedMethods.includes('BACKUP_CODES')" title="Recover account">
          <template #activator="{ on }">
            <Button button-type="borderless" size="medium" class="w-max" v-on="on">Lost access?</Button>
          </template>
          <template #default>
            <div class="flex flex-col gap-3">
              <p>Enter one of your saved backup codes to login.</p>
              <InputText v-model="backupCode" label="Backup code" />
              <Button class="w-max" :disabled="loading" @click.prevent="loginBackupCode">Use backup code</Button>
            </div>
          </template>
        </Modal>
      </form>
    </Card>
  </main>
</template>
