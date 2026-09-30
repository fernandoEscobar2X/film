import type { Metadata } from "next";
import { href } from "@/i18n/routes";

export const metadata: Metadata = {
  title: "SIP Sistemas Inteligentes del Pacífico",
  robots: { index: false, follow: true },
  alternates: { canonical: href("es", "home") },
};

export default function RootRedirect() {
  const target = href("es", "home");
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <p>
        <a href={target}>Sistemas Inteligentes del Pacífico</a>
      </p>
    </>
  );
}
