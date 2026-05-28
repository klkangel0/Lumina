/** Preguntas Parte 2 — textos según lumina_nuevos_apartados.md */

const r2 = ['Sí', 'No'];
const r3 = ['Sí', 'No', 'A veces'];
const r3b = ['Sí', 'No', 'Con dificultad'];
const eco = ['Frecuentemente', 'Algunas veces', 'Raramente', 'Nunca'];
const r4 = ['Sí', 'No', 'Raramente'];
const reglas = ['Las sigue sin problemas', 'Las ignora', 'Se frustra cuando hay reglas'];
const socialResp = ['Responde positivamente', 'Ignora a las personas', 'Rechaza el contacto'];
const prefJuego = ['Solo/a', 'Acompañado/a', 'A veces depende de la situación'];
const conflictos = ['Los evita', 'Se enfada', 'Los resuelve con ayuda de un adulto'];
const amigos35 = ['Sí', 'No'];
const frases2 = ['Sí', 'No', 'A veces'];
const leCuesta = ['Sí', 'No', 'Le cuesta'];

export const INFANT_HEADER =
    'DEMANDA DE SERVICIOS DE PSICOLOGÍA Y LOGOPEDIA — Este cuestionario está dirigido a población infantil niños/as hasta los 12 años.';

export const ADOLESCENT_HEADER =
    'DEMANDA DE SERVICIOS DE PSICOLOGÍA Y LOGOPEDIA — Este cuestionario está dirigido a población adolescente entre los 13-18 años.';

export const INFANT_QUESTIONS = [
    { block: 'Comunicación Verbal', id: 1, text: '¿El niño/a utiliza palabras para comunicarse?', options: r2 },
    { block: 'Comunicación Verbal', id: 2, text: '¿El niño/a usa frases completas?', options: frases2 },
    { block: 'Comunicación Verbal', id: 3, text: '¿Con qué frecuencia repite palabras o frases (ecolalia)?', options: eco },
    { block: 'Comprensión', id: 4, text: '¿El niño/a entiende órdenes sencillas (por ejemplo, "dame la pelota")?', options: frases2 },
    { block: 'Comprensión', id: 5, text: '¿Puede seguir instrucciones que incluyen dos o más pasos (por ejemplo, "ve a tu cuarto y tráeme el libro")?', options: frases2 },
    { block: 'Comprensión', id: 6, text: '¿El niño/a parece entender preguntas simples como "¿Cómo te llamas?" o "¿Qué quieres comer?"?', options: r3b },
    { block: 'Expresión de Necesidades', id: 7, text: '¿El niño/a puede pedir cosas que necesita usando palabras (por ejemplo, "quiero agua")?', options: frases2 },
    { block: 'Expresión de Necesidades', id: 8, text: 'Si no puede expresarse verbalmente, ¿cómo comunica sus necesidades (señalando, llevando objetos, etc.)?', type: 'text' },
    { block: 'Expresión de Necesidades', id: 9, text: '¿El niño/a suele frustrarse cuando no puede expresar lo que quiere decir?', options: frases2 },
    { block: 'Comunicación Alternativa', id: 10, text: '¿El niño/a utiliza algún sistema de comunicación alternativo (PECS, comunicación por signos, dispositivos de voz)?', options: r2 },
    { block: 'Comunicación Alternativa', id: 11, text: 'Si usa un sistema alternativo, ¿lo utiliza de forma consistente?', options: frases2 },
    { block: 'Articulación y Fluidez del Habla', id: 12, text: '¿El niño/a tiene dificultades para articular sonidos o palabras correctamente?', options: frases2 },
    { block: 'Articulación y Fluidez del Habla', id: 13, text: '¿Suele hablar de manera entrecortada o pausada (tartamudez, pausas largas entre palabras)?', options: frases2 },
    { block: 'Articulación y Fluidez del Habla', id: 14, text: '¿El habla del niño/a es comprensible para otras personas fuera del núcleo familiar?', options: frases2 },
    { block: 'Uso Social del Lenguaje', id: 15, text: '¿El niño/a inicia conversaciones de manera espontánea?', options: r4 },
    { block: 'Uso Social del Lenguaje', id: 16, text: '¿El niño/a utiliza el lenguaje para interactuar socialmente (por ejemplo, para saludar, despedirse, o hacer preguntas)?', options: frases2 },
    { block: 'Uso Social del Lenguaje', id: 17, text: '¿Le cuesta entender turnos en la conversación (esperar para hablar, responder a preguntas)?', options: frases2 },
    { block: 'Conducta y Emociones', id: 18, text: '¿El niño/a tiene dificultades para identificar o expresar sus emociones?', options: frases2 },
    { block: 'Conducta y Emociones', id: 19, text: '¿Cómo suele reaccionar ante situaciones de frustración o cambios inesperados en su rutina?', type: 'text' },
    { block: 'Conducta y Emociones', id: 20, text: '¿El niño/a tiene episodios frecuentes de ansiedad, nerviosismo o miedo?', options: frases2 },
    { block: 'Conducta y Emociones', id: 21, text: '¿Suele presentar conductas autolesivas (por ejemplo, golpearse, rascarse excesivamente)?', options: ['Sí', 'No', 'Rara vez'] },
    { block: 'Conducta y Emociones', id: 22, text: '¿El niño/a tiene comportamientos repetitivos o estereotipados (balanceo, aleteo de manos, repetición de movimientos)?', options: frases2 },
    { block: 'Conducta y Emociones', id: 23, text: '¿Muestra alguna forma de obsesión o interés intenso por temas específicos?', options: frases2 },
    { block: 'Conducta y Emociones', id: 24, text: '¿Cómo responde el niño/a ante las normas o reglas (en casa, escuela, etc.)?', options: reglas },
    { block: 'Conducta y Emociones', id: 25, text: '¿Suele tener arrebatos de ira o rabietas con frecuencia?', options: frases2 },
    { block: 'Conducta y Emociones', id: 26, text: '¿El niño/a suele tener dificultad para adaptarse a cambios en su entorno o rutina?', options: frases2 },
    { block: 'Interacción Social', id: 27, text: '¿El niño/a tiene interés en interactuar con otras personas (niños, adultos)?', options: frases2 },
    { block: 'Interacción Social', id: 28, text: '¿Suele mantener contacto visual durante las interacciones?', options: frases2 },
    { block: 'Interacción Social', id: 29, text: '¿El niño/a entiende las reglas sociales, como saludar o despedirse?', options: frases2 },
    { block: 'Interacción Social', id: 30, text: '¿Cómo responde el niño/a cuando otras personas intentan interactuar con él/ella?', options: socialResp },
    { block: 'Interacción Social', id: 31, text: '¿Prefiere jugar solo/a o acompañado/a?', options: prefJuego },
    { block: 'Sensorialidad', id: 32, text: '¿El niño/a parece ser sensible a estímulos sensoriales (por ejemplo, ruidos fuertes, luces brillantes, ciertas texturas)?', options: frases2 },
    { block: 'Sensorialidad', id: 33, text: '¿Tiene conductas de evitación hacia ciertos alimentos, telas o materiales?', options: frases2 },
    { block: 'Sensorialidad', id: 34, text: '¿El niño/a busca estímulos sensoriales intensos (como balancearse, golpear objetos, o girar)?', options: frases2 },
    { block: 'Relaciones y Autonomía', id: 35, text: '¿El niño/a tiene dificultades para hacer o mantener amigos?', options: amigos35 },
    { block: 'Relaciones y Autonomía', id: 36, text: '¿Comprende o responde adecuadamente a las emociones de otras personas (por ejemplo, consolar a alguien triste)?', options: frases2 },
    { block: 'Relaciones y Autonomía', id: 37, text: '¿Cómo maneja el niño/a los conflictos o desacuerdos con otros niños?', options: conflictos },
    { block: 'Relaciones y Autonomía', id: 38, text: '¿El niño/a tiene habilidades adecuadas para las actividades diarias (como vestirse, comer solo/a, o ir al baño)?', options: ['Sí', 'No', 'En proceso'] },
    { block: 'Relaciones y Autonomía', id: 39, text: '¿El comportamiento del niño/a afecta de manera significativa la vida familiar?', options: frases2 },
];

const ad3 = ['Sí', 'No', 'Con dificultad'];
const frasesAd2 = ['Frases completas', 'Oraciones cortas', 'Incompletas'];

export const ADOLESCENT_QUESTIONS = [
    { block: 'Comunicación Verbal', id: 1, text: '¿Utiliza el adolescente lenguaje verbal para comunicarse de manera efectiva?', options: frases2 },
    { block: 'Comunicación Verbal', id: 2, text: '¿Habla en frases completas o tiende a usar oraciones cortas o incompletas?', options: frasesAd2 },
    { block: 'Comunicación Verbal', id: 3, text: '¿Utiliza repeticiones o ecos de palabras o frases (ecolalia) de manera frecuente?', options: frases2 },
    { block: 'Comunicación Verbal', id: 4, text: '¿Tiene dificultades para pronunciar o articular sonidos de manera clara?', options: frases2 },
    { block: 'Comprensión', id: 5, text: '¿El adolescente entiende instrucciones complejas o de varios pasos?', options: ad3 },
    { block: 'Comprensión', id: 6, text: '¿Entiende el significado de preguntas abiertas (por ejemplo, "¿Qué hiciste hoy?")?', options: frases2 },
    { block: 'Comprensión', id: 7, text: '¿Muestra dificultad para comprender bromas, sarcasmos o expresiones idiomáticas?', options: frases2 },
    { block: 'Habilidades Conversacionales', id: 8, text: '¿Inicia conversaciones de forma espontánea con compañeros o adultos?', options: frases2 },
    { block: 'Habilidades Conversacionales', id: 9, text: '¿Sigue las reglas conversacionales como esperar su turno para hablar o mantener el tema?', options: frases2 },
    { block: 'Habilidades Conversacionales', id: 10, text: '¿Suele cambiar de tema bruscamente durante las conversaciones?', options: frases2 },
    { block: 'Habilidades Conversacionales', id: 11, text: '¿Utiliza gestos, expresiones faciales o el lenguaje corporal para complementar su comunicación?', options: frases2 },
    { block: 'Conducta y Emociones', id: 12, text: '¿El adolescente tiene dificultades para identificar y expresar sus emociones?', options: frases2 },
    { block: 'Conducta y Emociones', id: 13, text: '¿Muestra ansiedad, depresión o cambios bruscos de humor con frecuencia?', options: frases2 },
    { block: 'Conducta y Emociones', id: 14, text: '¿Cómo maneja la frustración o el estrés? (por ejemplo, ¿se aísla, se irrita, llora?)', type: 'text' },
    { block: 'Conducta y Emociones', id: 15, text: '¿Ha presentado conductas autolesivas (por ejemplo, golpearse, rascarse) en el último año?', options: frases2 },
    { block: 'Conducta y Emociones', id: 16, text: '¿Muestra comportamientos repetitivos o intereses restringidos (por ejemplo, obsesión con un tema, movimientos repetitivos)?', options: frases2 },
    { block: 'Conducta y Emociones', id: 17, text: '¿Tiene arrebatos de ira o frustración de manera frecuente?', options: frases2 },
    { block: 'Conducta y Emociones', id: 18, text: '¿El adolescente tiene dificultades para adaptarse a cambios en su rutina o entorno?', options: frases2 },
    { block: 'Relaciones Sociales', id: 19, text: '¿Muestra interés en relacionarse con compañeros de su edad?', options: frases2 },
    { block: 'Relaciones Sociales', id: 20, text: '¿Tiene amigos cercanos o relaciones significativas con otras personas de su edad?', options: leCuesta },
    { block: 'Relaciones Sociales', id: 21, text: '¿Entiende las normas sociales (como saludar, despedirse, o respetar el espacio personal)?', options: frases2 },
    { block: 'Relaciones Sociales', id: 22, text: '¿Tiene dificultades para mantener relaciones sociales debido a problemas de comunicación?', options: frases2 },
    { block: 'Atención y Autonomía', id: 23, text: '¿El adolescente puede concentrarse en tareas o actividades durante periodos prolongados?', options: frases2 },
    { block: 'Atención y Autonomía', id: 24, text: '¿Es capaz de completar tareas escolares sin supervisión o con mínima asistencia?', options: frases2 },
    { block: 'Sensorialidad', id: 25, text: '¿El adolescente es sensible a estímulos sensoriales como ruidos fuertes, luces brillantes o ciertos tipos de texturas?', options: frases2 },
    { block: 'Sensorialidad', id: 26, text: '¿Evita ciertos alimentos o actividades debido a su sensibilidad sensorial?', options: frases2 },
    { block: 'Sensorialidad', id: 27, text: '¿Busca estímulos sensoriales intensos (como balancearse, golpear objetos, o girar)?', options: frases2 },
    { block: 'Vida Diaria e Impacto Familiar', id: 28, text: '¿El adolescente tiene habilidades adecuadas para las actividades diarias (por ejemplo, higiene personal, vestirse, o preparar alimentos sencillos)?', options: ['Sí', 'No', 'En proceso'] },
    { block: 'Vida Diaria e Impacto Familiar', id: 29, text: '¿Requiere apoyo constante para llevar a cabo las actividades cotidianas?', options: frases2 },
    { block: 'Vida Diaria e Impacto Familiar', id: 30, text: '¿El comportamiento del adolescente impacta de manera significativa la dinámica familiar?', options: frases2 },
];

export const PART3_SERVICES = [
    { id: 'psicologia_ind', label: 'Intervención Psicológica — Sesiones individuales' },
    { id: 'habilidades_sociales', label: 'Intervención Habilidades Sociales — Sesiones grupales' },
    { id: 'logopedia_ind', label: 'Intervención Logopédica — Sesiones individuales' },
    { id: 'orientacion_familiar', label: 'Orientación y asesoramiento familiar' },
    { id: 'formacion_tea', label: 'Formación a familiares de hijo/a TEA' },
];

export const AFTERNOON_OPTIONS = [
    { value: '15', label: 'A partir de las 15:00' },
    { value: '16', label: 'A partir de las 16:00' },
    { value: '17', label: 'A partir de las 17:00' },
    { value: '17_30', label: 'A partir de las 17:30' },
];
