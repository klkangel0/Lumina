# 📋 LUMINA — Especificación de Nuevos Apartados

Este documento detalla las funcionalidades implementadas en la aplicación Lumina. Sirve de referencia técnica para el equipo de desarrollo: qué hace cada apartado, cómo funciona y qué campos y lógica utiliza.

> **IMPORTANTE**: Este documento es complementario al archivo `lumina_project_context.md` que contiene todo el contexto técnico del proyecto (stack, arquitectura, base de datos, APIs, etc). Léelo primero si no conoces el proyecto.

---

## 🔵 FUNCIONALIDAD 1: Formulario Obligatorio para Hacerse Socio

### Descripción General

Actualmente, cuando un usuario se registra en Lumina, queda como **Postulador** (en lista de espera). El administrador puede aprobarle directamente. **Esto debe cambiar.**

Ahora, antes de que el administrador pueda aprobarle, el postulador debe rellenar un **formulario completo obligatorio** desde su propia cuenta. Si intenta aprobar a un postulador que no ha completado el formulario, el sistema debe mostrar un **error claro indicando exactamente qué secciones faltan**.

### Nuevo Apartado en el Menú Lateral del Postulador

El menú lateral del postulador actualmente muestra:
- Lista de espera
- Mis documentos

**Se debe añadir un nuevo botón/apartado** llamado algo como **"Darse de Alta como Socio"** o **"Formulario de Alta"** que lleve al postulador al formulario completo.

### Estructura del Formulario (3 partes)

El formulario tiene **3 secciones que se rellenan en orden**:

```
┌─────────────────────────────────────────────┐
│  PARTE 1: DATOS DE CONTACTO (General)       │  ← Siempre visible para todos
│  (Datos básicos del usuario y del paciente) │
├─────────────────────────────────────────────┤
│  PARTE 2: CUESTIONARIO POR EDAD             │  ← Se muestra según la edad:
│  • Si edad ≤ 12 → Formulario Infantil       │     - Menores de 12 años
│  • Si edad 13-18 → Formulario Adolescente   │     - De 13 a 18 años
├─────────────────────────────────────────────┤
│  PARTE 3: SERVICIOS Y DISPONIBILIDAD        │  ← Solo en el formulario de 13-18
│  (Qué servicios solicita + horarios)        │     (En el de ≤12 NO aparece)
└─────────────────────────────────────────────┘
```

---

### PARTE 1: DATOS DE CONTACTO (Formulario General)

Esta sección la rellena **todo postulador** independientemente de la edad. **Todos los campos son obligatorios** salvo que se indique lo contrario.

| # | Campo | Tipo de Input | Obligatorio | Notas |
|---|---|---|---|---|
| 1 | Nombre y apellidos del usuario (paciente/hijo) | Texto libre | ✅ Sí | |
| 2 | Edad del usuario | Numérico | ✅ Sí | **Este campo determina qué cuestionario se muestra en la Parte 2** |
| 3 | Nombre y apellidos madre y padre | Texto libre | ✅ Sí | |
| 4 | Municipio | **Desplegable cerrado** | ✅ Sí | Ver sección "Desplegable de Municipios" más abajo |
| 5 | Teléfono de contacto | Tel | ✅ Sí | |
| 6 | Correo electrónico | Email | ✅ Sí | |
| 7 | ¿Su hijo/a tiene el diagnóstico de TEA? | Radio: **Sí / No** | ✅ Sí | TEA = Trastorno del Espectro Autista |
| 8 | Si tiene TEA, ¿qué grado/nivel tiene? | Radio: **Nivel 1 / Nivel 2 / Nivel 3 / No lo sé** | Condicional | Solo aparece si la pregunta 7 es "Sí" |

#### Lógica después de la Parte 1:
- Si **Edad ≤ 12** → Se muestra el **Cuestionario Infantil** (Parte 2A)
- Si **Edad 13-18** → Se muestra el **Cuestionario Adolescente** (Parte 2B) + la **Parte 3 (Servicios y Horarios)**

---

### PARTE 2A: CUESTIONARIO INFANTIL (Edad ≤ 12 años)

**Encabezado visible:** *"DEMANDA DE SERVICIOS DE PSICOLOGÍA Y LOGOPEDIA — Este cuestionario está dirigido a población infantil niños/as hasta los 12 años."*

A continuación se listan **TODAS las preguntas exactas** que debe contener este formulario. Todas son obligatorias.

#### Bloque: Comunicación Verbal
| # | Pregunta | Opciones |
|---|---|---|
| 1 | ¿El niño/a utiliza palabras para comunicarse? | Sí / No |
| 2 | ¿El niño/a usa frases completas? | Sí / No / A veces |
| 3 | ¿Con qué frecuencia repite palabras o frases (ecolalia)? | Frecuentemente / Algunas veces / Raramente / Nunca |

#### Bloque: Comprensión
| # | Pregunta | Opciones |
|---|---|---|
| 4 | ¿El niño/a entiende órdenes sencillas (por ejemplo, "dame la pelota")? | Sí / No / A veces |
| 5 | ¿Puede seguir instrucciones que incluyen dos o más pasos (por ejemplo, "ve a tu cuarto y tráeme el libro")? | Sí / No / A veces |
| 6 | ¿El niño/a parece entender preguntas simples como "¿Cómo te llamas?" o "¿Qué quieres comer?"? | Sí / No / Con dificultad |

#### Bloque: Expresión de Necesidades
| # | Pregunta | Opciones |
|---|---|---|
| 7 | ¿El niño/a puede pedir cosas que necesita usando palabras (por ejemplo, "quiero agua")? | Sí / No / A veces |
| 8 | Si no puede expresarse verbalmente, ¿cómo comunica sus necesidades (señalando, llevando objetos, etc.)? | **Texto libre** |
| 9 | ¿El niño/a suele frustrarse cuando no puede expresar lo que quiere decir? | Sí / No / A veces |

#### Bloque: Comunicación Alternativa
| # | Pregunta | Opciones |
|---|---|---|
| 10 | ¿El niño/a utiliza algún sistema de comunicación alternativo (PECS, comunicación por signos, dispositivos de voz)? | Sí / No |
| 11 | Si usa un sistema alternativo, ¿lo utiliza de forma consistente? | Sí / No / A veces |

#### Bloque: Articulación y Fluidez del Habla
| # | Pregunta | Opciones |
|---|---|---|
| 12 | ¿El niño/a tiene dificultades para articular sonidos o palabras correctamente? | Sí / No / A veces |
| 13 | ¿Suele hablar de manera entrecortada o pausada (tartamudez, pausas largas entre palabras)? | Sí / No / A veces |
| 14 | ¿El habla del niño/a es comprensible para otras personas fuera del núcleo familiar? | Sí / No / A veces |

#### Bloque: Uso Social del Lenguaje
| # | Pregunta | Opciones |
|---|---|---|
| 15 | ¿El niño/a inicia conversaciones de manera espontánea? | Sí / No / Raramente |
| 16 | ¿El niño/a utiliza el lenguaje para interactuar socialmente (por ejemplo, para saludar, despedirse, o hacer preguntas)? | Sí / No / A veces |
| 17 | ¿Le cuesta entender turnos en la conversación (esperar para hablar, responder a preguntas)? | Sí / No / A veces |

#### Bloque: Conducta y Emociones
| # | Pregunta | Opciones |
|---|---|---|
| 18 | ¿El niño/a tiene dificultades para identificar o expresar sus emociones? | Sí / No / A veces |
| 19 | ¿Cómo suele reaccionar ante situaciones de frustración o cambios inesperados en su rutina? | **Texto libre** |
| 20 | ¿El niño/a tiene episodios frecuentes de ansiedad, nerviosismo o miedo? | Sí / No / A veces |
| 21 | ¿Suele presentar conductas autolesivas (por ejemplo, golpearse, rascarse excesivamente)? | Sí / No / Rara vez |
| 22 | ¿El niño/a tiene comportamientos repetitivos o estereotipados (balanceo, aleteo de manos, repetición de movimientos)? | Sí / No / A veces |
| 23 | ¿Muestra alguna forma de obsesión o interés intenso por temas específicos? | Sí / No / A veces |
| 24 | ¿Cómo responde el niño/a ante las normas o reglas (en casa, escuela, etc.)? | Las sigue sin problemas / Las ignora / Se frustra cuando hay reglas |
| 25 | ¿Suele tener arrebatos de ira o rabietas con frecuencia? | Sí / No / A veces |
| 26 | ¿El niño/a suele tener dificultad para adaptarse a cambios en su entorno o rutina? | Sí / No / A veces |

#### Bloque: Interacción Social
| # | Pregunta | Opciones |
|---|---|---|
| 27 | ¿El niño/a tiene interés en interactuar con otras personas (niños, adultos)? | Sí / No / A veces |
| 28 | ¿Suele mantener contacto visual durante las interacciones? | Sí / No / A veces |
| 29 | ¿El niño/a entiende las reglas sociales, como saludar o despedirse? | Sí / No / A veces |
| 30 | ¿Cómo responde el niño/a cuando otras personas intentan interactuar con él/ella? | Responde positivamente / Ignora a las personas / Rechaza el contacto |
| 31 | ¿Prefiere jugar solo/a o acompañado/a? | Solo/a / Acompañado/a / A veces depende de la situación |

#### Bloque: Sensorialidad
| # | Pregunta | Opciones |
|---|---|---|
| 32 | ¿El niño/a parece ser sensible a estímulos sensoriales (por ejemplo, ruidos fuertes, luces brillantes, ciertas texturas)? | Sí / No / A veces |
| 33 | ¿Tiene conductas de evitación hacia ciertos alimentos, telas o materiales? | Sí / No / A veces |
| 34 | ¿El niño/a busca estímulos sensoriales intensos (como balancearse, golpear objetos, o girar)? | Sí / No / A veces |

#### Bloque: Relaciones y Autonomía
| # | Pregunta | Opciones |
|---|---|---|
| 35 | ¿El niño/a tiene dificultades para hacer o mantener amigos? | Sí / No |
| 36 | ¿Comprende o responde adecuadamente a las emociones de otras personas (por ejemplo, consolar a alguien triste)? | Sí / No / A veces |
| 37 | ¿Cómo maneja el niño/a los conflictos o desacuerdos con otros niños? | Los evita / Se enfada / Los resuelve con ayuda de un adulto |
| 38 | ¿El niño/a tiene habilidades adecuadas para las actividades diarias (como vestirse, comer solo/a, o ir al baño)? | Sí / No / En proceso |
| 39 | ¿El comportamiento del niño/a afecta de manera significativa la vida familiar? | Sí / No / A veces |

**Total: 39 preguntas** (37 con opciones tipo radio, 2 de texto libre)

---

### PARTE 2B: CUESTIONARIO ADOLESCENTE (Edad 13-18 años)

**Encabezado visible:** *"DEMANDA DE SERVICIOS DE PSICOLOGÍA Y LOGOPEDIA — Este cuestionario está dirigido a población adolescente entre los 13-18 años."*

#### Bloque: Comunicación Verbal
| # | Pregunta | Opciones |
|---|---|---|
| 1 | ¿Utiliza el adolescente lenguaje verbal para comunicarse de manera efectiva? | Sí / No / A veces |
| 2 | ¿Habla en frases completas o tiende a usar oraciones cortas o incompletas? | Frases completas / Oraciones cortas / Incompletas |
| 3 | ¿Utiliza repeticiones o ecos de palabras o frases (ecolalia) de manera frecuente? | Sí / No / A veces |
| 4 | ¿Tiene dificultades para pronunciar o articular sonidos de manera clara? | Sí / No / A veces |

#### Bloque: Comprensión
| # | Pregunta | Opciones |
|---|---|---|
| 5 | ¿El adolescente entiende instrucciones complejas o de varios pasos? | Sí / No / Con dificultad |
| 6 | ¿Entiende el significado de preguntas abiertas (por ejemplo, "¿Qué hiciste hoy?")? | Sí / No / A veces |
| 7 | ¿Muestra dificultad para comprender bromas, sarcasmos o expresiones idiomáticas? | Sí / No / A veces |

#### Bloque: Habilidades Conversacionales
| # | Pregunta | Opciones |
|---|---|---|
| 8 | ¿Inicia conversaciones de forma espontánea con compañeros o adultos? | Sí / No / A veces |
| 9 | ¿Sigue las reglas conversacionales como esperar su turno para hablar o mantener el tema? | Sí / No / A veces |
| 10 | ¿Suele cambiar de tema bruscamente durante las conversaciones? | Sí / No / A veces |
| 11 | ¿Utiliza gestos, expresiones faciales o el lenguaje corporal para complementar su comunicación? | Sí / No / A veces |

#### Bloque: Conducta y Emociones
| # | Pregunta | Opciones |
|---|---|---|
| 12 | ¿El adolescente tiene dificultades para identificar y expresar sus emociones? | Sí / No / A veces |
| 13 | ¿Muestra ansiedad, depresión o cambios bruscos de humor con frecuencia? | Sí / No / A veces |
| 14 | ¿Cómo maneja la frustración o el estrés? (por ejemplo, ¿se aísla, se irrita, llora?) | **Texto libre** |
| 15 | ¿Ha presentado conductas autolesivas (por ejemplo, golpearse, rascarse) en el último año? | Sí / No / A veces |
| 16 | ¿Muestra comportamientos repetitivos o intereses restringidos (por ejemplo, obsesión con un tema, movimientos repetitivos)? | Sí / No / A veces |
| 17 | ¿Tiene arrebatos de ira o frustración de manera frecuente? | Sí / No / A veces |
| 18 | ¿El adolescente tiene dificultades para adaptarse a cambios en su rutina o entorno? | Sí / No / A veces |

#### Bloque: Relaciones Sociales
| # | Pregunta | Opciones |
|---|---|---|
| 19 | ¿Muestra interés en relacionarse con compañeros de su edad? | Sí / No / A veces |
| 20 | ¿Tiene amigos cercanos o relaciones significativas con otras personas de su edad? | Sí / No / Le cuesta |
| 21 | ¿Entiende las normas sociales (como saludar, despedirse, o respetar el espacio personal)? | Sí / No / A veces |
| 22 | ¿Tiene dificultades para mantener relaciones sociales debido a problemas de comunicación? | Sí / No / A veces |

#### Bloque: Atención y Autonomía
| # | Pregunta | Opciones |
|---|---|---|
| 23 | ¿El adolescente puede concentrarse en tareas o actividades durante periodos prolongados? | Sí / No / A veces |
| 24 | ¿Es capaz de completar tareas escolares sin supervisión o con mínima asistencia? | Sí / No / A veces |

#### Bloque: Sensorialidad
| # | Pregunta | Opciones |
|---|---|---|
| 25 | ¿El adolescente es sensible a estímulos sensoriales como ruidos fuertes, luces brillantes o ciertos tipos de texturas? | Sí / No / A veces |
| 26 | ¿Evita ciertos alimentos o actividades debido a su sensibilidad sensorial? | Sí / No / A veces |
| 27 | ¿Busca estímulos sensoriales intensos (como balancearse, golpear objetos, o girar)? | Sí / No / A veces |

#### Bloque: Vida Diaria e Impacto Familiar
| # | Pregunta | Opciones |
|---|---|---|
| 28 | ¿El adolescente tiene habilidades adecuadas para las actividades diarias (por ejemplo, higiene personal, vestirse, o preparar alimentos sencillos)? | Sí / No / En proceso |
| 29 | ¿Requiere apoyo constante para llevar a cabo las actividades cotidianas? | Sí / No / A veces |
| 30 | ¿El comportamiento del adolescente impacta de manera significativa la dinámica familiar? | Sí / No / A veces |

**Total preguntas cuestionario: 30** (29 con opciones tipo radio, 1 de texto libre)

---

### PARTE 3: SERVICIOS SOLICITADOS Y DISPONIBILIDAD HORARIA (Solo para 13-18 años)

Esta sección aparece **únicamente** en el formulario de adolescentes (13-18), justo después del cuestionario.

#### Servicios Solicitados (Selección múltiple — checkboxes, puede marcar varios)
| Opción |
|---|
| Intervención Psicológica — Sesiones individuales |
| Intervención Habilidades Sociales — Sesiones grupales |
| Intervención Logopédica — Sesiones individuales |
| Orientación y asesoramiento familiar |
| Formación a familiares de hijo/a TEA |

#### Disponibilidad Horaria
| Campo | Tipo | Opciones |
|---|---|---|
| Disponibilidad de horario de mañanas (9:00-14:00) | Radio obligatorio | Sí / No |
| Disponibilidad de horario de tardes | Radio (seleccionar una) | A partir de las 15:00 / A partir de las 16:00 / A partir de las 17:00 / A partir de las 17:30 |
| Disponibilidad sábados por la mañana | Radio obligatorio | Sí / No |

---

### Lógica de Validación para el Administrador

Cuando el administrador intenta **aprobar a un postulador** (botón "Hacer Socio" en la Lista de Espera):

1. El sistema comprueba si el postulador ha completado **TODAS** las partes del formulario.
2. **Si está todo completo** → Se aprueba normalmente (status pasa de PENDING a ACTIVE).
3. **Si falta algo** → Se bloquea la aprobación y se muestra un error tipo SweetAlert listando exactamente qué falta. Ejemplo:
   - *"No se puede aprobar este socio. Faltan los siguientes apartados:"*
   - ❌ Formulario de Datos de Contacto (Parte 1)
   - ❌ Cuestionario de Psicología y Logopedia (Parte 2)

---

## 🟢 FUNCIONALIDAD 2: Campo de Delegación en el Formulario

### Requisitos

- En el formulario de alta (Parte 1 - Datos de Contacto), se debe añadir un **campo desplegable** donde el postulador selecciona **en qué delegación quiere/tiene que ser atendido**.
- El desplegable se alimenta de las delegaciones que ya existen en la base de datos (modelo `Delegation` de Prisma).
- **El administrador también puede cambiar** la delegación asignada a un socio en cualquier momento desde el panel de administración (al editar el socio).

### Implementación sugerida
- Añadir campo `delegationId` (Int, opcional) al modelo `Socio` en Prisma.
- Relación: `Socio` → `Delegation` (N:1).
- El desplegable: carga desde `GET /api/delegaciones` y muestra el `name` de cada delegación.

---

## 🟡 FUNCIONALIDAD 3: Desplegable de Municipios del Baix Llobregat

### Requisitos

El campo "Municipio" **NO es de texto libre**. Es un desplegable cerrado con los municipios del Baix Llobregat (~30 municipios).

### Lista Completa de Municipios

Las **4 poblaciones con delegación van ANCLADAS ARRIBA** (primeras del listado, separadas visualmente). El resto van en orden alfabético debajo.

```
── DELEGACIONES (ancladas arriba) ──
1.  Martorell
2.  Abrera
3.  Esparreguera
4.  Olesa de Montserrat

── RESTO DE MUNICIPIOS (alfabético) ──
5.  Begues
6.  Castelldefels
7.  Castellví de Rosanes
8.  Cervelló
9.  Collbató
10. Corbera de Llobregat
11. Cornellà de Llobregat
12. El Papiol
13. El Prat de Llobregat
14. Gavà
15. Gelida
16. L'Hospitalet de Llobregat
17. Molins de Rei
18. Pallejà
19. Sant Andreu de la Barca
20. Sant Boi de Llobregat
21. Sant Climent de Llobregat
22. Sant Esteve Sesrovires
23. Sant Feliu de Llobregat
24. Sant Joan Despí
25. Sant Just Desvern
26. Sant Vicenç dels Horts
27. Santa Coloma de Cervelló
28. Torrelles de Llobregat
29. Vallirana
30. Viladecans
```

> **Nota**: Si las 4 primeras poblaciones de delegación no son exactamente esas (Martorell, Abrera, Esparreguera, Olesa), confirmar con el usuario cuáles son las correctas y ajustar.

### Propósito
Tener un campo cerrado de municipio permite **filtrar socios por población** y generar estadísticas/informes (por ejemplo, "¿Cuántos socios hay de Gavà?").

---

## 🔴 FUNCIONALIDAD 4: Exportación CSV

### 4A — Botón de Exportar CSV Global

- **Ubicación**: Pantalla de **Socios** (`Socios.jsx`), junto al buscador o en la cabecera — un botón visible tipo "📥 Exportar CSV".
- **Qué descarga**: Un archivo `.csv` con **todos los socios activos** y sus datos generales + los datos de sus pacientes (hijos).
- **Campos a incluir en el CSV** (los de la Parte 1 del formulario + datos básicos del socio):

| Columna CSV | Origen |
|---|---|
| Código de Socio | `socio.memberCode` |
| Nombre del paciente/usuario | Del formulario de alta |
| Edad del usuario | Del formulario de alta |
| Nombre madre/padre | Del formulario de alta |
| Municipio | Del formulario de alta (desplegable) |
| Delegación asignada | `delegation.name` |
| Teléfono | `socio.phone` |
| Email | `socio.email` |
| Diagnóstico TEA | Sí/No (del formulario) |
| Nivel TEA | Nivel 1/2/3/No lo sé (del formulario) |
| Fecha de Alta | `socio.joinDate` |
| Estado | `socio.status` |

- **Formato**: CSV separado por punto y coma (`;`) para compatibilidad con Excel español.
- **Nombre del archivo**: `socios_lumina_YYYY-MM-DD.csv`

### 4B — Botón de Exportar CSV Individual

- **Ubicación**: Dentro del modal de **"Ver Detalles"** de un socio concreto (`SocioDetailModal.jsx`) — un botón tipo "📥 Descargar CSV".
- **Qué descarga**: Un archivo `.csv` con los datos de **ese único socio** y todos sus pacientes.
- **Mismos campos** que el CSV global, pero filtrado a un solo registro.
- **Nombre del archivo**: `socio_SOC-00001_YYYY-MM-DD.csv` (usando el memberCode del socio).

---

## 📐 Resumen Visual del Flujo Completo

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. USUARIO SE REGISTRA (Register.jsx)                              │
│     → Crea cuenta + queda como POSTULADOR (PENDING)                 │
│     → Ve menú: Lista de Espera | Mis Documentos | NUEVO: Alta Socio │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  2. POSTULADOR RELLENA FORMULARIO DE ALTA                           │
│     Parte 1: Datos de Contacto (general, con municipio y delegación)│
│     Parte 2: Cuestionario según edad (≤12 o 13-18)                  │
│     Parte 3: Servicios + Horarios (solo 13-18)                      │
│     → Se guarda todo en la BBDD vinculado al Socio                  │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  3. ADMINISTRADOR REVISA (AdminListaEspera.jsx)                     │
│     → Ve "Aprobar" → Sistema verifica formulario completo           │
│     → Si falta algo → ERROR con detalle de qué falta                │
│     → Si todo OK → Aprueba → Status = ACTIVE                       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  4. SOCIO ACTIVO                                                    │
│     → Ve menú completo: Mis Pacientes | Mis Documentos | Actividades│
│     → Sus datos son exportables a CSV (individual o global)         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Notas Técnicas para la Implementación

1. **Base de datos**: Se necesitará crear un nuevo modelo en Prisma (o añadir campos JSON al modelo `Socio`) para almacenar las respuestas del cuestionario. Se recomienda un modelo tipo `SocioQuestionnaire` con campos para cada respuesta.

2. **El campo `municipio`** del modelo `Socio` debe cambiar de texto libre a un valor controlado (el desplegable). Puede seguir siendo String pero validado contra la lista fija.

3. **El campo `delegationId`** debe añadirse al modelo `Socio` en Prisma como relación opcional a `Delegation`.

4. **La generación del CSV** se puede hacer 100% en el frontend (construir el string CSV en JavaScript y lanzar una descarga con `Blob` + `URL.createObjectURL`), sin necesidad de endpoint nuevo en el backend.

5. **El formulario de alta** es una página/ruta nueva que solo es visible para usuarios con `role=SOCIO` y `status=PENDING`.

6. **La validación de completitud** debe hacerse en el backend (en la ruta `PATCH /api/socios/:id/status`) antes de permitir el cambio de PENDING a ACTIVE.
