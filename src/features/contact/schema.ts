import { z } from "zod";
import { heroIndustries } from "@/content/industries";

/**
 * Formulario de contacto: un solo esquema para el cliente, las pruebas y la descripción que
 * leen los agentes (WebMCP). Los errores son códigos; el texto lo pone cada idioma.
 */

export const CONTACT_FORM_NAME = "contacto";
/** Campo trampa: las personas no lo ven; si trae algo, es un bot (Netlify lo descarta). */
export const HONEYPOT_FIELD = "sitio-web";

export const industryOptions = [...heroIndustries, "otra"] as const;
export type IndustryOption = (typeof industryOptions)[number];

export const contactFields = ["nombre", "empresa", "correo", "telefono", "industria", "mensaje"] as const;
export type ContactField = (typeof contactFields)[number];

export type ContactErrorCode = "required" | "tooShort" | "tooLong" | "email" | "phone";

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: "required" })
    .min(min, { error: "tooShort" })
    .max(max, { error: "tooLong" });

const optionalText = (max: number) => z.string().trim().max(max, { error: "tooLong" });

export const contactSchema = z.object({
  nombre: text(2, 80),
  empresa: optionalText(120),
  correo: z
    .string()
    .trim()
    .min(1, { error: "required" })
    .pipe(z.email({ error: "email" })),
  telefono: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[+\d][\d\s().-]{6,19}$/.test(value), { error: "phone" }),
  industria: z.union([z.enum(industryOptions), z.literal("")]),
  mensaje: text(10, 2000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactErrors = Partial<Record<ContactField, ContactErrorCode>>;

/** Valida y devuelve los datos limpios o el primer error de cada campo. */
export function validateContact(
  values: Record<ContactField, string>,
): { ok: true; data: ContactInput } | { ok: false; errors: ContactErrors } {
  const result = contactSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: ContactErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField;
    errors[field] ??= issue.message as ContactErrorCode;
  }
  return { ok: false, errors };
}

/**
 * Cuerpo urlencoded que espera Netlify Forms (incluye el nombre del formulario). El campo trampa
 * viaja con lo que traiga: si un bot lo llenó, Netlify marca el envío como spam.
 */
export function toNetlifyBody(data: ContactInput, locale: string, trap = ""): string {
  return new URLSearchParams({
    "form-name": CONTACT_FORM_NAME,
    [HONEYPOT_FIELD]: trap,
    ...data,
    idioma: locale,
  }).toString();
}
