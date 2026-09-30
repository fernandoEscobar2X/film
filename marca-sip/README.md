# Marca SIP

Archivos finales de **Sistemas Inteligentes del Pacífico**. Los SVG contienen curvas para el símbolo y las letras: escalan sin perder nitidez y no dependen de una fuente instalada. Los WebP se exportaron sin pérdida.

## Logos

| Archivo base en `logos/svg/` y `logos/webp/` | Uso |
| --- | --- |
| `sip-logo-color` | Logo completo sobre fondos claros; fondo transparente. |
| `sip-logo-sobre-oscuro` | Logo completo con letras blancas y “I” azul sobre fondos oscuros; fondo transparente. |
| `sip-logo-blanco` | Logo completo totalmente blanco; fondo transparente. |
| `sip-simbolo-color` | Símbolo SIP sin texto para encabezados, iconos grandes y piezas compactas; fondo transparente. |
| `sip-simbolo-blanco` | Símbolo SIP totalmente blanco; fondo transparente. |
| `sip-avatar` | Formato cuadrado con fondo marino para perfiles de redes sociales. |

Los WebP de logo completo miden **1952 × 930 px**, los de símbolo **1800 × 620 px** y el avatar **1024 × 1024 px**. Para web conviene usar SVG; para plataformas que no admiten SVG, usar WebP.

## Paleta

- [`paleta/muestrario.svg`](paleta/muestrario.svg): referencia visual.
- [`paleta/colores.css`](paleta/colores.css): variables listas para CSS.
- [`paleta/colores.json`](paleta/colores.json): nombres, valores HEX y uso sugerido.

Los tonos se midieron sobre zonas planas de los dos JPEG de referencia. Los JPEG tienen compresión y la lámina usa otros efectos, así que los valores son una **aproximación digital**, no una especificación original de marca.

El símbolo y la tipografía se reconstruyeron desde la imagen rasterizada. Antes de imprimir a gran formato o registrar la marca, conviene compararlos con el archivo vectorial maestro si existe.
