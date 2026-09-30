import type { ReactNode } from "react";

/**
 * Layout raíz mínimo para "/". En producción Netlify redirige "/" según el idioma
 * del navegador antes de llegar aquí; esta página es el respaldo local y sin JS.
 */
export default function RootFallbackLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
