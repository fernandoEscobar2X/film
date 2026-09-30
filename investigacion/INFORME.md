# Investigación: sitio web SIP 2026

**Fecha:** 30 de septiembre de 2026
**Estado:** investigación cerrada. El stack se decide en conjunto después de las preguntas.
**Carpeta:** `investigacion/` vive en el repo y está en `.gitignore`: no se versiona nunca.

Contenido de la carpeta:

| Ruta | Qué hay |
| --- | --- |
| `INFORME.md` | Este documento |
| `capturas/framer/` | 32 hojas de contacto de componentes de Framer probados (ver `INDICE.md`) |
| `capturas/referencias/` | 9 hojas de sitios premiados navegados en desktop y móvil |
| `tipografia/especimen.html` | Especímenes navegables de 4 combinaciones con texto de SIP (abrir en el navegador) |
| `tipografia/*.png` | Render de los especímenes en desktop y móvil |
| `datos/` | Datos crudos: catálogo de Framer por categoría, resultados de cada pasada, stack detectado en referencias |

---

## 0. Resumen

1. **El nicho manda.** SIP conecta procesos y datos para que las empresas operen mejor y decidan con información en tiempo real. Cada decisión visual se filtra por esa frase: lo que se mueve en el sitio debe ser un proceso o un dato, no decoración.
2. **El slop ya tiene dos capas.** La primera es la conocida: morado→azul, Inter, tarjetas con icono, hero centrado. La segunda es la "de buen gusto": crema + terracota, eyebrows en mayúsculas espaciadas, numeración 01/02/03, cromo monoespaciado, una palabra en itálica serif. Evitamos las dos.
3. **Prohibido para SIP** (indicación directa): cuadrículas decorativas y rails sin función.
4. **Framer: tomar ideas, no componentes.** Probé 93 componentes (27 a fondo, en desktop y móvil táctil). Hay 22 ideas que sí se adaptan a SIP, casi todas en una versión propia. Muchos efectos de desktop desaparecen o se rompen en móvil, así que cada idea necesita su contraparte móvil diseñada aparte.
5. **Awwwards 2026:** navegué 8 sitios recientes cercanos al nicho (minería, océano, aviónica, logística, yardas, infraestructura). El patrón común:
   - narrativa de "sistema en operación";
   - imagen real o 3D de la operación;
   - scroll suave con Lenis;
   - framework propio (ninguno usa Framer);
   - móvil rediseñado sección por sección.
6. **Tipografía recomendada:** Hubot Sans (display, eje de ancho) + Mona Sans (texto) + Datatype (gráficas dentro del texto). Doto se reserva para el tablero Andon. Las cuatro son libres. Datatype está verificada: dibuja sparklines y barras a partir del texto.
7. **Presupuesto de rendimiento viable:**
   - JS inicial de unos 70–100 KB gzip: GSAP 48–62 KB + Lenis 5 KB + código propio.
   - WebGL diferido: OGL 13 KB o Three.js 130 KB.
   - Con esto, "móvil ≥ 85" es realista con movimiento intenso.
8. **Lighthouse 13.2 (mayo 2026) agregó una quinta categoría, "Agentic Browsing".** El formulario de contacto debe declararse como herramienta WebMCP con atributos HTML.
9. **Paleta con reglas de contraste:**
   - `#0189F5` solo como texto sobre fondos oscuros; sobre claro, texto en `#1469AC` o `#145998`.
   - Sobre `#1D2C41` solo texto blanco o hielo.

---

## 1. Qué es SIP (fuente: lámina de presentación)

**Nicho:** automatización y uso de datos para mejorar operaciones.
**En una frase:** SIP conecta procesos y datos para que las empresas operen mejor y tomen decisiones con información en tiempo real.

Inventario de contenido tomado de la lámina (solo contenido, no su diseño):

| Bloque | Contenido |
| --- | --- |
| Marca | Sistemas Inteligentes del Pacífico (SIP), Mazatlán, Sinaloa |
| Lemas | "Ideas que se convierten en soluciones reales" · "Tecnología que impulsa tu operación" · "Soluciones que conectan tu potencial" · "Impulsando la industria desde el Pacífico" · "Hagamos grande tu idea" |
| Quiénes somos | Empresa joven y dinámica; combina programación, análisis de datos y conocimiento industrial para transformar ideas en herramientas que generan valor |
| Pilares | Innovación práctica · Soluciones a la medida · Enfoque en resultados · Acompañamiento continuo |
| Visión | Ser referente en soluciones tecnológicas inteligentes en México: resolver desafíos reales con innovación, simplicidad y enfoque humano |
| Misión | Impulsar productividad y crecimiento con soluciones digitales robustas, confiables y escalables |
| Servicios (8) | Dashboards y visualización · Aplicaciones web y móviles · Telemetría industrial (IoT) · Integración de sistemas · Automatización de procesos · Análisis y explotación de datos · Desarrollo de software a medida · Soporte y mantenimiento |
| Industrias | Manufactura · Logística · Construcción · Agroindustria · Energía · Retail · Corporativo · y más |
| Proyectos | Dashboard de producción en tiempo real · Sistema Andon multilínea · Aplicaciones web y móviles |
| ¿Por qué SIP? | Flexibles y escalables · Trato cercano y directo · Experiencia en entornos industriales · Tecnología actual y confiable · Mejora continua · Resultados medibles · Relaciones a largo plazo · Pasión por la tecnología |
| Contacto | contacto@sipacifico.mx · +52 669 123 4567 · Mazatlán, Sinaloa · www.sipacifico.mx |

> **Nota de copy:** varios lemas de la lámina son intercambiables con los de cualquier empresa ("soluciones reales", "impulsa", "potencial"). La literatura (sección 2) coincide en que un sitio con diseño propio sigue pareciendo genérico si el texto lo es. Propuesta: conservar las ideas de la lámina y reescribirlas con vocabulario de operación (paros, turnos, líneas, OEE, andenes, cámaras frías, consumo, avance de obra). Ejemplo: "Tecnología que impulsa tu operación" → "Tu planta, en tiempo real".

---

## 2. AI slop y sitios genéricos: qué dice la literatura

### 2.1 Por qué se ven todos iguales

- **Convergencia estadística.** Los modelos generan el promedio de lo que vieron. Ante un pedido abierto ("landing moderna") eligen los patrones más frecuentes: Inter, morado→azul, tres tarjetas, hero centrado. Anthropic lo describe como convergencia hacia salidas "on distribution" y publicó una skill específica para contrarrestarlo.
- **La homogeneización es anterior a la IA.** Goree et al. (CHI 2021) analizaron cerca de 200 000 capturas de 10 000 sitios entre 2003 y 2019. La distancia promedio entre layouts cayó más de 30 % desde 2007. Las causas: las mismas librerías, esquemas de color estandarizados y el diseño para móvil. La IA acelera un proceso que ya existía.
- **Lo que la herramienta dice no es lo que hace.** *Design Theater* (arXiv, julio 2026) evaluó 120 interfaces de 5 herramientas generativas:
  - más del 25 % de las decisiones de diseño que la herramienta "explica" no se implementan (34 % en requisitos funcionales);
  - el aspecto visual y el layout convergen entre herramientas.
- **Escala.** Según un informe de 2026 (Sailop), cerca del 70 % de las páginas comerciales nuevas en inglés de enero a abril de 2026 contiene texto generado por LLM.

### 2.2 Síntomas de primer orden (el slop evidente)

- Degradado morado→azul; texto con degradado (`bg-clip-text`); resplandores de color detrás de tarjetas.
- Inter o Geist como única fuente; ninguna fuente de display; fuentes declaradas pero no cargadas.
- Hero centrado: pill/badge arriba ("Nuevo"), título, subtítulo, dos botones, imagen abajo.
- Tres tarjetas con icono en cuadro redondeado; secuencia fija hero → logos → features → stats → pricing → CTA → footer de 4 columnas.
- `rounded-2xl shadow-lg` en todo; glass/blur por reflejo; badges "Live" que pulsan sin reflejar un estado real; borde lateral de color en tarjetas redondeadas.
- El mismo fade-up en cada sección; easing con rebote; contadores que suben (count-up); animación que ignora `prefers-reduced-motion`.
- Iconos Lucide; el ícono de destellos para decir "IA"; avatares de relleno; efectos de catálogo (Aceternity, Magic UI: spotlight card, border beam).

### 2.3 Síntomas de segundo orden (el slop "de buen gusto")

Estos son los que hoy delatan un sitio hecho con IA aunque "se vea bien":

- Crema + terracota; casi negro + un solo verde ácido o bermellón; verde esmeralda como paleta de rescate.
- Eyebrows en mayúsculas con tracking amplio; "cromo" monoespaciado en mayúsculas por todos lados.
- Una palabra del título en itálica serif (Instrument Serif, Fraunces).
- Numeración decorativa 01 / 02 / 03; cadenas "A · B · C".
- Ventanas falsas con tres puntitos; cosplay de periódico.
- Texto secundario por debajo del contraste AA.
- Deriva del sistema: la fuente, el radio o la navegación cambian de página a página.

### 2.4 Síntomas en el texto

- "Transforma", "potencia", "impulsa", "sin fisuras", "lleva tu negocio al siguiente nivel".
- Tríadas ("más rápido, más simple, más inteligente").
- Uso excesivo de guion largo: entre 4 y 6 veces más frecuente en texto generado que en archivo de 2019.
- CTAs genéricos ("Empezar", "Saber más"); conclusiones que repiten la introducción.

### 2.5 Qué distingue a lo no genérico

- Texto específico con resultados y vocabulario del cliente.
- Composición asimétrica, no todo al centro.
- Paleta propia, no heredada de Tailwind.
- Fotografía o 3D real de lo que hace la empresa.
- Movimiento que comunica estado o dirige la atención.
- Un sistema documentado (tokens y reglas) que evita la deriva.

La conclusión de todas las fuentes coincide: **el slop es un problema de aceptar defaults**, no de herramientas.

### 2.6 Reglas para SIP

**Prohibido**

- Cuadrículas decorativas: fondos de líneas o puntos, bento grids, rejillas de logos con líneas.
- Rails sin función: barras laterales de progreso, índices de secciones pegados al borde, reglas de ticks.
- Todo lo listado en 2.2, 2.3 y 2.4.
- Iconos de sistema, de librería (Lucide, Heroicons, etc.) y emojis.
- Globos terráqueos con arcos, redes de puntos (plexus), auroras y blobs, esferas de vidrio.
- Contadores de "stats de vanidad", marquees de logos, carrusel de testimonios con avatares de stock.
- Cursores personalizados como adorno, y cualquier efecto de hover sin equivalente en táctil.

**Permitido con condición**

- **Pills:** solo con función y forma de la marca, nunca como adorno. Ejemplos: filtro por industria, estado de una línea (operando / paro / mantenimiento), selector de proyecto.
- **Tipografía de datos (mono o Datatype):** solo para datos reales o simulados de las demos, no como decoración de etiquetas.
- **Números:** solo cuando son un dato (hora en Mazatlán, OEE en la demo), nunca para numerar secciones.
- **Colores de estado (verde / ámbar / rojo):** solo dentro de visualizaciones de datos, donde significan algo.

---

## 3. Marketplace de Framer: qué probé y qué sirve

### 3.1 Método

1. Recorrí 13 categorías del marketplace, con unos 480 componentes listados: fondos, efectos, texto, interactivos, galerías, carruseles, gráficas, cursores, navegación, loaders, mapas, video y secciones.
2. **Primera pasada (93 componentes):** abrí la demo en vivo de cada uno a 1440 × 900. Capturé en reposo, después de un recorrido del mouse (barrido y círculo) y a mitad de scroll.
3. **Segunda pasada (27 preseleccionados):**
   - **Desktop:** reposo → barrido horizontal → círculo con el mouse → hover al centro → clic → tres tramos de scroll.
   - **Móvil táctil (390 × 844):** reposo → tap → dos tramos de scroll → verificación de overflow horizontal.

Las hojas de contacto están en `capturas/framer/`.

### 3.2 Hallazgos generales

- **Estética de fábrica:** muchas demos traen los defaults de la sección 2 (crema + serif, morado, pills decorativas, 01/02). La mecánica suele ser buena y la piel no.
- **Desktop ≠ móvil:**
  - `flashlight-reveal` provoca overflow horizontal en móvil;
  - `video-scrubber-pro` descuadra el layout;
  - `image-flow` pierde toda su interacción;
  - los cursores y los efectos de hover simplemente no existen en táctil.

  Lo que sí funciona en ambos (`droplet-reveal`, `scroll-zoom`, `perspective-tiles`, `how-we-work`) está basado en scroll, no en el cursor.
- **Buen modelo de adaptación móvil:** `perspective-tiles`. En desktop son franjas horizontales que se expanden con hover; en móvil se convierten en tarjetas verticales a pantalla completa. Es otra experiencia, no la misma encogida.
- **Peso:** cada demo carga el runtime de Framer (entre 225 y 616 KB de JS comprimido en las demos probadas). Es otra razón para reconstruir la idea en nuestro código en vez de incrustar componentes.

### 3.3 Ideas que sí tomamos, adaptadas a SIP

| # | Componente(s) probados | Qué hace (visto al interactuar) | Adaptación para SIP | Desktop | Móvil |
| --- | --- | --- | --- | --- | --- |
| 1 | `droplet-reveal` | Una gota inline dentro de la frase crece con el scroll hasta ser imagen a pantalla completa | **"La I que se abre":** la I inclinada del logo aparece dentro de un titular y con el scroll se abre hasta ser el video de una operación | Sí | Sí (probado) |
| 2 | `screeninghero`, `reveal-slideshow`, `imagesweep` | Hero de slides a pantalla completa con miniaturas, contador y barridos direccionales | **Hero por industria:** manufactura, logística, construcción, agro y energía. Transición en el ángulo de la I; pills funcionales para elegir industria; avance automático con progreso | Miniaturas + teclado | Swipe horizontal, pills abajo en zona del pulgar |
| 3 | `photo-hotspots`, `viewfinder`, `lantern-reveal`, `rays` | Puntos sobre una foto; HUD de cámara sobre video; linterna que revela | **"Lente de datos":** sobre el video del hero, el cursor funciona como sensor y revela la capa de datos de la escena (valores pegados a cada máquina) | Cursor = lente | Barrido de escaneo automático + arrastre con el dedo |
| 4 | `storyline-reveal`, `fogtype` | Párrafo que se ilumina palabra por palabra con el scroll | **Manifiesto:** las palabras clave ("datos", "procesos", "tiempo real") se convierten en datos vivos al iluminarse, usando Datatype | Sí | Sí |
| 5 | `sticky-overlap` | Nombres de servicio enormes y condensados; paneles que se apilan al hacer scroll | **Índice de servicios:** tipografía grande con eje de ancho; cada panel trae una mini-demo en vivo en lugar de un icono | Paneles apilados | Tarjetas apiladas a pantalla completa |
| 6 | `how-we-work` | Pasos fijados (1/5) con imagen que cambia | **"Señal → dato → decisión":** escena fijada que cuenta cómo trabaja SIP: sensor → integración → dashboard → alerta → acción | Sí | Sí, vertical |
| 7 | `svg-reveal-on-scroll` | Líneas que convergen en un punto con el scroll | **Integración de sistemas:** ERP, PLC, sensores y hojas de cálculo convergen en un solo tablero. Se dibuja con el trazo del logo | Sí | Sí |
| 8 | `perspective-tiles`, `image-flow` | Franjas que se expanden al hover | **Industrias:** franja por industria con video, "qué medimos" y una sparkline | Franjas | Tarjetas verticales a pantalla completa |
| 9 | `worddrum` | Tambor 3D de palabras que gira | Tambor mecánico con los nombres de las industrias, como un contador de máquina | Sí | Sí |
| 10 | `before-after-case`, `image-compare` | Deslizador antes/después | **Casos:** "Antes: papel y Excel / Después: tablero en vivo" | Arrastre | Arrastre táctil |
| 11 | `scroll-zoom` | Tarjeta que crece a pantalla completa con el scroll | Transición del proyecto (tarjeta → página del caso) | Sí | Sí (probado) |
| 12 | `kinetic-marks` | Marcas 3D pequeñas y generativas | **Sustituto de iconos:** cada servicio tiene una marca generada con la forma de su propio dato (onda, barras, nodos) | Sí | Sí |
| 13 | `timezone-indicator` | Mapa con "su hora / tu hora / diferencia" | **Contacto:** "Hora en Mazatlán vs. tu hora". Humano y funcional, sin mapa de puntos | Sí | Sí |
| 14 | `animated-fittext-pro` | Texto que ocupa exactamente el ancho | Frases de cierre al ancho exacto usando el eje de ancho de la fuente | Sí | Sí |
| 15 | `gauge-dial-loader` | Manómetro con aguja | Solo dentro de la demo del dashboard (OEE, presión, temperatura), nunca como loader | Sí | Sí |
| 16 | `vision-engine`, `dithershader` | Imagen renderizada como matriz de LEDs | **Tablero Andon:** números LED con la fuente Doto (6 KB) en lugar de un shader pesado | Sí | Sí |
| 17 | `numberodometer` | Números que ruedan | Solo para valores vivos de las demos (piezas por hora), nunca para stats de vanidad | Sí | Sí |
| 18 | `svg-draw-animation` | Logo que se dibuja | Intro breve: la S y la P se trazan como una ruta continua y la I entra en su ángulo | Sí | Sí |
| 19 | `video-scrubber-pro` | Video controlado por scroll | Buena idea para un proceso (materia prima → producto). Esta implementación se rompe en móvil, así que la construimos distinta | Sí | Versión propia |
| 20 | `horizontal-scroll-5s` | Scroll horizontal fijado con tipografía grande | Posible para proyectos en desktop | Sí | Vertical |
| 21 | `focusframe-cursor` | Corchetes que enmarcan el elemento bajo el cursor | **Tal vez:** "modo inspección" solo en desktop, sutil | Sí | No aplica |
| 22 | `ripple-background` | Campo de líneas que reacciona al cursor | **Tal vez:** solo si representa un dato (lecturas de sensores); si es textura, se descarta | Sí | Estático |

### 3.4 Descartados, y por qué

| Componentes | Motivo |
| --- | --- |
| `spotlight-card`, `frame-beam` | Efectos de catálogo (Magic UI / Aceternity): síntoma de primer orden |
| `halo-effect`, `ridge-flow-shader`, `particle-globe-3d` | Blobs, auroras moradas, esferas: slop |
| `wireframe-globe`, `global-network`, `dot-map-redux`, `dot-field-background` | Globo con arcos y plexus: cliché de "tecnología" |
| `cursorgrid`, `framegrid`, `grid-reveal-canvas`, `pixel-scroll-divider` | Cuadrículas: prohibido |
| `rail-navbar`, `scroll-spy-nav`, `scrollprogressticks` | Rails: prohibido |
| `float-bar`, `mono-nav`, `agency-hero-pro`, `uxtimeline`, `scroll-stack` | Navegación en pill flotante, hero SaaS, tarjetas crema con icono: genéricos |
| `interactive-ticker`, marquees, `cursorimagetrail`, `hover-magnetic`, `infinite-zoom-scroll` | Recursos de moda sin relación con el nicho |
| `macbook-reveal`, `cinema-screen-video`, `live-crypto-chart`, `data-studio-pro`, `interactive-charts` | Cliché Apple; gráficas SaaS genéricas (las nuestras se diseñan con datos de operación) |
| `bayerditheringfx`, `halftonepro`, `ascii-art-effect`, `typeflux`, `spike-text`, `text-vortex` | Tendencias de 2025–26 sin significado para SIP |
| `logo-loader`, `preloader-hero`, `shaftloader` | Loaders que retrasan el contenido; si hay intro, es la #18 y dura menos de 1 s |

---

## 4. Referencias de Awwwards recientes (navegadas en desktop y móvil)

Capturas en `capturas/referencias/`.

| Sitio | Premio | Qué hace / lo que vi al navegar | Stack y fuentes detectados | Qué tomamos | Qué no |
| --- | --- | --- | --- | --- | --- |
| **CoMinVi** (minería subterránea, México) | SOTD 30 sep 2026 | Hero cinematográfico oscuro: render 3D de maquinaria con luces en un túnel. Texto que se llena de gris a negro con el scroll | Webflow + jQuery · Helvetica Now Display + PP Supply Mono | Precedente mexicano industrial premiado. La maquinaria real (o 3D) como protagonista | Stats con iconos pequeños |
| **Seasats** (autonomía oceánica) | SOTD 8 sep 2026 | Descenso submarino con líneas de texto que se iluminan. Taller real con 4 atributos. Globo de misiones con **filtros en pill**. Producto 3D que rota con el scroll con videos flotantes. **El fondo cambia de color por producto** (verde mar → arena → naranja atardecer). Fichas técnicas como tabla de datos | Next.js + Lenis, 5 canvas · Season Mix / Season Sans + Supply Mono | Color que viene del entorno real; pills funcionales; datos técnicos como contenido; objeto 3D atado al scroll; **móvil rediseñado por sección** | — |
| **USAvionix** (aviónica autónoma) | SOTD 9 sep 2026 | Historia cinematográfica: dron sobre terreno → red de enjambre → zonas de análisis con alertas → coordinación → respuesta. Etiquetas HUD con estados del sistema | Next.js + Lenis · Geist + Geist Mono | **La narrativa "sistema en operación"**, que es exactamente la de SIP: señal → dato → decisión | Fondos de cuadrícula (prohibido); red de nodos |
| **United Carriers** (logística) | SOTD 6 sep 2026 | Globo naranja, tipografía condensada enorme, servicios con iconos, footer con logotipo tramado | Webflow + Lenis · BT Steinhart | Poco: la foto cenital de buques como imagen de operación real | Globo, iconos |
| **Terminal Industries** (patios de carga) | Sitio del Mes, sep 2025 | Tráiler al atardecer. **Calculadora interactiva "¿Cuánto te cuesta tu patio?"** | Nuxt + Lenis · Suisse Intl + Geist Mono | **Calculadora como prueba de valor:** "¿Cuánto te cuesta un paro de línea?" | Rejilla de logos, pill verde lima |
| **Cerebrium** (infraestructura de IA) | SOTD 10 sep 2026 | Gráficas reales como contenido (comparativa de latencia; pestañas GPU/CPU que funcionan como pills) | **Astro 6 + Swup + Lenis** · Suisse Int'l + ABC Favorit | Prueba de que Astro llega a nivel Awwwards; gráficas como argumento | Paleta magenta/morada "de IA", esfera de vidrio |
| **L.I.S.A.** (Locomotive) | SOTD 16 sep 2026 | Personaje 3D interactivo y asistente conversacional: la interacción es el contenido | Propio · Helvetica Now Display + Locomotive New | Idea de un flujo guiado ("diagnóstico de tu operación") | Lejano al nicho |
| **Illoca** (Unseen) | SOTD 4 sep 2026 | Una sola escena 3D renderizada en **duotono azul de marca**; la cámara avanza con el scroll | Nuxt · F37 Analog, Graphik, Architect Pro, Geist Mono | **Una escena de operación renderizada solo con los azules de SIP** como pieza firma | Crema + azul y el tramado (tendencias de segundo orden) |

**Patrones que se repiten:**

1. Lenis en 6 de 8 sitios.
2. Framework propio (Next, Nuxt, Astro) o Webflow. **Ninguno usa Framer.**
3. Fuentes comerciales en 7 de 8 (Suisse, Helvetica Now, Season, Steinhart, Favorit), casi siempre con una fuente de datos secundaria.
4. La imagen muestra la operación real (máquinas, buques, drones), no abstracciones.
5. El móvil se rediseña por sección.
6. El scroll cuenta cómo funciona el sistema.

---

## 5. Tipografía

**Criterios:**

- Encajar con el nicho: automatización, datos, industria.
- Dialogar con el logo: letras anchas, trazo constante, esquinas redondeadas, la I inclinada.
- Buen soporte de acentos y ñ.
- Ejes variables para jerarquía y movimiento.
- Peso razonable y licencia libre.
- Fuera de la lista de slop: Inter, Geist, Space Grotesk, Instrument Serif, Fraunces, Poppins, Montserrat, DM Sans, Manrope, Satoshi, General Sans, Clash, Syne.

Especímenes con el texto de SIP en `tipografia/especimen.html` (desktop y móvil en los PNG):

| Opción | Display | Texto | Datos | Lectura |
| --- | --- | --- | --- | --- |
| **A · Instrumento (recomendada)** | Hubot Sans, ancho 75–125 % | Mona Sans | **Datatype** (gráficas en el texto) | Ancha y geométrica como el logo; condensada para listas. Las sparklines y barras dentro del texto son únicas y hablan el idioma de SIP (dashboards) |
| B · Taller | Special Gothic, extendida / condensada (Google Fonts 2025) | Hanken Grotesk | **Doto** (LED) | Gótica industrial de principios del siglo XX. Doto da números de tablero LED, ideal para el Andon |
| C · Archivo | Archivo (Omnibus-Type, Argentina), ancho 62–125 % | Archivo | Martian Mono | Superfamilia latinoamericana, muy sólida. Menos carácter propio que A |
| D · Señal | Big Shoulders, condensada, mayúsculas | Mona Sans | Martian Mono | Señalética industrial fuerte, pero rompe el diálogo con el logo ancho y se acerca a lo deportivo |

**Verificado en navegador:**

- Datatype convierte `{l:40,52,48,61,70,66,82,87}` en sparkline y `{b:30,45,80,62,90,74}` en barras, con el archivo latin de Fontsource.
- Doto funciona con su eje de redondez.
- Todas se renderizan bien en móvil.
- El eje de ancho resuelve el móvil: la misma familia va expandida en desktop y más estrecha en móvil sin cambiar de fuente.

**Jerarquía propuesta (opción A):**

| Nivel | Fuente | Ajustes |
| --- | --- | --- |
| Display (hero, cierres) | Hubot Sans | Ancho 110–125 % en desktop, 95–105 % en móvil; peso 700–800 |
| Títulos de sección | Hubot Sans | Ancho 100 %; 600–700 |
| Listas y etiquetas | Mona Sans | Ancho 75–88 %; 540–600; en minúsculas con mayúscula inicial, **sin tracking amplio** |
| Texto corrido | Mona Sans | Ancho 100 %; 400; 17–19 px; interlineado 1.5 |
| Datos | Datatype (gráficas) + Mona Sans con cifras tabulares | Solo con datos reales o de demo |
| Andon | Doto | Solo dentro de la demo del tablero |

**Pesos (latin, woff2):**

- Hubot Sans con eje de ancho: 91 KB.
- Mona Sans: 96 KB con eje de ancho, 39 KB solo peso.
- Datatype: 69–76 KB.
- Doto: 6 KB.

Estrategia: precargar solo display y texto, cargar Datatype y Doto en diferido y hacer subset a los caracteres usados.

**Alternativa comercial:** 7 de 8 referencias usan fuentes con licencia (Suisse, Helvetica Now, Season). Si hay presupuesto, se puede evaluar una display comercial. La opción A no depende de eso.

---

## 6. Librerías y rendimiento

### 6.1 Candidatas, con peso medido

Peso medido empaquetando imports típicos con esbuild (minificado + gzip). Versiones al 30 sep 2026.

| Librería | Versión | gzip | Para qué | Veredicto |
| --- | --- | --- | --- | --- |
| GSAP (core + ScrollTrigger + SplitText) | 3.15.0 | 48 KB | Coreografía, scroll, texto dividido accesible | **Base del movimiento.** Gratis con todos sus plugins desde 2025 |
| GSAP + Flip, DrawSVG, CustomEase, Observer | 3.15.0 | 62 KB | Transiciones de layout, trazos, easing propio, gestos | Por ruta, según se necesite |
| Lenis | 1.3.26 | 5 KB | Scroll suave | **Sí** (6 de 8 referencias) |
| OGL | 1.0.11 | 13 KB | WebGL mínimo: shaders, video como textura | **Para shaders de pantalla completa** |
| Three.js (típico) | 0.186.1 | 130 KB | Escenas 3D | Solo si hay modelos 3D. Diferido |
| Three.js + GLTF/Draco | 0.186.1 | 155 KB + decoder | Modelos .glb | Solo en la escena firma, diferido |
| postprocessing | 6.39.5 | 86 KB | Bloom, ruido | Evitar; hacer el efecto en el shader propio |
| Motion (motion.dev) | 13.4.6 | 24 KB | Animación ligera | Alternativa si no usamos GSAP |
| anime.js | 4.5.0 | 18 KB | Animación ligera | Alternativa |
| Swup | 4.10.0 | 7 KB | Transiciones entre páginas (lo usa Cerebrium con Astro) | Candidata |
| Taxi (Unseen) | 2.0.0 | 6 KB | Transiciones entre páginas | Candidata |
| Barba | 2.10.3 | 10 KB | Transiciones entre páginas | Candidata |
| uPlot | 1.6.32 | 22 KB | Gráficas en tiempo real muy rápidas | **Para las demos de dashboard** |
| d3-shape + d3-scale | 3.x / 4.x | 15 KB | Gráficas SVG a medida | Para las marcas de servicio |
| Rive (canvas-lite) | 2.44.0 | 53 KB **+ 359 KB WASM** | Animación interactiva con máquina de estados | Pesada; solo si hay una pieza que lo justifique |
| dotLottie | 0.80.0 | 13 KB **+ 484 KB WASM** | Lottie | Evitar |

### 6.2 Presupuesto (móvil ≥ 85, resto en 100)

- **JS inicial:** unos 70–100 KB gzip (GSAP 48 + Lenis 5 + código propio). Todo lo demás se carga por ruta y después del LCP.
- **WebGL:** se inicia después del primer render (en idle o al entrar en viewport). El canvas nunca es el LCP.
- **Video:**
  - `muted autoplay loop playsinline`, con `preload="none"` y póster;
  - el póster (AVIF/WebP) es el LCP, con `fetchpriority="high"`;
  - versión móvil vertical ligera; AV1 o VP9 con respaldo en H.264.
- **Fuentes:** 2 precargadas, métricas de fallback ajustadas para no mover el layout; Datatype y Doto en diferido.

### 6.3 Cómo sostener Lighthouse con mucho movimiento

- **LCP:** Chrome ignora elementos con `opacity: 0`, así que el titular del hero nunca arranca invisible. Se anima con `transform` o `clip-path` desde un estado ya visible (o desde `opacity` ≥ 0.1). Cada animación de entrada que oculta el LCP lo retrasa exactamente lo que dura.
- **CLS:** dividir el texto (SplitText) solo después de `document.fonts.ready`; reservar la proporción de todo medio; fallback de fuente con métricas ajustadas.
- **TBT:** inicializar por sección en idle; nada de trabajo pesado en el primer frame; los shaders se compilan fuera del camino crítico.
- **Accesibilidad:**
  - tabla de contraste de la sección 0;
  - `prefers-reduced-motion` con versión estática completa;
  - foco visible y navegación por teclado en demos y sliders;
  - SplitText en modo accesible;
  - canvas decorativos con `aria-hidden`; video sin audio.
- **SEO:** título y descripción por página, canónicas, sitemap, JSON-LD de `LocalBusiness` (Mazatlán), `lang="es-MX"`.
- **Buenas prácticas:** cero errores en consola. Cuidado con analítica que ponga cookies de terceros (ver preguntas).
- **Agentic Browsing (nuevo en Lighthouse 13.2, mayo 2026):**
  - agrega auditorías de accesibilidad y tres de WebMCP: cobertura de formularios, herramientas registradas y validez del esquema;
  - el formulario de contacto se declara con `toolname`, `tooldescription` y `toolparamdescription`, y el `submit` responde con `respondWith()` cuando lo invoca un agente;
  - Chrome lo soporta desde la versión 149 (origin trial 149–156; la API pasó de `navigator.modelContext` a `document.modelContext`).

### 6.4 Frameworks en la mesa (a decidir juntos)

| Framework | Versión | Nota |
| --- | --- | --- |
| Astro | 7.3.5 | Estático por defecto (0 JS salvo lo que se pide). Compilador en Rust y Vite 8. Transiciones nativas o Swup. Referencia premiada: Cerebrium (Astro 6) |
| Next.js | 16.3.8 | React 19.3; ecosistema R3F para 3D. Más JS base. Referencias: Seasats, USAvionix |
| Nuxt | 4.5.2 | Vue. Referencias: Terminal, Illoca |
| SvelteKit | 2.70.3 / Svelte 5.57 | Muy ligero; ecosistema más chico para este tipo de piezas |

### 6.5 Principios de arquitectura (independientes del framework)

- **Tokens de diseño** en un solo lugar: color, tipografía, espaciado, easing y duraciones. Los componentes no usan valores sueltos.
- **Contenido tipado** separado de la presentación: servicios, industrias, proyectos y textos validados con esquemas (zod).
- **Secciones como módulos aislados:** cada una con su marcado, estilos y su propio controlador de movimiento.
- **Sistema de movimiento con ciclo de vida:**
  - un registro que monta y desmonta animaciones por sección;
  - variantes por `matchMedia` (desktop / móvil / movimiento reducido);
  - limpieza al cambiar de página, para que no queden listeners ni ScrollTriggers vivos.
- **Escenas WebGL como módulos diferidos** con interfaz común: `init`, `resize`, `pause`, `destroy`. Se pausan fuera de viewport y con la pestaña oculta.
- **Una sola fuente de datos simulados** (un "simulador de planta") alimenta a la vez el hero, el dashboard, el Andon y la calculadora. Así los números son coherentes en todo el sitio y se reemplazan por datos reales sin tocar la vista.
- **Calidad automatizada:**
  - TypeScript estricto;
  - lint y formato;
  - pruebas unitarias del simulador y la calculadora;
  - e2e y visuales en desktop y móvil;
  - Lighthouse CI con umbrales en cada PR (móvil perf ≥ 85; a11y, buenas prácticas, SEO y agentic en 100).
- **Assets:** una carpeta de marcadores con nombres y medidas definitivas, para cambiar los falsos por los reales sin tocar código.

---

## 7. Propuesta de dirección de arte (para discutir)

**Idea central: "Operación en tiempo real".** El sitio se comporta como un sistema de SIP: capta señales de una operación, las convierte en datos y muestra decisiones. **Todo lo que se mueve es un dato o un flujo de proceso.** Nada se mueve solo por decorar.

### 7.1 Sistema derivado del logo (no de tendencias)

- **El trazo:** la S y la P del logo son un trazo de grosor constante con giros ortogonales redondeados. Es el mismo lenguaje de una banda transportadora, una tubería o un diagrama de instrumentación. Ese trazo conecta cosas (sistemas en la integración, pasos del proceso, transiciones). **Nunca es un rail ni una cuadrícula**: aparece solo cuando algo fluye de A a B.
- **El corte:** la I inclinada (unos 6°) define el ángulo de barridos, máscaras y transiciones. La "I que se abre" (idea #1) es la pieza firma.
- **Color:**
  - la paleta de `marca-sip`: noche `#011631`, marino `#1D2C41`, azules del logo, azul digital `#0189F5`, hielo `#F3F8FD`;
  - opcional: el hero sigue la hora real de Mazatlán (escena de noche o de día);
  - verde / ámbar / rojo solo como estados dentro de los datos.
- **Imagen:** la operación real de cada industria, filmada o renderizada de forma cinematográfica. Mientras tanto, falsos generados con las medidas finales.
- **Tipografía:** opción A (sección 5).

### 7.2 Principios de movimiento

1. Precisión mecánica: salidas firmes, sin rebote, sin elasticidad.
2. El scroll es tiempo: avanzar es ver cómo el proceso ocurre.
3. Los datos se mueven como datos: pasos, lecturas, actualizaciones. No hay contadores de vanidad.
4. Cada sección tiene un movimiento propio ligado a su contenido. Nunca el mismo fade-up en todas.
5. Movimiento reducido: una versión estática completa y digna, no un sitio roto.

### 7.3 Mapa de secciones (home) con experiencia distinta por dispositivo

| Sección | Contenido | Desktop | Móvil |
| --- | --- | --- | --- |
| Hero · Operación en vivo | Slides por industria + titular + CTA | Video a pantalla completa; el cursor es una lente que revela la capa de datos; composición asimétrica, titular abajo a la izquierda | Encuadre vertical propio; barrido de escaneo automático; arrastre con el dedo; pills de industria en la zona del pulgar |
| Manifiesto | Quiénes somos + pilares | El párrafo se ilumina con el scroll y las palabras clave se vuelven datos vivos | Igual, en columna; lectura a ritmo del dedo |
| Señal → dato → decisión | Cómo trabaja SIP (une 8 servicios en un proceso) | Escena fijada: sensor → integración (el trazo) → dashboard → alerta → acción | Pasos verticales a pantalla completa |
| Servicios | 8 servicios | Índice tipográfico grande; paneles apilados con mini-demo en vivo | Tarjetas apiladas con swipe |
| "La I que se abre" | "Tecnología que impulsa tu operación" | La I del titular se abre al video | Igual (probado en móvil) |
| Proyectos | Dashboard en tiempo real · Andon multilínea · Apps | Demos jugables: el dashboard se actualiza solo; en el Andon puedes disparar un paro en una línea; antes/después | Demos a pantalla completa, controles al alcance del pulgar |
| Calculadora | "¿Cuánto te cuesta un paro?" | Entradas → costo estimado y ahorro potencial | Pasos de uno en uno |
| Industrias | 7 + "y más" | Franjas que se expanden con video, "qué medimos" y sparkline | Tarjetas verticales a pantalla completa |
| Por qué SIP · Visión · Misión | Compromisos | Tipografía cinética: el ancho cambia con la velocidad del scroll | Versión sin cinética costosa |
| Contacto | "Hagamos grande tu idea" | Formulario (WebMCP), hora en Mazatlán vs. tu hora, correo que se copia | CTA fijo abajo, formulario de un paso por pantalla |

### 7.4 Assets que se van a necesitar (para generar los falsos)

- Video del hero por industria: manufactura, logística/puerto, construcción, agro, energía. Horizontal 16:9 y vertical 9:16, loops de 8–12 s, opcionalmente en versión día y noche.
- Video de "la I que se abre": una operación en plano general.
- Fotos por industria para las franjas (vertical y horizontal).
- Si se elige la escena 3D firma: modelo `.glb` optimizado de una línea o máquina.

Las medidas exactas y los nombres de archivo se definen junto con el stack.

---

## 8. Siguiente paso

Preguntas para definir el stack (se hacen en la conversación). Con las respuestas se proponen opciones de stack y se decide en conjunto.

---

## Fuentes

- [avoid-ai-design (GitHub): síntomas de primer y segundo orden](https://github.com/funboy322/avoid-ai-design)
- [AI Slop Web Design: Complete Guide (925 Studios, 2026)](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [AI Slop in 2026: The State of the AI-Generated Web (Sailop)](https://www.sailop.com/blog/ai-slop-2026-state-of-the-ai-generated-web)
- [AI design slop: overused UI patterns (Noqta, 2026)](https://noqta.tn/en/blog/ai-design-slop-overused-ui-patterns-fix-2026)
- [Why AI landing pages look generic (Superdesign)](https://superdesign.dev/blog/fix-generic-ai-landing-page)
- [How to keep your website from looking like every vibe-coded site](https://codemyspec.com/blog/vibe-coded-websites-look-the-same)
- [Investigating the Homogenization of Web Design (Goree et al., CHI 2021)](https://vision.soic.indiana.edu/papers/websimilarity2021chi.pdf)
- [Design Theater: generative UI tools (arXiv 2607.22928, julio 2026)](https://arxiv.org/abs/2607.22928)
- [Anthropic frontend-design skill y la "distributional convergence"](https://paddo.dev/blog/claude-code-plugins-frontend-design/)
- [The serif renaissance in AI branding](https://keyavadgama.substack.com/p/the-serif-renaissance-in-ai-branding)
- [Awwwards: Sites of the Day](https://www.awwwards.com/websites/sites_of_the_day/) · [CoMinVi](https://www.awwwards.com/sites/cominvi) · [Terminal Industries](https://www.awwwards.com/sites/terminal-industries) · [L.I.S.A.](https://www.awwwards.com/sites/l-i-s-a) · [Industrial](https://www.awwwards.com/inspiration_search/industrial/) · [WebGL](https://www.awwwards.com/websites/webgl/)
- [10 Best Award-Winning Websites of 2026 (Hon Tran)](https://www.hontran.dev/blog/best-award-winning-websites-2026)
- [Framer Marketplace: componentes](https://www.framer.com/marketplace/components/)
- [Introducing Mona Sans and Hubot Sans (GitHub)](https://github.blog/news-insights/company-news/introducing-mona-sans-and-hubot-sans/) · [Datatype (Fontsource)](https://fontsource.org/fonts/datatype/about) · [Datatype (Kottke)](https://kottke.org/26/07/0049391-datatype-is-an-opentype-v) · [Doto (Google Fonts)](https://fonts.google.com/specimen/Doto/about) · [Special Gothic (Adobe Fonts)](https://fonts.adobe.com/fonts/special-gothic)
- [Webflow makes GSAP 100 % free](https://webflow.com/blog/gsap-becomes-free) · [Lenis](https://cdn.jsdelivr.net/npm/lenis@1.3.8/README.md) · [Astro 7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/) · [Astro Fonts API](https://docs.astro.build/en/guides/fonts/)
- [Opacity animations and poor LCP (DebugBear)](https://www.debugbear.com/blog/opacity-animation-poor-lcp) · [Don't hide the LCP behind animations (Shopify)](https://shopify.dev/docs/storefronts/themes/best-practices/performance/dont-hide-lcp-image-behind-animations) · [Video performance (web.dev)](https://web.dev/learn/performance/video-performance)
- [Lighthouse 13 (Chrome for Developers)](https://developer.chrome.com/blog/lighthouse-13-0) · [Lighthouse 13.2: Agentic Browsing](https://yrkan.com/tools-updates/lighthouse-v13-2-whats-new/) · [Declarative WebMCP form attributes](https://agentcat.com/guides/declarative-webmcp-tools-html-form-attributes/) · [WebMCP tutorial](https://www.ivanturkovic.com/2026/02/23/webmcp-tutorial-make-website-agent-ready/)
- [Analysis of the Awwwards Mobile Excellence nominees (Greenspector)](https://blog.greenspector.com/en/analysis_sites_nominated_mobile_excellence_awwwards/)
