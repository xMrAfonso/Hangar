import { Category } from "#shared/types/backend";
import type { NewProjectForm } from "#shared/types/backend";

export type ImportedProject = NewProjectForm & { externalId: string; util: { isCustomLicense?: ComputedRef<boolean>; licenseUnset?: ComputedRef<boolean> } };

export interface SpigotAuthor {
  avatar: string;
  id: string;
  resource_count: string;
  username: string;
}

export interface SpigotResource {
  id: string;
  resource_id?: string;
  resourceId?: string;
  title: string;
  name?: string;
  tag: string;
  current_version: string;
  version?: { id: string; name?: string };
  category: { title?: string; name?: string; id: string };
  icon_link: string;
  icon?: { url?: string; data?: string };
  premium: boolean | { price?: string };
  description: string;
  downloads?: number;
}

export function getSpigotResourceId(resource: SpigotResource) {
  return String(resource.id ?? resource.resource_id ?? resource.resourceId ?? "");
}

export function getSpigotResourceTitle(resource: SpigotResource) {
  return resource.title || resource.name || `Resource #${getSpigotResourceId(resource)}`;
}

export function getSpigotResourceIcon(resource: SpigotResource) {
  return resource.icon_link || resource.icon?.url || resource.icon?.data || undefined;
}

export function getSpigotResourceVersion(resource: SpigotResource) {
  return resource.current_version || resource.version?.name || (resource.version?.id ? `Version #${resource.version.id}` : undefined);
}

export function getSpigotResourceCategory(resource: SpigotResource) {
  return resource.category?.title || resource.category?.name;
}

export function getSpigotResourcePrice(resource: SpigotResource) {
  if (typeof resource.premium === "object") {
    return resource.premium.price ? `$${resource.premium.price}` : "Premium";
  }
  return resource.premium ? "Premium" : undefined;
}

export async function getAllSpigotResourcesByAuthor(authorId: string) {
  const result = [] as SpigotResource[];

  let page = 1;
  while (true) {
    const curr = await getSpigotResourcesByAuthor(authorId, page);
    if (curr?.length > 0) {
      result.push(...curr);
      page++;
    } else {
      break;
    }
  }

  return result;
}

async function getSpigotResourcesByAuthor(authorId: string, page = 1) {
  return doSpigotRequest<SpigotResource[]>({
    action: "getResourcesByAuthor",
    id: authorId,
    page: page + "",
  });
}

export async function getSpigotAuthor(author: string) {
  return doSpigotRequest<SpigotAuthor>({
    action: "findAuthor",
    name: author,
  });
}

async function doSpigotRequest<T>(params: Record<string, string>): Promise<T> {
  const request = await fetch("https://cors.papermc.io/s?" + new URLSearchParams(params).toString());
  if (request.ok) {
    return await request.json();
  } else {
    throw new Error(`Spigot request failed: ${request.status} ${request.statusText}: ` + (await request.text()));
  }
}

const categoryMapping = {
  "5": Category.Gameplay, // Transportation
  "6": Category.Chat, // Chat
  "7": Category.AdminTools, // Tools and Utilities
  "8": Category.Misc, // Misc
  "9": Category.DevTools, // Libraries / APIs
  "10": Category.Gameplay, // Transportation again?!
  "11": Category.Chat, // Chat again?!
  "12": Category.AdminTools, // Tools and Utilites again?!
  "13": Category.Misc, // Misc again?!
  "14": Category.Chat, // CHat again again??!!
  "15": Category.AdminTools, // Tools and Utilities again again??!!
  "16": Category.Misc, // Misc again again??!!
  "17": Category.Gameplay, // Fun
  "18": Category.WorldManagement, // World Management
  "22": Category.Gameplay, // Mechanics
  "23": Category.Economy, // Economy
  "24": Category.Games, // Game Mode,
  "26": Category.DevTools, // Libraries / APIs again?!
} as Record<string, Category>;
const unspecifiedLicenseName = "Unspecified";

export async function convertSpigotProjects(spigotResources: SpigotResource[], ownerId: number) {
  const hangarResources = [] as ImportedProject[];
  for (const spigotResource of spigotResources) {
    const resourceTitle = getSpigotResourceTitle(spigotResource);
    const hangarResource = {
      ownerId,
      settings: {
        license: { type: "Unspecified" } as ImportedProject["settings"]["license"],
        donation: {} as ImportedProject["settings"]["donation"],
        keywords: [],
        links: [],
        tags: [],
      } as unknown as ImportedProject["settings"],
      externalId: getSpigotResourceId(spigotResource),
      name: resourceTitle,
      description: spigotResource.tag || resourceTitle,
      avatarUrl: getSpigotResourceIcon(spigotResource),
      util: {},
    } as ImportedProject;
    try {
      hangarResource.pageContent = await useInternalApi<string>("pages/convert-bbcode", "post", {
        content: spigotResource.description || spigotResource.tag || "",
      });
    } catch (err) {
      console.log("failed to convert", hangarResource, err);
    }

    hangarResource.category = categoryMapping[spigotResource.category?.id] || Category.Undefined;

    hangarResource.settings.license.type = unspecifiedLicenseName;
    hangarResource.util.isCustomLicense = computed(() => hangarResource.settings.license.type === "Other");
    hangarResource.util.licenseUnset = computed(() => hangarResource.settings.license.type === unspecifiedLicenseName);

    hangarResources.push(hangarResource);
  }

  return hangarResources;
}
