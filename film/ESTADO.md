# Video del hero: estado y pendientes

**Estado: en pausa desde el 30 sep 2026.** Mientras tanto, el hero usa las fotografías generadas (`media-src/hero-*`). Los componentes aceptan video después sin cambiar su interfaz.

## Idea

Los videos del hero se generan con código, sin footage. Cada toma es un mundo 3D procedural de una industria, renderizado offline, y se exporta en **dos capas con la misma cámara**:

- **Física:** la operación.
- **Datos:** la misma operación como la ve SIP.
  - Máquinas: volúmenes con su estado.
  - Flujo físico y de información: el trazo del logo en azul señal, con giros redondeados.
  - Una alerta ámbar que ocurre y se resuelve en cada loop.

La lente del hero mezcla las dos capas alineadas al píxel. Eso es lo que comunica a SIP: tu operación y, debajo, sus datos en tiempo real. El razonamiento está en el registro de cambios del plan (30 sep 2026).

## Hecho

**Pipeline** (`film/` + `scripts/film.mjs`, documentado en el `README.md`):
- **Render por acumulación.** Cada cuadro promedia subcuadros con antialias, profundidad de campo, motion blur de 180° y sombras suaves de luz de área.
- **Revelado.** AgX con los negros hacia el noche de la marca. La capa de datos usa los colores exactos de `tokens.css`.
- **Luces de la nave.** La retícula de luminarias se calcula como luces reales dentro del shader (charcos de luz y brillos), con oclusión tomada de la luz cenital.
- **Reflejo planar del piso epóxico,** con desenfoque por rugosidad.
- **Comandos:** `render`, `loop` (verifica el cierre), `sheet`, `encode` (capas apiladas AV1 + H.264, póster AVIF/WebP) y `preview` (el corte de la I a 6° revela los datos).

**Mundo de manufactura, noche:**
- **Escena:** maquila de electrónica en Tijuana. Líneas SMT con pick-and-place (cabezales animados), AOI, horno de reflujo, torretas, sensores, charolas, ductos y nave.
- **Cámaras** 16:9 y 9:16 (composiciones distintas).
- **Guion de alerta** en `script.ts` (funciones puras, con pruebas).

**Calidad:**
- Tipos, Biome y Vitest limpios. Las pruebas cubren las invariantes del loop, que haya una sola alerta por loop y el muestreo.
- El loop cierra con PSNR de 50 dB entre el cuadro 0 y el siguiente al último. La diferencia es redondeo del mapa de sombras: invisible y muy por debajo del ruido de compresión.

Imágenes de referencia en `media-src/film/referencias/`.

## Renders en disco (`media-src/film/manufactura-noche-h/`, fuera de git)

| Capa | Cuadros listos | Nota |
| --- | --- | --- |
| `fisica` | 0000–0071 de 360 | Válidos con el código actual |
| `datos` | 0000–0220 de 360 | 0000–0107 válidos. Del 0108 en adelante se renderizaron con el ciclo de alerta anterior (8 loops): la alerta se repetía a 86 m, invisible en la niebla. Se re-renderizan para que coincidan con el código |

## Pendiente, en orden

1. **Terminar `manufactura-noche-h`:**
   ```
   npm run film -- render manufactura-noche-h --layer=fisica --frames=72-359
   npm run film -- render manufactura-noche-h --layer=datos --frames=108-359
   npm run film -- loop manufactura-noche-h
   npm run film -- sheet manufactura-noche-h --layer=fisica
   npm run film -- preview manufactura-noche-h
   npm run film -- encode manufactura-noche-h
   ```
2. **Revisión de dirección de arte con el usuario** sobre la vista previa. Hay que decidirla antes de modelar las otras industrias.
3. **Resto de manufactura:**
   - `-noche-v`: la cámara ya está encuadrada.
   - `-dia-h/v`: falta la luz de día (sol por las ventanas altas, entorno de día, revelado propio).
4. **Mundos pendientes**, cada uno con capa física, capa de datos, guion propio y cámaras h/v:
   - **logística:** terminal de contenedores de Ensenada; grúas, patio y tractocamiones;
   - **construcción:** obra en los cerros de Tijuana; grúa torre y colado;
   - **agroindustria:** macrotúneles en San Quintín; sensores de humedad y riego;
   - **energía:** parque eólico en La Rumorosa; aspas en loop exacto y subestación.
5. **"La I que se abre":** toma propia en plano general.
6. **Anclas por cuadro:** posiciones proyectadas de máquinas y torretas en JSON, para las etiquetas de la lente (idioma y valores del simulador los pone el sitio). No requiere render, se calcula con la cámara.
7. **Integración en el sitio:** lente WebGL2 sobre el video apilado (cursor en desktop; barrido y arrastre en móvil), con el póster como LCP. Sin WebGL se ve solo la mitad física.
8. **Decidir cómo versionar los videos.** Son unos 20 archivos de 2–4 MB: git normal o Git LFS en Netlify.

## Costo de render

Medido en esta máquina (Intel UHD integrada, Chrome con ANGLE/D3D11):
- **Capa física:** ~12 s por cuadro con 48 subcuadros.
- **Capa de datos:** ~2 s por cuadro.
- **Toma completa:** unos 75 min.
- **Las 20 tomas:** cerca de 25 h de render desatendido. Se puede repartir en noches, porque cada cuadro es independiente y se reanuda en cualquier punto.

## Decisiones que no se deben perder

- **El mundo es periódico en x.** La cámara recorre un periodo por loop. Todo lo animado usa `τ = t − k·D`, de modo que el módulo k+1 en t+D se ve igual que el módulo k en t.
- **La alerta se repite cada 16 loops,** más lejos que el último módulo modelado: en pantalla hay una sola por loop.
- **Una sola fuente de paleta:** `src/styles/tokens.css`.
- **Sin rejillas en la capa de datos** (regla del informe §2.6). Las etiquetas no se hornean: las pone el sitio, en el idioma del visitante.
