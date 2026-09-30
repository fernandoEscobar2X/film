import { getTranslations } from "next-intl/server";
import { Children, isValidElement, type ReactNode } from "react";
import { site } from "@/lib/site";
import { createPlant, datatype } from "@/simulation/plant";
import styles from "./manifesto.module.css";
import { ManifestoMotion } from "./ManifestoMotion";

/** Semilla del simulador: el servidor y el navegador parten de la misma lectura. */
export const MANIFESTO_SEED = 7;

type Datum = "line" | "clock" | "bars";

/** Divide el texto plano en palabras (con su espacio) para iluminarlas una a una. */
function words(node: ReactNode, key: string): ReactNode {
  if (typeof node !== "string") return node;
  return node.split(/(?<=\s)/).map((word, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: el texto es estático; el índice es la identidad de la palabra
    <span key={`${key}-${index}`} className={styles.word} data-word>
      {word}
    </span>
  ));
}

/**
 * Manifiesto: el párrafo se ilumina con el scroll y las palabras clave se vuelven datos vivos
 * (Datatype). Para lectores de pantalla y buscadores es un párrafo normal: las gráficas son
 * `aria-hidden` y el texto no cambia.
 */
export async function Manifesto() {
  const t = await getTranslations("Manifesto");
  const initial = createPlant({ seed: MANIFESTO_SEED }).snapshot();

  const keyword = (kind: Datum) => (chunks: ReactNode) => (
    <span className={styles.keyword} data-word data-keyword>
      {chunks}
      <span className={styles.datum} data-datum={kind} aria-hidden="true">
        {kind === "line" ? datatype.line(initial.throughput) : kind === "bars" ? datatype.bars(initial.lines) : "00:00:00"}
      </span>
    </span>
  );

  const rich = t.rich("text", { line: keyword("line"), clock: keyword("clock"), bars: keyword("bars") });
  const content = Children.toArray(rich).map((node, index) =>
    isValidElement(node) ? node : words(node, `p${index}`),
  );

  return (
    <section data-surface="hielo" className={styles.section} aria-labelledby="manifiesto-titulo">
      <div className="container-site">
        <h2 id="manifiesto-titulo" className="sr-only">
          {t("label")}
        </h2>
        <ManifestoMotion seed={MANIFESTO_SEED} timeZone={site.timeZone}>
          <p className={styles.text}>{content}</p>
        </ManifestoMotion>
      </div>
    </section>
  );
}
