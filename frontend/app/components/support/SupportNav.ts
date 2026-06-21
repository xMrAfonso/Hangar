export type SupportSection = "overview" | "about" | "tos" | "privacy" | "legal-notice" | "guidelines" | "faq" | "contact";

export const supportSections = [
  { id: "overview", label: "Overview", description: "Start here", to: "/support" },
  { id: "about", label: "About Hangar", description: "Version and project info", to: "/support/about" },
  { id: "tos", label: "Terms of Service", description: "Service terms", to: "/support/tos" },
  { id: "privacy", label: "Privacy Policy", description: "Data and privacy", to: "/support/privacy" },
  { id: "legal-notice", label: "Legal Notice", description: "Provider information", to: "/support/legal-notice" },
  { id: "guidelines", label: "Resource Guidelines", description: "Project rules", to: "/support/guidelines" },
  { id: "faq", label: "FAQ", description: "Common questions", to: "/support/faq" },
  { id: "contact", label: "Contact", description: "Get help", to: "/support/contact" },
] satisfies Array<{ id: SupportSection; label: string; description: string; to: string }>;

export function getSupportSection(section?: string): SupportSection {
  return supportSections.some((item) => item.id === section) ? (section as SupportSection) : "overview";
}
