// Test fixture for the shared site-settings boundary.
import { mapTypography } from "../typography/settings";
import type { SiteContent } from "./types";
export const siteFixture: SiteContent = {
  storyId: 7, storyUuid: "site-uuid", typography: mapTypography(undefined),
  nav: { homeLabel: "KSPF", homeHref: "/", informationLabel: "INFO", informationHref: "#information", showInformation: true },
  information: { title: "KSPF", profile: "Design practice", contactTitle: "Contact", contactBody: "Melbourne", contactEmail: "hello@kspf.au", servicesTitle: "Services", services: [] },
};
export const siteStoryFixture = {
  id: 7, uuid: "site-uuid", content: {
    component: "site_settings", profile: "Design practice",
    nav: [{ component: "nav_settings", home_label: "KSPF", home_href: { linktype: "url", url: "/" }, information_label: "INFO", information_href: { linktype: "url", url: "#information" } }],
    information_overlay: [{ component: "information_overlay", contact_title: "Contact", contact_body: "Melbourne", contact_email: "hello@kspf.au", services_title: "Services", services: [] }],
  },
};
