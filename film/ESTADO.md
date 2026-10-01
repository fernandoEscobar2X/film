# Video del hero: estado y pendientes

**Estado (1 oct 2026): `manufactura-noche-h` terminada** (render, loop verificado, encode y vista
previa) y `manufactura-noche-v` en render. Falta la revisión de dirección de arte con el usuario
sobre la vista previa antes de modelar las otras industrias.

## Idea

Los videos del hero se generan con código, sin footage. Cada toma es un mundo 3D procedural de una industria, renderizado offline, y se exporta en **dos capas con la misma cámara**:

- **Física:** la operación.
- **Datos:** la misma operación como la ve SIP.
  - Máquinas: volúmenes con su estado.
  - Flujo físico y de información: el trazo del logo en azul señal, con giros redondeados.
  - Una alerta ámbar que ocurre y se resuelve en cada loop.

La lente del hero mezcla las dos capas alineadas al píxel. Eso es lo que comunica a SIP: tu operación y, debajo, sus datos en tiempo real.

## Hecho

**Pipeline** (`film/` + `scripts/film.mjs`, documentado en el `README.md`):
- **Render por acumulación.** Cada cuadro promedia 48 subcuadros con antialias, profundidad de campo, motion blur de 180° y sombras suaves de luz de área.
- **Revelado.** AgX con los negros hacia el noche de la marca. La capa de datos usa los colores exactos de `tokens.css`.
- **Luces de la nave.** La retícula de luminarias se calcula como luces reales dentro del shader, con oclusión tomada de la luz cenital.
- **Reflejo planar del piso epóxico** con el lóbulo de un piso pulido en ángulo rasante: franjas verticales suaves, sin copias punteadas de las luminarias.
- **Ventana de gradación del titular:** abajo a la izquierda en horizontal, el 40 % inferior en vertical.
- **Comandos:** `render`, `loop`, `sheet`, `preview` (el corte de la I a 6° revela los datos), `encode` (capas apiladas AV1 + H.264, póster AVIF/WebP) y `anchors`.
- **Sin GPU:** en Linux usa Mesa lavapipe (ANGLE sobre Vulkan), unas seis veces más rápido que SwiftShader.

**Mundo de manufactura, noche:**
- **Escena:** maquila de electrónica en Tijuana. Líneas SMT con pick-and-place (cabezales animados), AOI, horno de reflujo, torretas, sensores, charolas, ductos y nave.
- **Capa de datos:** volúmenes translúcidos con tonos planos de marca por cara (se ve la banda con las tarjetas corriendo por dentro), aristas en hielo, estados como luces redondas, piso pulido que refleja los flujos y pulsos de alerta contenidos alrededor de la máquina.
- **Cámaras** 16:9 y 9:16 (composiciones distintas).
- **Guion de alerta** en `script.ts` (funciones puras, con pruebas).
- **Anclas** por máquina y cuadro para las etiquetas de la lente (`public/media/hero/<toma>.anclas.json`), con la ventana de la alerta.

**Calidad:**
- Tipos, Biome y Vitest limpios. Las pruebas cubren las invariantes del loop, que haya una sola alerta por loop y el muestreo.
- El loop cierra con los cuadros finales: PSNR de 53.1 dB (física) y 65.2 dB (datos) entre el cuadro 0 y el siguiente al último. La diferencia es redondeo del mapa de sombras: invisible y muy por debajo del ruido de compresión.

**Archivos finales** (`public/media/hero/`):

| Archivo | Peso | Nota |
| --- | --- | --- |
| `manufactura-noche-h.webm` | 4.1 MB | AV1 10 bits, capas apiladas 1920 × 2160, 360 cuadros |
| `manufactura-noche-h.mp4` | 6.7 MB | H.264 de respaldo |
| `manufactura-noche-h.avif` / `.webp` | 54 KB / 81 KB | Póster: cuadro 0 de la capa física (LCP) |
| `manufactura-noche-h.anclas.json` | 252 KB (37 KB gzip) | 45 máquinas × 360 cuadros y la ventana de la alerta |

**Revisión:** `media-src/film/manufactura-noche-h/preview.mp4` (la lente recorre la línea y acompaña la alerta) y `demo.mp4` (la misma vista previa con la interfaz del prototipo encima: titular, texto, botones y hora).

## Renders en disco (`media-src/film/`, fuera de git)

| Toma | Capa | Cuadros | Nota |
| --- | --- | --- | --- |
| `manufactura-noche-h` | `fisica` | 0000–0359 | 48 subcuadros, código de `506d43d` |
| `manufactura-noche-h` | `datos` | 0000–0359 | 48 subcuadros, código de `c6b1387` |
| `manufactura-noche-v` | `fisica` | en curso | 48 subcuadros |
| `manufactura-noche-v` | `datos` | en curso | 48 subcuadros |

## Pendiente, en orden

1. **Revisión de dirección de arte con el usuario** sobre la vista previa y el demo. Hay que decidirla antes de modelar las otras industrias.
2. **Resto de manufactura:**
   - `-noche-v`: en render; al terminar, `loop`, `encode`, `anchors` y `preview`, y activar `data-clip-vertical` en el prototipo.
   - `-dia-h/v`: falta la luz de día (sol por las ventanas altas, entorno de día, revelado propio).
3. **Mundos pendientes**, cada uno con capa física, capa de datos, guion propio y cámaras h/v. El estilo de la capa de datos ya es común (`film/src/core/data-style.ts`):
   - **logística:** terminal de contenedores de Ensenada; grúas, patio y tractocamiones;
   - **construcción:** obra en los cerros de Tijuana; grúa torre y colado;
   - **agroindustria:** macrotúneles en San Quintín; sensores de humedad y riego;
   - **energía:** parque eólico en La Rumorosa; aspas en loop exacto y subestación.
4. **"La I que se abre":** toma propia en plano general.
5. **Integración en el sitio:** lente WebGL2 sobre el video apilado (cursor en desktop; barrido y arrastre en móvil), con el póster como LCP. Sin WebGL se ve solo la mitad física. Las etiquetas se dibujan sobre las anclas.
6. **Decidir cómo versionar los videos.** Son unos 20 archivos de pocos MB: git normal o Git LFS en Netlify. Por ahora los finales van en `public/media/hero/` con git normal.

## Costo de render

| Máquina | Física (48 subcuadros) | Datos | Toma completa |
| --- | --- | --- | --- |
| Contenedor de 4 núcleos sin GPU (lavapipe) | ~57 s por cuadro | ~9 s por cuadro | ~6.6 h; el encode, 7 min |
| Intel UHD integrada, Chrome con ANGLE/D3D11 (medido antes de los cambios de esta versión) | ~12 s por cuadro | ~2 s por cuadro | ~75 min |

Cada cuadro es independiente y se reanuda en cualquier punto, así que las 20 tomas se pueden repartir en noches o en varias máquinas.

## Decisiones que no se deben perder

- **El mundo es periódico en x.** La cámara recorre un periodo por loop. Todo lo animado usa `τ = t − k·D`, de modo que el módulo k+1 en t+D se ve igual que el módulo k en t.
- **La alerta se repite cada 16 loops,** más lejos que el último módulo modelado: en pantalla hay una sola por loop.
- **Una sola fuente de paleta:** `src/styles/tokens.css`.
- **Sin rejillas en la capa de datos** (regla del informe §2.6). Las etiquetas no se hornean: las pone el sitio, en el idioma del visitante.
- **El tercio inferior izquierdo (h) y el 40 % inferior (v) quedan calmos y oscuros** para el titular: piso pulido y ventana de gradación, sin recuadros ni degradados encima del video.
- **Renders largos desde una copia congelada del código** (`git worktree`): así se puede seguir editando sin que una recarga de la página mezcle versiones.
