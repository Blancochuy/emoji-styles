# Revisión del proyecto: calidad de emojis y uso por agentes

Fecha: 22 de octubre de 2026. Revisión de arquitectura y producto, con análisis
de comportamiento concentrado en `packages/asset-pipeline/src` y lectura de
sus consumidores CLI/MCP. No es una auditoría exhaustiva de seguridad del repo,
ni una comparación experimental de modelos de imagen.

## Diagnóstico

La base de renderizado es reutilizable: Unicode como significado, providers de
artwork intercambiables, fallback explícito, temas semánticos y adaptadores React
y web. Mantendría esa separación. El paquete de assets también está bien
ubicado: recibe imágenes de cualquier origen y produce archivos y manifiestos.

El cuello de botella para generar mejores emojis está antes de normalizar:
`create_asset_spec` construye una especificación; la skill dirige la generación
externa; el pipeline normaliza y valida. Ninguno ejecuta un ciclo integrado de
generación de candidatos, comparación visual, edición de fallos y selección.
Cambiar el generador, por sí solo, no demuestra una mejora de calidad.

La normalización mejora encuadre y entrega, pero no reconstruye una silueta
confusa, elimina detalles semánticos sobrantes ni garantiza coherencia de estilo.
El campo `valid` actual es técnico. No debe interpretarse como aprobación visual.

## Evidencia y cambios realizados

| Hallazgo | Efecto observado | Acción |
| --- | --- | --- |
| El builder inspeccionaba archivos sin llamar al validador de colección | Una imagen RGB rectangular de 32×16 se empaquetaba aunque `validateEmojiAsset` marcaba `not-square`, `alpha` y `edge-contact` | El builder ahora rechaza errores técnicos, duplicados de contenido y dimensiones diferentes dentro del pack |
| Dos archivos podían escribir la misma clave emoji o token | El último sustituía silenciosamente al anterior | Rechazo explícito de mappings repetidos y de referencias a archivos inexistentes |
| Un mapping solo semántico podía omitir el asset del manifiesto | El tema apuntaba a un nombre de archivo sin un asset Unicode resoluble | Se exige fallback Unicode explícito o inferible del nombre de archivo |
| La hoja de contacto mostraba un único tamaño grande sobre oscuro | No facilitaba la revisión a tamaño real ni revelaba problemas sobre claro | Nuevo `contact-sheet --review`: 24/48/96 px en blanco y oscuro |
| Faltaba una guía raíz para agentes | Un agente debía descubrir límites de paquetes y comandos de verificación | Nuevo `AGENTS.md` |

Las protecciones del builder también se aplican al preview MCP
`generate_provider_manifest`, que llama a esa misma función. Los warnings de
safe area y centrado siguen siendo avisos; no se bloquean estilos válidos por
una heurística. `provider create`, el comando anterior para assets existentes,
mantiene un contrato distinto y no adquiere estas garantías.

La revisión visual de los cinco ejemplos existentes mostró que el dragón pierde
detalle reconocible y contraste a 24 px sobre oscuro. Cara y cohete conservan
mejor lectura. Es una observación cualitativa, no una puntuación universal. Los
ejemplos pertenecen a estilos independientes: no deben juzgarse como un solo pack.

## Mejora contundente recomendada

Crear un flujo de producción de packs que un agente pueda ejecutar y retomar:

```text
brief + style contract + referencia aprobada
  → candidatos por token
  → normalización y validación técnica
  → revisión visual a tamaños reales
  → selección o edición localizada
  → pack validado + evidencia por asset
```

El contrato de estilo debe conservar el lenguaje libre del usuario y fijar
cámara, paleta, materiales, luz, grosor mínimo de formas y densidad de detalle.
Usar una referencia visual aprobada cuando el motor la soporte. Generar, por
ejemplo, tres candidatos del ancla y comparar antes de expandir el pack; después
regenerar solo los tokens que fallen. El número de variantes es una política
configurable con presupuesto explícito, no un gasto oculto.

### 1. Evaluación de calidad antes de elegir motores

Preparar un benchmark pequeño: unos 20 sujetos, tres direcciones originales,
tamaños de 24/32/48 px y fondos claro/oscuro. Incluir caras, objetos pequeños,
símbolos, sujetos complejos y formas oscuras. Conservar prompts, referencias,
outputs originales, hashes, parámetros y resultados.

Evaluar por separado reconocimiento del significado, lectura de silueta,
coherencia con el ancla, contornos/halos, composición y fidelidad a la dirección.
Usar revisión visual estructurada con evidencia y posibilidad de incertidumbre;
una nota de un modelo de visión no sustituye una medición independiente.
Comparar variantes de forma ciega, con más de un evaluador cuando sea posible.

Criterios para aceptar un motor o cambio de prompting: preferencia frente al
baseline en el mismo conjunto, fallos técnicos, intentos por asset aprobado,
costo y latencia. La mejora debe aparecer a tamaño de interfaz, no solamente
en una imagen de 1024 px. Definir umbrales después de medir el baseline.

### 2. Backends de generación intercambiables

Añadir una capa de generación separada del `EmojiAssetProvider`. Un contrato
inicial debería expresar:

| Área | Contrato propuesto |
| --- | --- |
| Capacidades | Generación, edición, referencias, alpha real, tamaños admitidos y seed si existe |
| Solicitud | Subject/token, contrato de estilo, referencias autorizadas, resolución, variantes y límite de gasto |
| Resultado | Bytes locales o resultado importable, formato, provider/model reales, parámetros efectivos e ID del job |
| Ejecución | Cancelación, timeout, errores recuperables, backoff acotado y estado persistente |
| Procedencia | Hashes de fuente/ancla/output, relación entre candidato y edición; costo/seed solo si están disponibles |

Empezar con un adapter falso para probar contratos y un adapter de importación
local; después implementar un servicio remoto y un motor local opcional. Fallar
explícitamente cuando una capacidad requerida no exista. No simular transparencia
con un tablero generado ni prometer seeds reproducibles si el motor no los ofrece.
La eliminación de fondo, cuando se necesite, debe ser una etapa registrada y
validada, con atención especial a halos y materiales translúcidos.

Hay bases técnicas para dos rutas: una API remota con generación/edición como
[Gemini](https://ai.google.dev/gemini-api/docs/image-generation), y ejecución
de modelos mediante [Diffusers](https://huggingface.co/docs/diffusers/en/using-diffusers/loading).
Son candidatos para adapters, no ganadores de calidad. Modelo, licencia, hardware,
capacidades y costo se deben verificar para cada integración concreta.

### 3. Experiencia de agentes

- Versionar `asset-spec` y añadir JSON Schema compartido por CLI, MCP y skill.
  Hoy el template, el tipo MCP y las instrucciones viven separados.
- Ofrecer planificación de generación sin gasto, ejecución explícita y jobs
  reanudables. Mantener las herramientas MCP actuales de lectura como tales;
  las futuras operaciones con gasto o escritura deben declarar sus efectos.
- Entregar códigos de error y correcciones sugeridas por asset, además de
  evidencias visuales que un agente con visión pueda inspeccionar.
- Conectar los temas generados al contrato real `defineEmojiTheme`: se ha
  corregido `renderThemeModule` para devolver un tema validado, conservar las
  etiquetas accesibles y usar el provider generado como predeterminado. Los
  consumidores del antiguo mapa token→string deben adoptar `emojiTheme.tokens`.

### 4. Distribución open source

El código está abierto, pero CLI, MCP y asset-pipeline siguen con `private: true`
y fuera de los cinco paquetes del release checker. Eso dificulta que un agente
externo use justo la parte de creación sin clonar y compilar el monorepo. No es
evidencia de que una versión esté o no publicada actualmente en el registry.

Antes de publicarlos: preparar tarballs con dependencias resueltas, verificar
instalación desde un consumidor limpio, arranque MCP STDIO, binarios CLI y
dependencias nativas de Sharp en los sistemas soportados. Añadir `CONTRIBUTING.md`,
plantillas de propuestas para adapters y una tabla de capacidades. Mantener la
distinción entre licencia del código, pesos del modelo y derechos de outputs.

## Orden de ejecución sugerido

1. **Ya realizado:** cerrar el gate de empaquetado, prevenir pérdida de mappings
   y facilitar inspección visual a escala real.
2. **Implementado en esta branch:** benchmark reproducible, esquema compartido de specs y
   contrato de backend con fixtures locales. Resultado verificable sin API keys.
3. **Después:** un adapter remoto, selección de candidatos y edición con referencia;
   aceptar la integración cuando mejore el benchmark frente al baseline.
4. **Distribución:** publicar el flujo CLI/MCP con pruebas de instalación; admitir
   adapters externos sin dependencias pesadas en el renderer.

En la primera entrega no se generaron assets nuevos ni se publicaron paquetes.

## Verificación de la primera entrega

- `pnpm test`: 180 pruebas aprobadas en el monorepo (cuatro pruebas nuevas).
- `pnpm --filter @emoji-styles/asset-pipeline test`: ocho pruebas aprobadas tras
  el ajuste final de compatibilidad con el target ES2020.
- `pnpm typecheck`: aprobado.
- `pnpm build`: aprobado; Vite conserva el aviso por el chunk de la demo de
  aproximadamente 1.58 MB minificado (210 KB gzip). Separar el explorador y sus
  datos del flujo de creación es una mejora de carga posterior.
- Revisión visual del PNG producido por `--review` con los cinco ejemplos.

No se verificaron publicación npm, instalación externa ni calidad de modelos
remotos. Las comprobaciones se ejecutaron localmente con Node 24.4.1; CI usa
Node 20 para el job principal.

## Implementación posterior a la revisión

En la branch `codex/emoji-generation-quality` se añadieron el esquema v1 y su
validador compartido, planificación determinista sin gasto, dos herramientas
MCP de lectura, un contrato TypeScript para futuros backends y un protocolo de
revisión/corrección de la skill. No hay un executor remoto incluido: la skill
ejecuta los prompts con las capacidades disponibles en el entorno del agente.

El [benchmark](../benchmarks/emoji-quality/README.md) conserva fuentes y resultados.
En 13 casos técnicos idénticos, las decisiones esperadas pasan de 3 a 13, con
10 packs inválidos aceptados antes y ninguno después; ambos admiten los dos
controles válidos. Es evidencia de los casos ejercitados, no de una mejora visual
porcentual. El piloto visual conserva cuatro generaciones A/B y una corrección
posterior separada. Se observaron formas más simples en el cohete; el dragón
sigue necesitando revisión a 24 px sobre oscuro, incluso tras la corrección.

Las cinco generaciones nativas de `image_gen` entregaron transparencia real:
píxeles con alfa 0 y cuatro esquinas transparentes. Se preservó el alpha sin
chroma key ni otra eliminación de fondo. La skill prefiere esa ruta y el
inspector expone `transparentPixelRatio` y `cornerAlpha` para verificarla.

El benchmark técnico se ejecuta también en CI. Quedan para futuras entregas el
estudio visual amplio con evaluadores independientes, adapters remotos/locales
ejecutables y publicación externa de CLI/MCP.

Verificación de la branch: `pnpm test` (187 pruebas), `pnpm typecheck`,
`pnpm build`, ambos comandos de benchmark y el validador oficial de la skill
aprobados. Se probó también el wrapper Python del planificador contra el spec
del benchmark. El aviso de tamaño del chunk de la demo continúa presente.
