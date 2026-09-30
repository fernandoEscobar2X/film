# Prompts para assets falsos (imágenes)

Imágenes de marcador para desarrollar el sitio. Se reemplazan por fotografía real antes de publicar. Los videos se definen aparte.

## Cómo usar este documento

1. **Guarda los originales** en `media-src/` (carpeta fuera de git), con el nombre exacto de cada tabla. Yo genero las versiones optimizadas (AVIF/WebP, varios tamaños) para `public/media/`.
2. **Usa el mismo modelo** para todas las imágenes. Pega siempre el **bloque de estilo** al final de cada prompt y aplica el **negativo** (o agrégalo como "evitar: …" si tu herramienta no tiene campo negativo).
3. **Horizontal y vertical son composiciones distintas, no recortes.** Genera cada una con su proporción y su nota de composición.
4. **Consistencia de estilo:** cuando tengas la primera imagen que te guste, úsala como referencia de estilo o semilla para el resto, si tu herramienta lo permite.
5. **Revisión antes de entregar.** Descarta o retoca si aparece:
   - texto o letreros legibles, o logos;
   - manos deformes o máquinas duplicadas;
   - aspecto plástico, de render o HDR exagerado.

## Bloque de estilo (va al final de TODOS los prompts)

```
Documentary industrial photography, full-frame camera, 35mm lens, natural and practical light only, realistic textures, subtle film grain. Color grade: deep navy-blue shadows, cool steel-blue midtones, a few warm sodium or tungsten practical lights, restrained contrast, no HDR look. Setting: Baja California, northern Mexico. Candid, unposed, real working environment, slightly imperfect and lived-in. No text, no readable signs, no logos, no watermarks. No holograms, no floating UI or data overlays, no glowing lines, no sci-fi elements. People, if present, are small in frame, anonymous, wearing proper PPE, faces turned away or not visible.
```

## Negativo

```
text, letters, numbers, signage, logos, brand names, watermark, hologram, HUD, futuristic interface, floating data, glowing lines, neon, heavy lens flare, HDR, oversaturated, plastic look, CGI, 3D render, illustration, cartoon, perfectly symmetrical composition, posed stock-photo people, smiling at camera, deformed hands, extra fingers, duplicated machines, blurry, low resolution
```

## Medidas

| Clave | Proporción | Resolución mínima |
| --- | --- | --- |
| `h` | 16:9 horizontal | 2560 × 1440 (mínimo 1920 × 1080) |
| `v` (hero, "I que se abre", Nosotros) | 9:16 vertical | 1440 × 2560 (mínimo 1080 × 1920) |
| `v` (industrias) | 3:4 vertical | 1536 × 2048 |

---

## Fase 1: Hero (5 escenas × día y noche × horizontal y vertical = 20 imágenes)

El hero cambia entre día y noche según la hora local del visitante. Las **dos versiones de una misma escena deben ser el mismo lugar con el mismo encuadre**: genera primero una y usa la otra como referencia de imagen, cambiando solo la luz.

**Composición común**
- **Horizontal:** sujeto principal en la mitad derecha; el tercio inferior izquierdo más calmo y oscuro (ahí va el titular).
- **Vertical:** sujeto en la mitad superior; el 40 % inferior más calmo y oscuro.
- Cámara a la altura de los ojos o ligeramente elevada, con profundidad (líneas que se van al fondo).

### 1. Manufactura: `hero-manufactura-{dia|noche}-{h|v}.png`

```
A long electronics assembly line inside a modern maquiladora plant in Tijuana, the conveyor running deep into the frame, test stations and automated pick-and-place machines along it, polished grey epoxy floor with painted yellow safety lanes, overhead LED high-bay lights in rhythmic rows, a few operators in blue ESD smocks working far in the background, a couple of machine stack lights softly lit green.
```
- **Noche:** `Night shift: the plant lit only by the overhead lights, tall windows showing a dark blue night outside, quiet and focused atmosphere.`
- **Día:** `Day shift: soft daylight entering from high clerestory windows mixing with the overhead lights, light dust in the air.`

### 2. Logística: `hero-logistica-{dia|noche}-{h|v}.png`

```
The container terminal of the Port of Ensenada on the Pacific coast of Baja California: ship-to-shore gantry cranes loading a container vessel, long stacks of weathered shipping containers in muted colors, a straddle carrier moving between rows, the ocean and coastal hills in the background.
```
- **Noche:** `Blue hour turning into night: terminal floodlights on, wet asphalt reflecting the lights, crane silhouettes against a deep blue sky.`
- **Día:** `Early morning: low sun, light marine haze over the water, long soft shadows between container rows.`

### 3. Construcción: `hero-construccion-{dia|noche}-{h|v}.png`

```
A large construction site of a concrete industrial building on the hills of Tijuana: a tower crane lifting a steel beam, exposed rebar and wooden formwork, a concrete pump truck with its boom extended, workers in hard hats and hi-vis vests small in the frame, the city sprawling on the hills behind.
```
- **Noche:** `Night pour: tall floodlight towers lighting the site, the city lights of Tijuana glittering on the hills, deep blue sky.`
- **Día:** `Morning: soft haze over the Tijuana hills, warm low sunlight on the concrete, clear blue sky.`

### 4. Agroindustria: `hero-agroindustria-{dia|noche}-{h|v}.png`

```
Rows of large high tunnels (plastic macro-tunnels) for berries in the San Quintín valley, Baja California, stretching to the horizon, drip irrigation lines along the beds, a few small soil-moisture sensor stakes with tiny solar panels between rows, coastal hills and the Pacific marine layer in the distance.
```
- **Noche:** `Blue hour before dawn: harvest crew work lights glowing inside a few tunnels, the rest in cool darkness, mist low over the fields.`
- **Día:** `Morning after the marine fog lifts: diffused bright light through the translucent plastic, fresh green foliage, wet soil.`

### 5. Energía: `hero-energia-{dia|noche}-{h|v}.png`

```
A wind farm on the rocky high desert of La Rumorosa, Baja California: large boulders and desert scrub in the foreground, one wind turbine dominant in the frame with others receding along the ridge, a small electrical substation with transformers and steel lattice structures near its base.
```
- **Noche:** `Blue hour: deep blue sky, red aviation lights blinking on top of the turbines, a few warm lights at the substation.`
- **Día:** `Clear morning: crisp light, long shadows from the boulders, turbines slightly turning.`

---

## Fase 1: "La I que se abre" (2 imágenes)

La I del logo se abre dentro de un titular hasta llenar la pantalla con esta imagen. Tiene que funcionar a pantalla completa y leerse bien también cuando todavía es una rendija angosta, así que conviene una imagen con un eje central fuerte.

### `i-reveal-{h|v}.png`

```
Elevated wide view from a mezzanine over a vast manufacturing floor at night, multiple parallel production lines receding toward a vanishing point, orderly rhythm of machines, conveyors and pools of overhead light, a strong central axis down the middle of the frame, calm and monumental.
```

---

## Fase 2: Industrias (7 industrias × horizontal y vertical 3:4 = 14 imágenes)

Aquí la foto es de **detalle**: la cosa que SIP mide en esa industria, no la vista general (esa ya está en el hero). Sujeto principal nítido, fondo con poca profundidad de campo.

| Archivo | Prompt |
| --- | --- |
| `industria-manufactura-{h\|v}.png` | `Close-up of a small industrial vibration and temperature sensor mounted with a cable gland on the housing of a large electric motor, oil-stained metal, the production machine softly out of focus behind.` |
| `industria-logistica-{h\|v}.png` | `A loading dock door with a semi-trailer backed in, a forklift carrying a stretch-wrapped pallet crossing the dock plate, dock light and rubber seal details, the warehouse softly out of focus.` |
| `industria-construccion-{h\|v}.png` | `A surveying total station on a tripod at the edge of a concrete slab on a construction site at dawn, rebar and formwork out of focus behind, a hard hat resting on a stack of materials.` |
| `industria-agroindustria-{h\|v}.png` | `A soil-moisture sensor stake with a tiny solar panel standing among strawberry beds under a plastic high tunnel, drip irrigation line in the foreground, diffused light.` |
| `industria-energia-{h\|v}.png` | `Rows of solar panels in the Mexicali desert with a small weather station and pyranometer on a pole in the foreground, heat haze, distant mountains.` |
| `industria-retail-{h\|v}.png` | `The backroom of a retail store: tall metal shelving with unbranded boxes, a handheld barcode scanner resting on a cardboard box, a rolling cart in the aisle, fluorescent light.` |
| `industria-corporativo-{h\|v}.png` | `A calm operations room at dusk: a large wall of dark, switched-off displays, clean desks with empty chairs, window with a city skyline at blue hour.` |

---

## Fase 3: Casos (3 imágenes horizontales)

Las pantallas deben salir **negras o azul muy oscuro, sin contenido**: encima compongo la interfaz real diseñada en código. Pantalla de frente o con poco ángulo.

| Archivo | Prompt |
| --- | --- |
| `caso-tablero-produccion-h.png` | `A large wall-mounted monitor above an assembly line, the screen completely dark and blank, facing the camera at a slight angle, operators working at the line below, overhead industrial lights.` |
| `caso-andon-h.png` | `A row of andon tower stack lights above workstations along an assembly line, most lit green and one lit amber, operators slightly out of focus below, shallow depth of field.` |
| `caso-apps-h.png` | `A field supervisor in a hi-vis vest and work gloves holding a rugged tablet with a completely dark blank screen, standing in a warehouse aisle, face out of frame, shallow depth of field.` |

(En `caso-apps` revisa bien las manos.)

---

## Fase 3: Nosotros (3 imágenes)

**Sin retratos de personas falsas:** presentarlas como si fueran el equipo sería engañoso. El equipo real se fotografía después. Aquí va el contexto: Tijuana y el Pacífico.

| Archivo | Prompt |
| --- | --- |
| `nosotros-pacifico-{h\|v}.png` | `The coastline of Playas de Tijuana at blue hour, the Pacific Ocean with gentle waves, the pier in the distance, the first city lights on the hills, calm and wide.` |
| `nosotros-tijuana-h.png` | `Aerial view of the Otay Mesa industrial parks in Tijuana at dawn, long rows of large manufacturing buildings and truck yards, soft golden light, light haze toward the hills.` |

---

## Resumen de entrega

| Fase | Imágenes | Carpeta |
| --- | --- | --- |
| Fase 1 | 20 (hero) + 2 (I que se abre) = **22** | `media-src/` |
| Fase 2 | 14 (industrias) | `media-src/` |
| Fase 3 | 3 (casos) + 3 (nosotros) = 6 | `media-src/` |

Si hay que priorizar dentro de la Fase 1: primero `hero-manufactura-*` (las 4 versiones) e `i-reveal-*`. Con eso ya se desarrolla todo el hero; las otras industrias se suman como slides.
