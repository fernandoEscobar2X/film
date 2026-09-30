import type { Locale } from "./routing";

/**
 * Mapa de rutas localizadas. Cada clave es una página; cada idioma tiene su
 * propia URL física (no hay reescrituras en servidor).
 * Si agregas una página, agrégala aquí y crea su archivo en app/[locale].
 */
export const routes = {
  home: { es: "", en: "" },
  services: { es: "/servicios", en: "/services" },
  cases: { es: "/casos", en: "/case-studies" },
  about: { es: "/nosotros", en: "/about" },
  contact: { es: "/contacto", en: "/contact" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Slugs de casos por idioma, indexados por un id estable. */
export const caseSlugs = {
  "tablero-produccion": {
    es: "tablero-de-produccion-en-tiempo-real",
    en: "real-time-production-dashboard",
  },
  andon: { es: "sistema-andon-multilinea", en: "multi-line-andon-system" },
  apps: { es: "aplicaciones-web-y-moviles", en: "web-and-mobile-apps" },
} as const satisfies Record<string, Record<Locale, string>>;

export type CaseId = keyof typeof caseSlugs;

export function href(locale: Locale, key: RouteKey, slug?: string): string {
  const base = `/${locale}${routes[key][locale]}`;
  return slug ? `${base}/${slug}` : base;
}

export function caseHref(locale: Locale, id: CaseId): string {
  return href(locale, "cases", caseSlugs[id][locale]);
}

export type Alternates = Record<Locale, string>;

export function alternatesFor(key: RouteKey, caseId?: CaseId): Alternates {
  if (caseId) return { es: caseHref("es", caseId), en: caseHref("en", caseId) };
  return { es: href("es", key), en: href("en", key) };
}

/**
 * Traduce una ruta actual a su equivalente en otro idioma.
 * Se usa en el selector de idioma (cliente), a partir del pathname.
 */
export function translatePath(pathname: string, to: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  const from = segments[0] as Locale | undefined;
  if (!from || (from !== "es" && from !== "en")) return href(to, "home");

  const rest = `/${segments.slice(1).join("/")}`.replace(/\/$/, "");
  if (rest === "") return href(to, "home");

  for (const key of Object.keys(routes) as RouteKey[]) {
    const localized = routes[key][from];
    if (!localized) continue;
    if (rest === localized) return href(to, key);
    if (key === "cases" && rest.startsWith(`${localized}/`)) {
      const slug = rest.slice(localized.length + 1);
      const match = (Object.keys(caseSlugs) as CaseId[]).find((id) => caseSlugs[id][from] === slug);
      return match ? caseHref(to, match) : href(to, "cases");
    }
  }
  return href(to, "home");
}
