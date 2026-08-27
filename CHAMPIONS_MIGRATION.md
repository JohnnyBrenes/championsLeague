# De "Mundial 2026" a "Champions League 2026/27"

Plan de migración del portal. Este repo es un fork del calendario del Mundial 2026;
el objetivo es reusar el 70 % (PWA, i18n, sync automático por GitHub Actions,
componentes de partido) y reescribir el 30 % que modela un Mundial.

**Decisiones ya tomadas** (2026-08-27):

| Tema | Decisión |
|---|---|
| Hosting | **Vercel (Hobby)** → §8. *Corregido 2026-08-27: el plan Hobby permite **200 proyectos**, no 2 — la premisa inicial de que estaba lleno era falsa. Se mantiene el export estático para no quedar atados a Vercel* |
| Datos | **football-data.org**, competición `CL`, mismo token → §5 |
| Escudos | **Crests de la API**, descargados a `/public/crests` → §4.3 |
| Horario | **Hora local del navegador por defecto**, toggle a hora de estadio (CET) |
| Idiomas | Se mantiene ES/EN |
| Apariencia | Rediseño "noche europea" propio, sin marcas de la UEFA → §6 |
| Quiniela | **No se porta** — `quiniela.md` queda archivado |
| Docs del Mundial | Archivados en `docs/legacy/` (hecho) |

---

## 1. Por qué esto no es un "buscar y reemplazar"

La Champions dejó de tener grupos en 2024/25. El formato liga cambia la estructura
de datos, no solo los nombres:

| | Mundial 2026 (hoy) | Champions 2026/27 (objetivo) |
|---|---|---|
| Participantes | 48 selecciones | 36 clubes |
| Fase inicial | 12 grupos de 4 (A–L), 3 partidos | **Tabla única**, 8 partidos por club (4 local / 4 visitante), rivales distintos |
| Clasificación | 1.º y 2.º + 8 mejores terceros | 1.º–8.º → directo a octavos · 9.º–24.º → **playoff** · 25.º–36.º eliminados |
| Eliminatorias | 5 rondas a partido único (R32→final) | **Ida y vuelta** en playoff, octavos, cuartos y semis · final a partido único |
| Desempate de eliminatoria | Prórroga + penales | **Global** de los dos partidos → prórroga → penales (sin gol de visitante desde 2021) |
| 3.er puesto | Sí | No existe |
| Identidad de equipo | Emoji de bandera 🇲🇽 | Escudo del club (imagen) + país como dato secundario |
| Sedes | 16 estadios fijos, `venues.json` | Estadio del club local (viene con el equipo) |

Consecuencia directa: **`data/third-place-combinations.json` (509 líneas) y toda la
lógica de "mejores terceros" en `lib/standings.ts` se borran**, y a cambio hay que
añadir agregados de dos partidos en `lib/bracket.ts`.

> ⚠️ Verificar antes de codificar el calendario: el sorteo de la fase liga 2026/27 es
> a finales de agosto de 2026, y las fechas de jornadas (MD1 septiembre 2026 → MD8
> finales de enero 2027) y la sede de la final deben confirmarse contra la API, no
> contra la memoria del modelo ni contra el calendario de la temporada anterior.

---

## 2. Modelo de datos objetivo

### `lib/types.ts` (reescritura)

```ts
export type Stage =
  | "league"   // fase liga, 8 jornadas
  | "po"       // playoff de eliminación (9.º–24.º), ida y vuelta
  | "r16"
  | "qf"
  | "sf"
  | "final";

export interface Team {
  /** id numérico de football-data — estable, a diferencia del "tla". */
  id: number;
  /** Código corto para URLs y labels, p.ej. "RMA". Derivado del tla + overrides. */
  code: string;
  en: string;              // "Real Madrid CF"
  es: string;              // "Real Madrid"
  short: string;           // para tarjetas estrechas
  /** Ruta local del escudo ya descargado, p.ej. "/crests/86.png". */
  crest: string;
  /** ISO-3166 alpha-2 del país, para la banderita secundaria. */
  country: string;
  venue?: string;          // estadio del club
}

export interface Match {
  id: string;              // "CL-<apiId>"
  apiId: number;
  stage: Stage;
  /** Jornada 1–8, solo en fase liga. */
  matchday?: number;
  /** Ida/vuelta en eliminatorias a doble partido. */
  leg?: 1 | 2;
  /** Id compartido por los dos partidos de la misma eliminatoria, p.ej. "PO-3". */
  tieId?: string;
  datetime: string;        // ISO UTC
  venue?: string;
  home: number | null;     // Team.id
  away: number | null;
  homeLabel?: string;      // "9.º", "W-PO1" mientras no esté definido
  awayLabel?: string;
  score: MatchScore;
  extraTime?: { home: number; away: number };
  penalties?: { home: number; away: number };
  winner?: "home" | "away" | null;
  status: MatchStatus;
}

/** Eliminatoria completa: dos partidos + global. Concepto nuevo, hoy no existe. */
export interface Tie {
  id: string;              // "PO-1", "R16-3", "SF-2"
  stage: Exclude<Stage, "league">;
  legs: [Match] | [Match, Match];   // la final tiene un solo partido
  aggregate?: { home: number; away: number };
  winner: number | null;   // Team.id
}
```

Se eliminan: `GroupId`, `Stage.group`, `Stage.r32`, `Stage.third`, `Match.group`,
`Team.flag` (pasa a derivarse de `country`).

### `data/` — qué pasa con cada archivo

| Archivo | Acción |
|---|---|
| `teams.json` | Regenerar: 36 clubes con `id`, `crest`, `country`, `venue` |
| `schedule.json` | Regenerar: 189 partidos (144 liga + 16 PO + 16 R16 + 8 QF + 4 SF + 1 final) |
| `bracket.json` | Regenerar: mapa `tieId → { seedHome, seedAway, feeders }` del cuadro |
| `scorers.json` | Se mantiene el formato; cambia la fuente (§5.3) |
| `scorer-overrides.json` | **Borrar** (parcheaba errores de worldcup26.ir) |
| `third-place-combinations.json` | **Borrar** |
| `venues.json` | **Borrar** (la sede viene con el club local) |
| — | Nuevo: `public/crests/<teamId>.png` |

---

## 3. Cambios archivo por archivo

### Reescritura completa

| Archivo | Qué hacer |
|---|---|
| `lib/types.ts` | Modelo de §2 |
| `lib/standings.ts` (321 L) | **Se simplifica mucho**: una sola tabla de 36. Fuera `clinchedSlots()` de grupos y todo el bloque de terceros. Añadir los cortes en 8.º y 24.º y los criterios de desempate UEFA: puntos → dif. de goles → goles a favor → goles como visitante → victorias → victorias de visitante → puntos disciplinarios → coeficiente de club |
| `lib/bracket.ts` (189 L) | Reagrupar partidos en `Tie`, calcular el global, y que `winnerOf` use global → prórroga → penales. El árbol (`treeOrder`) se conserva pero con 4 rondas + final, arrancando en el playoff |
| `scripts/sync-data.mjs` (593 L) | §5. Se borra ~40 % (todo worldcup26.ir: `fetchWorldcup`, `overlayScores`, `wcEpoch`, `NAME_FIXES`, `scorerKey`, overrides) |
| `data/*` | §2 |

### Cambios medianos

| Archivo | Qué hacer |
|---|---|
| `components/TeamBadge.tsx` | `<span>{flag}</span>` → `<img src={team.crest}>` (24 px, `loading="lazy"`, alt con el nombre). Fallback a monograma si falta el escudo |
| `components/GroupTable.tsx` | Pasa a ser `LeagueTable.tsx`: 36 filas, columna de posición, separadores tras la 8.ª y la 24.ª, leyenda "Octavos directo / Playoff / Eliminado" |
| `components/MatchCard.tsx` | Añadir chip "Ida"/"Vuelta" y el global cuando es la vuelta |
| `components/Bracket.tsx` (284 L) | Renderizar `Tie` (dos marcadores + global) en vez de un partido por celda |
| `app/groups/page.tsx` | Renombrar la ruta a `/table` |
| `app/teams/page.tsx` | Buscador de clubes; el widget de "posiciones del grupo" pasa a mostrar el tramo de la tabla alrededor del club |
| `app/bracket/page.tsx` | Añadir la ronda de playoff antes de octavos |
| `lib/time.ts` | Quitar `MEXICO_TZ` fijo → default = zona del navegador; constante nueva `STADIUM_TZ = "Europe/Madrid"` para el toggle |
| `lib/timezone.tsx` | `TzMode` pasa a `"local" \| "stadium"`, default `"local"`; clave de `localStorage` `wc2026-tz` → `ucl2627-tz` |
| `components/TimezoneToggle.tsx` | Etiquetas nuevas |
| `locales/{es,en}.json` | Ver §3.1 |

### Cambios pequeños / de higiene

- ✅ **Hecho**: `package.json` renombrado a `champions-league-2627`. Pendiente: borrar
  el script `gen:thirds` y `scripts/build-third-combinations.mjs` (va con la Fase 1,
  cuando desaparezca el JSON que genera).
- `app/layout.tsx` → metadata, `appleWebApp.title`, `themeColor` nuevo. `<Analytics />`
  se queda: seguimos en Vercel (§8).
- `app/manifest.ts` → nombre, descripción, colores.
- `public/sw.js` → `CACHE = "ucl2627-v1"` (fuerza limpiar el caché viejo en móviles que ya tengan la PWA instalada).
- `scripts/gen-icons.mjs` → regenerar iconos con la paleta nueva (§6).
- `components/Footer.tsx` + claves `footer.*` → fuente de datos nueva y descargo de no afiliación.
- `README.md` y `DEPLOY.md` → reescribir (DEPLOY pasa a Cloudflare, §7).
- ✅ **Hecho**: `WorldCup2026Plan.md`, `quiniela.md`, `docs/mockup.html` y
  `docs/show-and-tell.html` movidos a `docs/legacy/` (con su propio README). Son solo
  referencia histórica; no se editan. La quiniela **no se porta**.
- `.claude/launch.json` → renombrar el perfil `wc-dev` → `ucl-dev`.
- Remoto `upstream` → `git remote remove upstream` si ya no vas a traer cambios del
  repo del Mundial.

### 3.1 Claves de i18n

| Clave | ES nuevo | EN nuevo |
|---|---|---|
| `app.title` | Champions 2026/27 | Champions 2026/27 |
| `app.subtitle` | Calendario y Eliminatorias | Schedule & Knockouts |
| `app.hosts` | *(borrar — no hay anfitriones)* | — |
| `app.tagline` | 36 clubes · 189 partidos · sep 2026 – may 2027 | 36 clubs · 189 matches · Sep 2026 – May 2027 |
| `nav.groups` → `nav.table` | Tabla | Table |
| `nav.teams` | Equipos | Clubs |
| `stage.group` → `stage.league` | Fase liga | League phase |
| `stage.r32` → `stage.po` | Playoff | Play-off |
| `stage.third` | *(borrar)* | — |
| `standings.team` | Equipo | Club |

Claves nuevas: `leg.first` / `leg.second` / `common.aggregate` ("Global") /
`table.direct16` ("Clasifica a octavos") / `table.playoff` ("Playoff") /
`table.out` ("Eliminado") / `tz.stadium` ("Hora del estadio").

---

## 4. Detalles del formato que hay que codificar bien

### 4.1 Fase liga
- 36 clubes, una sola tabla, **8 partidos** por club contra 8 rivales distintos
  (dos de cada bombo, uno de local y otro de visitante). Nadie repite rival y no hay
  cruces entre clubes de la misma liga nacional.
- 144 partidos, 8 jornadas.
- Cortes: **1.º–8.º** octavos directo · **9.º–24.º** playoff · **25.º–36.º** fuera
  (desde 2024/25 ya no hay repesca a la Europa League).

### 4.2 Fase eliminatoria
- **Playoff**: 8 eliminatorias a ida y vuelta. Cabezas de serie 9.º–16.º, no cabezas
  17.º–24.º; el mejor clasificado juega la **vuelta en casa**.
- **Octavos**: los 8 clasificados directos contra los 8 ganadores del playoff; otra
  vez el mejor clasificado cierra en casa.
- El cuadro hasta la final **queda definido en el sorteo**, así que `bracket.json` se
  genera una vez y no cambia: es lo que permite mostrar "el camino a la final" desde
  el primer día.
- Cuartos y semis a doble partido; **final a partido único**.
- Ganador de eliminatoria: global → si empate, **prórroga** en el partido de vuelta →
  penales. **No hay gol de visitante** (abolido en 2021).

### 4.3 Escudos
La API entrega `team.crest` como URL (`crests.football-data.org`). Descargarlos en el
sync a `public/crests/<teamId>.png` (con `sharp`, que ya es dependencia, a 128 px) y
guardar la **ruta local** en `teams.json`. Motivos: la PWA funciona offline, el export
estático no depende de un host externo y evitas hotlinking. Son ~36 archivos de pocos KB.

---

## 5. Fuente de datos: football-data.org

### 5.1 Qué cambia en `sync-data.mjs`

1. `"/v4/competitions/WC/matches"` → **`"/v4/competitions/CL/matches"`**
   (temporada vigente por defecto, o `?season=2026`).
2. **Borrar todo el bloque worldcup26.ir** — era una fuente específica del Mundial:
   `fetchWorldcup`, `overlayScores`, `wcScore`, `wcEpoch`, `normCode`, `NAME_FIXES`,
   `scorerKey`, `addScorers`, `loadScorerOverrides`, `warnScorerGaps`,
   `buildTopScorers`. El script baja de ~590 a ~250 líneas.
3. `REF` (48 banderas + nombres en español) → tabla corta de **overrides de club**:
   solo los nombres que se traducen (`Bayern Munich` → `Bayern Múnich`, `Inter Milan`
   → `Inter de Milán`, `Napoli` → `Nápoles`, `FC Porto` → `Oporto`) y códigos cortos.
4. `STAGE_MAP` nuevo — **verificar los valores reales contra la respuesta**, porque el
   formato liga es reciente:
   ```
   LEAGUE_STAGE   → league   (podría venir como GROUP_STAGE por compatibilidad)
   PLAYOFFS       → po
   LAST_16        → r16
   QUARTER_FINALS → qf
   SEMI_FINALS    → sf
   FINAL          → final
   ```
5. Derivar `leg` y `tieId`: agrupar los partidos de eliminatoria por par de equipos
   dentro de la misma ronda y ordenar por fecha. Si la API no lo permite, usar
   `bracket.json` como referencia.
6. Añadir el paso de descarga de escudos (§4.3), idempotente: si el archivo existe y
   el `crest` no cambió, no se vuelve a bajar.
7. `withinMatchWindow()` se mantiene tal cual — sigue siendo válido y ahorra llamadas.

### 5.2 Verificación de la API — ✅ HECHA (2026-08-27)

Se sondearon `/competitions/CL`, `/matches`, `/standings`, `/scorers` y `/teams/{id}`
con el token del proyecto. **El riesgo número uno del plan queda descartado**: la API
modela el formato liga exactamente como necesitábamos.

**Confirmado:**

| Hallazgo | Resultado |
|---|---|
| CL en el tier gratuito | ✅ 189 partidos, temporada completa |
| Fases | `LEAGUE_STAGE` 144 · `PLAYOFFS` 16 · `LAST_16` 16 · `QUARTER_FINALS` 8 · `SEMI_FINALS` 4 · `FINAL` 1 |
| Equipos | 36, con `id`, `name`, `shortName`, `tla` y `crest` |
| Tabla | **Un solo bloque de 36 filas**, `type: TOTAL`, ya ordenada por posición |
| Goleadores | ✅ `/scorers` responde, y además trae asistencias |
| Ida/vuelta | **`matchday: 1` = ida, `2` = vuelta**. Verificado en los 22 cruces: 22/22 concuerda con el orden cronológico |
| Cruces | Agrupar por ronda + par de equipos da exactamente 2 partidos por cruce (1 en la final) |
| Sembrado | El local de la vuelta es el mejor clasificado en 8/8 playoffs y 8/8 octavos |

**Sorpresas que cambian el plan:**

1. 🔴 **La temporada 2026/27 todavía no existe en football-data.** `?season=2026`
   devuelve **404**; las disponibles son 2025, 2024, 2023 y 2022, y la "vigente" sigue
   siendo 2025/26 (terminó el 2026-05-30). **Consecuencia: se desarrolla contra
   2025/26**, que tiene estructura idéntica y datos reales de prórrogas, penales y
   globales — es un banco de pruebas mejor que una temporada vacía. El cambio a
   2026/27 será solo el parámetro de temporada.
2. ⚠️ **El `winner` de la API es por partido, no por eliminatoria.** Caso real:
   Galatasaray 5-2 Juventus (ida) y Juventus 3-2 Galatasaray (vuelta, con prórroga);
   la API marca `HOME_TEAM` en ambos. El global (7-5 para Galatasaray) lo calculamos
   nosotros. Además `fullTime` **incluye** la prórroga y los penales, mientras que
   `regularTime` es el marcador de los 90 minutos: la descomposición que ya hace
   `shootout()` en `sync-data.mjs` sigue siendo válida y se reutiliza.
3. ⚠️ **`venue` viene vacío en los 189 partidos**, pero `/teams/{id}` sí trae `venue`,
   `address`, `clubColors` y `area` (país + bandera). Son 36 llamadas extra a 10/min
   (~4 min), que de paso nos dan los **colores de club** para el diseño y el escudo.
4. ℹ️ El bloque de standings reporta `stage: "GROUP_STAGE"` y `group: "League phase"`
   por compatibilidad, aunque los partidos usan `LEAGUE_STAGE`. No confiar en `stage`
   de standings para detectar el formato.
5. ℹ️ La final no tiene `matchday` (viene `null`), coherente con ser partido único.

**Consecuencia para `lib/standings.ts`**: la fila de la tabla trae `position`,
`playedGames`, `won/draw/lost`, `points`, `goalsFor/Against/Difference`, pero **no**
goles como visitante ni coeficiente de club. Los desempates finos son incalculables
localmente → **usamos el `position` que devuelve la API como orden de verdad** y
calculamos en cliente solo lo incremental.

**Comandos usados** (por si hay que repetirlos cuando salga 2026/27):

```bash
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"   "https://api.football-data.org/v4/competitions/CL/matches?season=2026" | head -c 400
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"   "https://api.football-data.org/v4/competitions/CL/standings" | head -c 400
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN"   "https://api.football-data.org/v4/competitions/CL/scorers?limit=5" | head -c 400
```


### 5.3 Goleadores
Si `/competitions/CL/scorers` está disponible, sustituye por completo el parseo de
cadenas de worldcup26.ir (frágil: transliteraciones del persa, `NAME_FIXES`, overrides
manuales). Salida en el mismo `data/scorers.json` (`{ name, goals, team }`), con `team`
pasando de código de país a `Team.id`.

### 5.4 Límites y ritmo
- Tier gratuito: **10 peticiones/minuto** y marcadores en vivo con retraso (no es
  minuto a minuto). El workflow actual encaja de sobra: 2–3 llamadas por ejecución.
- ✅ **Hecho**: `.github/workflows/update-results.yml` ya limita el sondeo a las noches
  de partido y se llama "Update Champions League results":
  ```yaml
  - cron: "5 16-23 * * 2,3"   # martes y miércoles
  - cron: "5 16-23 * * 6"     # sábado — la final
  - cron: "7 12 * * *"        # sync completo diario
  ```
  Un solo rango de 16:00–23:59 UTC cubre los dos horarios todo el año: en CEST
  (sep–oct y mayo) las 18:45 locales son 16:45 UTC, y en CET (nov–feb) las 21:00
  locales son 20:00 UTC, con margen para prórroga y penales. **No hace falta ventana
  de madrugada**: UTC va *por detrás* de Europa central, así que un partido europeo
  de noche nunca cruza al día UTC siguiente (con el Mundial sí pasaba, porque los
  horarios eran de México, y por eso existía el cron `0-6`).
- El cron no puede leer `data/schedule.json`; restringir por día de la semana es la
  única palanca real de "solo días de partido". El guard `withinMatchWindow()` se
  encarga del resto: un martes sin fixtures es un no-op de segundos.
- **Ojo con la palabra "noche"**: son noches *europeas*. En América son mañana y
  primera tarde, y por eso la app debe abrir en **hora local del navegador** (§3) —
  mostrar "21:00" a alguien que va a ver el partido a la 1 p.m. es desorientador.

  | Kickoff europeo | UTC | Costa Rica (UTC−6) |
  |---|---|---|
  | 18:45 CEST (sep–oct, mayo) | 16:45 | 10:45 |
  | 21:00 CEST | 19:00 | 13:00 |
  | 18:45 CET (nov–feb) | 17:45 | 11:45 |
  | 21:00 CET | 20:00 | 14:00 |

  Consecuencia para el UI: la etiqueta del toggle debe ser **"Hora del estadio"**, no
  "hora de Europa" ni nada que implique noche. Y para husos al este de Europa (Asia,
  Oceanía) el partido sí cae de madrugada del día siguiente, así que el agrupado por
  día de `lib/time.ts` tiene que usar siempre la zona activa, nunca UTC.
- ⚠️ GitHub **desactiva los workflows programados tras 60 días sin actividad en el
  repo**. Durante la temporada no pasa (el bot commitea seguido), pero en el parón de
  verano se apagará solo y hay que reactivarlo antes del arranque de la siguiente.

---

## 6. Rediseño visual: "noche europea"

Hoy la paleta es verde césped (`--color-pitch: #0a7d52`) con emoji de bandera: lee a
Mundial de verano. La Champions se juega de noche, bajo reflectores, en invierno. El
rediseño va por ahí — **sin copiar ni imitar la identidad oficial de la UEFA**.

### 6.1 Reglas de marca (no negociables)

| ❌ No usar | ✅ Sí se puede |
|---|---|
| El balón de estrellas ("starball") ni ninguna variación reconocible | Un motivo de estrellas **propio**, geométrico y distinto |
| El logotipo, el wordmark estilizado ni el himno | El nombre **descriptivo** en texto plano: "Calendario Champions 2026/27" |
| La tipografía oficial de la competición | Fuentes libres (Geist ya está; alternativas: Inter, Archivo, Bebas Neue para titulares) |
| Sugerir patrocinio, afiliación o carácter oficial | Descargo visible: "Sitio no oficial. No afiliado ni respaldado por la UEFA." |
| Imágenes de prensa, fotos de jugadores, streaming | Escudos de club en contexto informativo, a tamaño pequeño |

Extra: evitar "UEFA" en el nombre de la PWA y en el dominio. Usar la competición como
**referencia nominativa** (decir a qué torneo pertenecen los datos) es legítimo;
imitar su imagen no lo es. Mantener el footer con la fuente de datos y el descargo.

### 6.2 Paleta (`app/globals.css`, tokens `@theme`)

```css
@theme {
  /* Azul noche — reemplaza al verde césped */
  --color-night:      #060b26;  /* fondo base */
  --color-night-soft: #0d1640;  /* superficies elevadas */
  --color-royal:      #1a2f8f;  /* acento primario */
  --color-electric:   #3b6bf0;  /* enlaces, foco, estado activo */

  /* Dorado (se conserva del tema actual) */
  --color-gold:       #f4c430;
  --color-gold-dark:  #c99a13;

  --color-ink:        #eef2ff;  /* texto sobre oscuro */
  --color-muted:      #94a3c4;
  --color-surface:    #101a3d;
  --color-canvas:     #060b26;
  --color-line:       #23306b;
  --color-live:       #ff4d5e;
}
```

Tema **oscuro por defecto** (invierte el actual, que es claro). Si quieres conservar
el modo claro, dejar los dos y decidir con `prefers-color-scheme` + toggle.

### 6.3 Elementos de diseño

- **Header**: gradiente `--color-night` → `--color-royal` en diagonal, con un halo
  radial suave arriba a la derecha que imite la luz de un reflector, y una franja
  dorada de 2 px al pie del nav. El ⚽ del logo actual se sustituye por una **estrella
  de cinco puntas propia en SVG** (no el balón de estrellas).
- **Fondo de página**: patrón sutilísimo (opacidad ~0.04) de estrellas pequeñas en SVG
  inline, generado por nosotros, con `background-attachment: fixed`.
- **Tarjetas de partido**: superficie `--color-surface`, borde `--color-line`, esquinas
  de 12 px, y **borde izquierdo dorado de 3 px** en el partido en vivo (hoy es rojo
  pulsante; se conserva el pulso pero en `--color-live` sobre oscuro).
- **Tabla de liga**: las tres zonas se marcan con una barra de color a la izquierda de
  la fila — dorado (1–8), azul eléctrico (9–24), gris apagado (25–36) — más una línea
  divisoria más gruesa tras la fila 8 y la 24. Nunca solo por color: cada zona lleva
  también su etiqueta en la leyenda (accesibilidad).
- **Escudos**: 24 px en listas, 40 px en la ficha del club, siempre sobre un círculo
  claro (`bg-white/90`) para que los escudos oscuros no se pierdan en el fondo noche.
- **Eliminatorias**: conectores en `--color-line` con el camino del ganador resaltado
  en dorado; el marcador global en una píldora dorada sobre la celda de la vuelta.
- **Tipografía**: Geist se mantiene para el cuerpo; titulares en peso 800 con
  `tracking-tight` y versalitas para las etiquetas de ronda ("FASE LIGA · J3").
- **Iconos PWA**: regenerar con `scripts/gen-icons.mjs` sobre el gradiente noche +
  la estrella propia; `theme_color` y `background_color` a `#060b26`.

### 6.4 Orden sugerido
El rediseño va en la Fase 4 (§7 del plan de trabajo) **después** de que la lógica esté
en pie: cambiar tokens de Tailwind es barato y no conviene mezclarlo con el cambio de
modelo de datos en el mismo commit.

---

## 7. Plan de trabajo por fases

Cada fase deja el repo compilando (`npm run build`) y desplegable.

- **Fase 0 — Preparación** *(sin riesgo)* — **casi completa**
  - ✅ Documentos del Mundial archivados en `docs/legacy/`
  - ✅ Historial de git reiniciado (1 commit); el original vive en el repo padre
  - ✅ Crons limitados a días de partido (§5.4)
  - ✅ `package.json` renombrado y `@vercel/analytics` fuera
  - ✅ `output: "export"` + `images.unoptimized` + `trailingSlash`; `manifest.ts`
    marcado como `force-static`. **Build y lint verdes**: 8 rutas prerenderizadas,
    `out/` con 95 archivos y 1.6 MB
  - ✅ `next` 16.2.7 → 16.3.3 y `sharp` → 0.35.4 → `npm audit` en 0 vulnerabilidades
  - ✅ **Verificaciones de §5.2** — la API modela el formato liga como necesitábamos;
    el riesgo número uno del plan queda descartado
  - ⬜ **Importar el proyecto en Vercel** (`DEPLOY.md`) — lo hace el usuario

- **Fase 1 — Datos y sync**
  `lib/types.ts` + `scripts/sync-data.mjs` + descarga de escudos. Ejecutar `npm run sync`
  y comprobar `teams.json` (36) y `schedule.json` (189). Aquí el árbol queda roto
  temporalmente; por eso las fases 1 y 2 van en la misma rama.

  **Se desarrolla contra la temporada 2025/26**, porque 2026/27 aún no existe en la
  API (§5.2). No es un parche: es una temporada completa con prórrogas, penales y
  globales reales, o sea el mejor banco de pruebas posible para la lógica de `Tie`.
  Cuando football-data publique 2026/27 hay que volver a correr `npm run sync` y
  revisar dos cosas que hoy no podemos observar: **cómo representa la API las
  eliminatorias antes del sorteo** (¿partidos con equipos en `null`, o directamente
  ausentes?) y si el calendario de jornadas cambia de días.

- **Fase 2 — Lógica**
  `lib/standings.ts` (tabla única) y `lib/bracket.ts` (doble partido). Conviene añadir
  un par de pruebas del cálculo del global y de los desempates.

- **Fase 3 — UI funcional**
  `TeamBadge` con escudos · `LeagueTable` · `MatchCard` con ida/vuelta/global ·
  `Bracket` con playoff · rutas y navegación · i18n completo ES/EN.

- **Fase 4 — Identidad visual** (§6)
  Paleta, header, patrón de estrellas, iconos PWA, manifest, `sw.js`, metadata, README.

- **Fase 5 — Automatización**
  Crons del workflow, secreto `FOOTBALL_DATA_TOKEN` en el repo, y el deploy hook de
  Cloudflare si se usa despliegue directo (§8.3).

- **Fase 6 — Extras opcionales**
  Vista "camino a la final" por club · notificaciones push · comparador de dos clubes
  en la tabla. *(La quiniela queda descartada por decisión de producto.)*

---

## 8. Deploy: Vercel (Hobby)

> **Corrección (2026-08-27).** Este plan nació asumiendo que el plan Hobby de Vercel
> estaba lleno con 2 proyectos. Es falso: la tabla oficial de límites de Vercel
> (<https://vercel.com/docs/limits>) da **200 proyectos** en Hobby. Se descarta la
> mudanza a Cloudflare Pages y el sitio se queda en Vercel. El trabajo hecho no se
> pierde: el **export estático se mantiene**, así que mudarse sigue siendo trivial.

### 8.1 Límites reales del plan Hobby

| Límite | Hobby | ¿Nos afecta? |
|---|---|---|
| Proyectos | **200** | No |
| Deployments por día | 100 | No: ~2 noches de partido por semana |
| Build time por deployment | 45 min | No (el build tarda ~15 s) |
| Deployments concurrentes | 1 | No |
| Subida de archivos estáticos | 100 MB | No (`out/` pesa 1.6 MB) |

Dos restricciones reales de Hobby que sí conviene tener presentes:
- **Uso no comercial únicamente.**
- **No se pueden conectar repos que pertenezcan a una organización de GitHub**, solo
  repos personales. `JohnnyBrenes/championsLeague` es personal, así que no aplica.

### 8.2 Por qué seguimos con `output: "export"`

Vercel podría servir SSR, pero no hay nada que renderizar por petición: todas las
páginas salen de los `data/*.json` commiteados. Mantener el export:

- deja el sitio **portátil** — el mismo `out/` sirve en Cloudflare Pages, Netlify o
  GitHub Pages sin tocar código (§8.4);
- **rompe el build a propósito** si alguien mete una función de servidor por error.

Configuración vigente en `next.config.ts`:

```ts
output: "export",              // genera ./out en `npm run build`
images: { unoptimized: true }, // los escudos son PNG locales pequeños
trailingSlash: true,           // /schedule/ → /schedule/index.html
```

⚠️ **Trampa ya encontrada y resuelta**: Next trata `app/manifest.ts` como route
handler y el exportador **falla el build** con
`export const dynamic = "force-static" not configured on route "/manifest.webmanifest"`.
Se arregla con `export const dynamic = "force-static";` en ese archivo. No lo quites.

Lo demás que rompería el export: route handlers sin `force-static`, server actions,
`cookies()`, `headers()`, `revalidate`/ISR y la optimización de `next/image`.

### 8.3 Configuración en Vercel

Los pasos concretos están en `DEPLOY.md`. Lo esencial: importar el repo, **no** poner
variables de entorno (el token es solo de la GitHub Action) y desplegar. Cada push a
`main` redespliega; cada rama genera preview.

`@vercel/analytics` sigue en el proyecto (funciona con el export estático) y es la
**única** dependencia atada a Vercel; quitarla son dos líneas.

### 8.4 Si algún día hay que mudarse

| Opción | A favor | En contra |
|---|---|---|
| **Cloudflare Pages** | Ancho de banda y sitios ilimitados, 500 builds/mes | Hay que quitar `@vercel/analytics`; build output `out` |
| **GitHub Pages** | Cero cuentas nuevas, ya usas Actions | Necesita `basePath: "/championsLeague"` salvo dominio propio |
| **Netlify** | Soporta SSR con su plugin de Next | 300 min de build/mes y 100 GB de ancho de banda |

Con el export estático, mudarse es: apuntar el host al repo, build command
`npm run build`, output directory `out`.

## 9. Riesgos y decisiones abiertas

1. **La API puede no modelar el formato liga como esperamos.** Es el riesgo número uno
   y por eso §5.2 va primero. Plan B: cargar el calendario a mano tras el sorteo y usar
   la API solo para marcadores.
2. **Desempate por coeficiente de club**: no se puede calcular localmente. Si
   `/standings` no lo aplica, la tabla puede diferir de la oficial en empates. Mitigación:
   usar el orden que devuelve la API.
3. **Escudos y derechos de imagen**: uso personal/informativo, tamaño pequeño, sin logos
   de la competición y con el descargo del footer (§6.1).
4. **Nombres de clubes en español**: la API los da en inglés; hay que curar a mano una
   lista corta.
5. **Fechas y sede de la final 2026/27**: confirmar contra la API una vez hecho el sorteo,
   no darlas por sabidas.
6. **Historial de commits**: el repo conserva ~cientos de commits `chore: update results`
   del Mundial. No estorban, pero si quieres un `git log` limpio hay que decidirlo antes
   de empezar la Fase 1 (un commit huérfano de "reinicio" es la vía menos destructiva).
