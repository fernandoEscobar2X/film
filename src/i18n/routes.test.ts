import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { alternatesFor, caseHref, caseSlugs, href, type RouteKey, routes, translatePath } from "./routes";
import { routing } from "./routing";

const appDir = resolve(__dirname, "../app/[locale]");

describe("mapa de rutas", () => {
  it("cada ruta tiene su página física en cada idioma", () => {
    for (const key of Object.keys(routes) as RouteKey[]) {
      for (const locale of routing.locales) {
        const segment = routes[key][locale];
        const page = resolve(appDir, `.${segment}`, "page.tsx");
        expect(existsSync(page), `${key}/${locale} → ${page}`).toBe(true);
      }
    }
  });

  it("construye URLs con prefijo de idioma y slugs traducidos", () => {
    expect(href("es", "home")).toBe("/es");
    expect(href("en", "services")).toBe("/en/services");
    expect(caseHref("es", "andon")).toBe("/es/casos/sistema-andon-multilinea");
    expect(caseHref("en", "andon")).toBe("/en/case-studies/multi-line-andon-system");
    expect(alternatesFor("about")).toEqual({ es: "/es/nosotros", en: "/en/about" });
  });

  it("traduce la ruta actual al otro idioma", () => {
    expect(translatePath("/es", "en")).toBe("/en");
    expect(translatePath("/es/servicios", "en")).toBe("/en/services");
    expect(translatePath("/en/contact", "es")).toBe("/es/contacto");
    for (const id of Object.keys(caseSlugs) as (keyof typeof caseSlugs)[]) {
      expect(translatePath(caseHref("es", id), "en")).toBe(caseHref("en", id));
    }
  });

  it("cae al inicio del otro idioma ante rutas desconocidas", () => {
    expect(translatePath("/es/no-existe", "en")).toBe("/en");
    expect(translatePath("/es/casos/slug-desconocido", "en")).toBe("/en/case-studies");
    expect(translatePath("/", "en")).toBe("/en");
  });
});
