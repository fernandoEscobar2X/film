# SIP · estudio de video del hero

Los videos del hero de SIP se generan con código, sin footage. Cada toma es un mundo 3D
procedural de una industria, renderizado offline, y se exporta en **dos capas con la misma
cámara**:

- **Física:** la operación, con luz, materiales y lente de cine.
- **Datos:** la misma operación como la ve SIP (volúmenes con su estado, flujos con el trazo del
  logo y una alerta ámbar que ocurre y se resuelve en cada loop).

En el sitio, la lente del hero mezcla las dos capas alineadas al píxel. El estado del trabajo y
las decisiones están en [`film/ESTADO.md`](film/ESTADO.md).

## Requisitos

- Node 22 o más reciente.
- Un navegador Chromium:
  - **Con GPU** (recomendado): Chrome instalado. En Windows usa ANGLE sobre D3D11.
  - **Sin GPU (Linux):** Mesa lavapipe (`apt install mesa-vulkan-drivers`). El script lo detecta
    y usa ANGLE sobre Vulkan: es unas seis veces más rápido que SwiftShader.
  - Otra ruta: `FILM_CHROME=/ruta/al/chrome`.
- ffmpeg con `libx264`, `libsvtav1`, `libaom` y `libwebp`.

```
npm install
```

## Comandos

Todas las tomas siguen el patrón `<industria>-<noche|dia>-<h|v>` (h = 16:9, v = 9:16).

| Comando | Qué hace |
| --- | --- |
| `npm run film -- render <toma>` | Renderiza las dos capas, 360 cuadros por capa |
| `… render <toma> --layer=fisica --frames=72-359` | Una capa y un rango (`0,90,180` o `0-359:30` también sirven) |
| `… render <toma> --samples=8 --scale=0.5` | Prueba rápida; va a `pruebas/` y no se mezcla con el render final |
| `npm run film -- loop <toma>` | Verifica el cierre del loop: cuadro 0 contra el siguiente al último (PSNR ≥ 45 dB) |
| `npm run film -- sheet <toma>` | Hoja de contacto, un cuadro por segundo |
| `npm run film -- preview <toma>` | Vista previa de la lente: el corte de la I a 6° barre el cuadro y revela los datos |
| `npm run film -- encode <toma>` | Video final con las capas apiladas y póster |
| `npm run film -- anchors <toma>` | Posición en pantalla de cada máquina por cuadro, para las etiquetas de la lente |

Cada cuadro es independiente y se escribe de forma atómica: un render se puede cortar y
reanudar en cualquier punto (repetir el mismo comando sigue donde se quedó).

Para mirar una toma en vivo: `npx vite film` y abrir `/?clip=manufactura-noche-h&samples=4`.
En la consola, `await film.frame(0, "datos")` devuelve el cuadro como PNG.

## Archivos

```
film/                     estudio (Vite + three.js); nada de aquí entra al bundle del sitio
  src/clips.ts            catálogo de tomas: resolución, fps, duración, subcuadros
  src/core/               render por acumulación, revelado, reflejo, luminarias, estilo de datos
  src/worlds/<industria>/ un mundo por industria (manufactura: nave, línea SMT, guion de alerta)
scripts/film.mjs          CLI del pipeline
src/styles/tokens.css     única fuente de la paleta (la leen el sitio y el estudio)
marca-sip/                logos y paleta de marca
media-src/film/<toma>/    cuadros PNG por capa, loop, hojas y vista previa (fuera de git)
public/media/hero/        videos y pósters finales
```

## Salida

`encode` apila las capas (física arriba, datos abajo) en un solo video, así el sitio las
decodifica juntas, alineadas al píxel y al cuadro:

| Archivo | Uso |
| --- | --- |
| `<toma>.webm` | AV1 10 bits: principal |
| `<toma>.mp4` | H.264: respaldo |
| `<toma>.avif`, `<toma>.webp` | Póster: cuadro 0 de la capa física. Es el LCP del hero y lo que se ve sin WebGL |
| `<toma>.anclas.json` | Por máquina y cuadro: `[x, y, distancia]` (x e y en 0–1 desde arriba a la izquierda) o `null` si no se ve; más los eventos del guion (la alerta: máquina y segundos) |

Un cuadro clave por segundo y 12 s de loop exacto: el atributo `loop` del video no deja costura.

Las etiquetas no se hornean en el video: el sitio las dibuja sobre las anclas, en el idioma del
visitante y con los valores del simulador. Al cerrar el loop la cámara avanzó un módulo, así que
el ancla del módulo k en el último cuadro continúa como la del módulo k − 1 en el cuadro 0.

## Prototipo de la lente

`prototipo/lente.html` es el hero de una sola pantalla con la lente real: WebGL2 sobre el video
apilado, la I del logo inclinada 6° como ventana (sigue al cursor; en táctil barre sola y se
arrastra), las etiquetas sobre las anclas y el titular abajo a la izquierda. Es la referencia para
la integración en el sitio. Para verlo, sirve la raíz del repo (`npx http-server .`) y abre
`/prototipo/lente.html`.

## Cómo funciona el render

- **Acumulación.** Cada cuadro promedia 48 subcuadros. Cada uno mueve la cámara dentro del píxel
  (antialias), por la apertura del lente (profundidad de campo), dentro del obturador de 180°
  (motion blur) y por la luz de área cenital (sombras suaves).
- **Luminarias** como luces reales dentro del shader (`core/fixture-lights.ts`).
- **Piso pulido** con reflejo planar: cada lectura sigue el lóbulo de un piso visto en ángulo
  rasante, una franja vertical larga y angosta (`core/planar-reflection.ts`).
- **Revelado** AgX con los negros hacia el noche de la marca, viñeta, grano y una ventana de
  gradación donde va el titular. La capa de datos usa los colores exactos de `tokens.css`.
- **Loop exacto.** El mundo es periódico en x y la cámara recorre un periodo por loop. Todo lo
  animado usa `τ = t − k·D`: el módulo k+1 en t+D se ve igual que el módulo k en t.

## Costo de render (manufactura, 1920 × 1080, 48 subcuadros)

| Máquina | Física | Datos |
| --- | --- | --- |
| Contenedor de 4 núcleos sin GPU, lavapipe | ~58 s por cuadro (~5.8 h la toma) | ~5 s por cuadro |
| Intel UHD integrada, Chrome con ANGLE/D3D11 | ~12 s por cuadro (~75 min la toma), medido antes de estos cambios | ~2 s por cuadro |

## Calidad

```
npm run typecheck && npm run lint && npm test
```

Las pruebas cubren las invariantes del loop (el guion y las tarjetas cierran), que haya una
sola alerta por loop y el muestreo de subcuadros.
