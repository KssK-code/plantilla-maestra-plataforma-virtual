-- ============================================================
--  IVS Virtual — Materia Demo: Tutoría de Ingreso I
--  Ejecutado el: 2026-04-02
--  Estado: YA APLICADO en producción (xxfwcnroshgirbdquffh)
--  Este archivo es solo referencia / re-aplicar si se pierde la BD
-- ============================================================

-- ── 1. ACTUALIZAR MATERIA DEMO ───────────────────────────────────────────────
UPDATE public.materias SET
  nombre      = 'Tutoría de Ingreso I',
  descripcion = 'Esta materia te acompaña en tu transición al bachillerato virtual. Desarrollarás habilidades de estudio, gestión del tiempo, uso de herramientas digitales educativas, y construirás tu proyecto académico personal.',
  color       = '#8B5CF6',
  icono       = '🎓',
  orden       = 0,
  activa      = true
WHERE id = 'f0551b82-1c3e-4286-bfb4-878842bc6eff';

-- ── 2. MES DE CONTENIDO ──────────────────────────────────────────────────────
INSERT INTO public.meses_contenido (id, materia_id, numero_mes, titulo, descripcion) VALUES (
  'aa000000-0000-4000-a000-000000000001', 'f0551b82-1c3e-4286-bfb4-878842bc6eff', 1,
  'Habilidades para el estudio virtual',
  'Desarrolla las habilidades esenciales para tener éxito en el bachillerato virtual: técnicas de estudio, gestión del tiempo, herramientas digitales y tu proyecto académico personal.'
) ON CONFLICT (id) DO NOTHING;

-- ── 3. SEMANAS ───────────────────────────────────────────────────────────────
INSERT INTO public.semanas (id, mes_id, numero_semana, titulo, descripcion, video_url, tiempo_estimado_minutos, contenido) VALUES
('cc000001-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',1,'Bienvenida al bachillerato virtual — qué esperar','Bienvenida al bachillerato virtual — qué esperar','https://www.youtube.com/results?search_query=C%C3%B3mo+tener+%C3%A9xito+en+la+educaci%C3%B3n+en+l%C3%ADnea+bachillerato',60,'Decidiste estudiar el bachillerato virtual. Eso ya dice mucho de ti: tienes iniciativa, quieres superarte y estás tomando acción. Esta materia te va a dar las herramientas para que lo logres.

**¿Qué es el bachillerato virtual?**
Es la misma preparatoria, con la misma validez oficial, pero en formato 100% en línea. Estudias a tu ritmo, las 24 horas del día, los 7 días de la semana, desde cualquier lugar con internet.

**Ventajas:**
- Flexibilidad de horarios (tú decides cuándo estudiar)
- Sin traslados (ahorras tiempo y dinero)
- Puedes trabajar y estudiar al mismo tiempo
- Avanzas a tu propio ritmo
- Acceso las 24 horas

**Retos (y cómo superarlos):**
- Falta de disciplina → Necesitas crear rutinas
- Aislamiento → Mantén contacto con compañeros y tutores
- Distracciones en casa → Crea un espacio dedicado al estudio
- Procrastinación → Técnicas de gestión del tiempo (las veremos en semana 4)
- Dudas sin resolver → Usa los canales de comunicación con tutores

**¿Qué necesitas para tener éxito?**
1. Dispositivo con internet (computadora, tablet o celular)
2. Un espacio tranquilo para estudiar
3. 1-2 horas diarias dedicadas al estudio
4. Disciplina y constancia (más importante que la inteligencia)
5. Pedir ayuda cuando la necesites

**Estructura de cada materia:**
- Contenido semanal (lecturas y videos)
- Material de apoyo
- Un examen final tipo quiz (opción múltiple y verdadero/falso)
- Necesitas 6.0 o más para aprobar
- Tienes hasta 3 intentos por examen

**Compromiso contigo mismo:**
El bachillerato virtual requiere más autodisciplina que el presencial. Nadie te va a despertar para ir a clase. Nadie te va a regañar si no estudias. La responsabilidad es 100% tuya — y ese es el mayor aprendizaje de esta modalidad.

---
**Videos recomendados:**
1. [Cómo tener éxito en la educación en línea](https://www.youtube.com/results?search_query=C%C3%B3mo+tener+%C3%A9xito+en+la+educaci%C3%B3n+en+l%C3%ADnea+bachillerato) — 12 min
2. [Tips para estudiar desde casa](https://www.youtube.com/results?search_query=Tips+para+estudiar+desde+casa+bachillerato) — 10 min
3. [Ventajas de la educación virtual](https://www.youtube.com/results?search_query=Ventajas+de+la+educaci%C3%B3n+virtual+bachillerato) — 8 min
'),
('cc000002-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',2,'Estilos de aprendizaje — descubre cómo aprendes mejor','Estilos de aprendizaje — descubre cómo aprendes mejor','https://www.youtube.com/results?search_query=Estilos+de+aprendizaje+VARK+%E2%80%94+descubre+el+tuyo+bachillerato',66,'No todos aprendemos de la misma manera. Conocer tu estilo de aprendizaje te permite estudiar de forma más eficiente — aprender más en menos tiempo.

**Modelo VARK — Los 4 estilos principales:**

1. **Visual:** Aprendes mejor con imágenes, diagramas, mapas mentales, videos, colores.
- Si eres visual: usa marcadores de colores, haz diagramas, ve videos, crea mapas conceptuales.
- Señales: prefieres ver demostraciones, recuerdas mejor lo que ves que lo que escuchas.

2. **Auditivo:** Aprendes mejor escuchando: explicaciones, podcasts, discusiones, lectura en voz alta.
- Si eres auditivo: graba las explicaciones y escúchalas, lee en voz alta, explica los temas a alguien más.
- Señales: recuerdas conversaciones, te distraes con ruidos, prefieres que te expliquen.

3. **Lectura/Escritura:** Aprendes mejor leyendo y escribiendo: notas, resúmenes, listas, libros.
- Si eres lecto-escritor: haz resúmenes, toma notas a mano, reescribe conceptos con tus palabras, haz listas.
- Señales: prefieres leer instrucciones, te gusta hacer notas, recuerdas lo que escribes.

4. **Kinestésico:** Aprendes mejor haciendo: práctica, experimentación, movimiento, ejemplos reales.
- Si eres kinestésico: resuelve ejercicios práticos, usa ejemplos de la vida real, muévete mientras estudias, enseña a otros.
- Señales: te cuesta estar quieto, aprendes haciendo, necesitas ejemplos concretos.

**La mayoría somos una mezcla.** Probablemente tengas un estilo dominante y uno secundario.

**Inteligencias múltiples (Howard Gardner):**
Gardner propuso que la inteligencia no es una sola cosa. Existen al menos 8 tipos: lingüística, lógico-matemática, espacial, musical, corporal-kinestésica, interpersonal, intrapersonal y naturalista.

No eres ''inteligente'' o ''no inteligente''. Eres inteligente de diferentes maneras. El sistema educativo tradicional solo mide 2-3 tipos.

---
**Videos recomendados:**
1. [Estilos de aprendizaje VARK — descubre el tuyo](https://www.youtube.com/results?search_query=Estilos+de+aprendizaje+VARK+%E2%80%94+descubre+el+tuyo+bachillerato) — 14 min
2. [Inteligencias múltiples de Gardner](https://www.youtube.com/results?search_query=Inteligencias+m%C3%BAltiples+de+Gardner+bachillerato) — 12 min
3. [Cómo estudiar según tu estilo de aprendizaje](https://www.youtube.com/results?search_query=C%C3%B3mo+estudiar+seg%C3%BAn+tu+estilo+de+aprendizaje+bachillerato) — 10 min
'),
('cc000003-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',3,'Técnicas de estudio efectivas','Técnicas de estudio efectivas','https://www.youtube.com/results?search_query=Active+Recall+%E2%80%94+la+mejor+t%C3%A9cnica+de+estudio+bachillerato',68,'Estudiar mucho NO es lo mismo que estudiar bien. Las técnicas correctas pueden hacer que aprendas en 1 hora lo que antes te tomaba 3.

**Técnicas que SÍ funcionan (respaldadas por ciencia):**

1. **Recuerdo activo (Active Recall):**
En vez de releer, cierra el material e intenta recordar lo que leíste. Hazte preguntas. Es incómodo pero es la técnica más efectiva que existe.
- Lee un tema → Cierra el libro → Intenta explicarlo sin ver → Revisa lo que olvidaste

2. **Repetición espaciada:**
Repasar el material en intervalos cada vez más largos: hoy, mañana, en 3 días, en 1 semana. Tu cerebro retiene mejor con repasos espaciados que con maratones de estudio.

3. **Técnica Pomodoro:**
- Estudia 25 minutos con concentración total (sin celular)
- Descansa 5 minutos
- Repite 4 veces
- Después del 4° pomodoro, descansa 15-30 minutos
Funciona porque el cerebro mantiene la atención mejor en bloques cortos.

4. **Mapas mentales:**
Pon la idea central en el medio y conecta subtemas alrededor con líneas. Usa colores, dibujos y palabras clave. Excelente para temas con muchas conexiones.

5. **Técnica Feynman:**
Explica el tema como si se lo enseñaras a un niño de 10 años. Si no puedes explicarlo simple, no lo entiendes bien. Identifica los huecos y regresa al material.

**Técnicas que NO funcionan (aunque son populares):**
- Releer una y otra vez (ilusión de aprendizaje)
- Subrayar todo (si todo es importante, nada es importante)
- Copiar textualmente los apuntes
- Estudiar con música con letra (distrae)
- Maratones de estudio la noche antes del examen

**Ambiente de estudio ideal:**
- Lugar fijo y ordenado
- Buena iluminación
- Sin distracciones (celular en otra habitación o en modo avión)
- Agua a la mano
- Todo el material listo antes de empezar

---
**Videos recomendados:**
1. [Active Recall — la mejor técnica de estudio](https://www.youtube.com/results?search_query=Active+Recall+%E2%80%94+la+mejor+t%C3%A9cnica+de+estudio+bachillerato) — 14 min
2. [Técnica Pomodoro explicada](https://www.youtube.com/results?search_query=T%C3%A9cnica+Pomodoro+explicada+bachillerato) — 8 min
3. [Cómo estudiar de forma efectiva — basado en ciencia](https://www.youtube.com/results?search_query=C%C3%B3mo+estudiar+de+forma+efectiva+%E2%80%94+basado+en+ciencia+bachillerato) — 16 min
'),
('cc000004-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',4,'Gestión del tiempo y organización personal','Gestión del tiempo y organización personal','https://www.youtube.com/results?search_query=Gesti%C3%B3n+del+tiempo+%E2%80%94+la+Matriz+de+Eisenhower+bachillerato',66,'En la educación virtual, nadie administra tu tiempo por ti. Si no te organizas, el tiempo se va y las materias se acumulan.

**La Matriz de Eisenhower:**
Clasifica tus tareas en 4 cuadrantes:

|                | URGENTE           | NO URGENTE        |
|----------------|-------------------|-------------------|
| IMPORTANTE     | Hacer YA          | Planificar        |
| NO IMPORTANTE  | Delegar/rápido    | Eliminar          |

- Importante + Urgente: Examen mañana → hazlo ya
- Importante + No urgente: Estudiar para examen de la próxima semana → planifica cuándo
- No importante + Urgente: Mensaje de WhatsApp → responde rápido y sigue
- No importante + No urgente: Redes sociales → elimina o reduce

**Planificación semanal:**
1. Cada domingo, dedica 15 minutos a planificar tu semana
2. Escribe qué materias vas a estudiar cada día
3. Asigna horarios específicos (no ''cuando pueda'', sino ''lunes 7-8 PM'')
4. Incluye descansos y tiempo libre
5. Sé realista — no planees 6 horas de estudio si sabes que no las vas a cumplir

**Cómo vencer la procrastinación:**
- Regla de los 2 minutos: si algo toma menos de 2 minutos, hazlo ahora
- Regla de los 5 minutos: comprométete a estudiar solo 5 minutos. Una vez que empiezas, generalmente sigues.
- Divide tareas grandes en pasos pequeños
- Elimina tentaciones antes de empezar (celular fuera, redes sociales bloqueadas)
- Recompénsate después de completar una sesión de estudio

**Herramientas de organización:**
- Google Calendar: para agendar sesiones de estudio
- Todoist o Google Tasks: listas de pendientes
- Notion: organización completa (notas, calendarios, listas)
- Forest App: bloquea tu celular mientras estudias (gamificado)
- Alarmas del celular: recordatorios para estudiar

**Plantilla semanal sugerida para bachillerato virtual:**
Lunes a viernes: 1-2 horas de estudio
Sábado: repaso de la semana (1 hora)
Domingo: planificación de la semana siguiente (15 min) + descanso

---
**Videos recomendados:**
1. [Gestión del tiempo — la Matriz de Eisenhower](https://www.youtube.com/results?search_query=Gesti%C3%B3n+del+tiempo+%E2%80%94+la+Matriz+de+Eisenhower+bachillerato) — 10 min
2. [Cómo dejar de procrastinar — tips reales](https://www.youtube.com/results?search_query=C%C3%B3mo+dejar+de+procrastinar+%E2%80%94+tips+reales+bachillerato) — 14 min
3. [Cómo organizar tu semana de estudio](https://www.youtube.com/results?search_query=C%C3%B3mo+organizar+tu+semana+de+estudio+bachillerato) — 12 min
'),
('cc000005-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',5,'Motivación y disciplina en la educación a distancia','Motivación y disciplina en la educación a distancia','https://www.youtube.com/results?search_query=Motivaci%C3%B3n+vs+disciplina+%E2%80%94+qu%C3%A9+funciona+mejor+bachillerato',66,'La motivación te hace empezar. La disciplina te hace continuar. En la educación virtual necesitas ambas.

**Motivación intrínseca vs extrínseca:**
- Extrínseca: estudias por el título, por quedar bien, por presión familiar. Funciona a corto plazo.
- Intrínseca: estudias porque te interesa, porque quieres crecer, porque te da satisfacción personal. Es más duradera.

La meta es conectar con tu motivación intrínseca: ¿POR QUÉ decidiste estudiar el bachillerato? ¿Qué quieres lograr con esto?

**Cuando la motivación baja (y va a bajar):**

1. Recuerda tu ''para qué''. Escríbelo y ponlo donde lo veas todos los días.
2. Celebra los pequeños logros (terminar una semana, aprobar un examen).
3. No busques la perfección — busca el progreso.
4. Habla con alguien sobre cómo te sientes.
5. Date permiso de tener días malos — pero no te quedes ahí.

**La disciplina se construye con hábitos:**

Un hábito tiene 3 partes:
- Señal: lo que dispara la acción (ejemplo: alarma a las 7 PM)
- Rutina: la acción misma (sentarse a estudiar)
- Recompensa: lo que ganas (satisfacción, un snack, tiempo libre)

**Cómo crear el hábito de estudio:**
1. Empieza ridículamente pequeño (5 minutos)
2. Hazlo a la misma hora todos los días
3. Prepara todo antes (material, espacio, agua)
4. Nunca faltes dos días seguidos (un día malo es normal, dos es un patrón)
5. Después de 21-30 días se vuelve automático

**Mentalidad de crecimiento (Carol Dweck):**
- Mentalidad fija: ''No soy bueno para matemáticas'' → te rindes
- Mentalidad de crecimiento: ''Todavía no soy bueno para matemáticas'' → sigues intentando

La inteligencia no es fija. Tu cerebro es como un músculo: entre más lo ejercitas, más fuerte se hace. Cada vez que algo te cuesta trabajo y lo intentas, estás creando nuevas conexiones neuronales.

---
**Videos recomendados:**
1. [Motivación vs disciplina — qué funciona mejor](https://www.youtube.com/results?search_query=Motivaci%C3%B3n+vs+disciplina+%E2%80%94+qu%C3%A9+funciona+mejor+bachillerato) — 12 min
2. [Cómo crear hábitos que duren](https://www.youtube.com/results?search_query=C%C3%B3mo+crear+h%C3%A1bitos+que+duren+bachillerato) — 14 min
3. [Mentalidad de crecimiento — Carol Dweck](https://www.youtube.com/results?search_query=Mentalidad+de+crecimiento+%E2%80%94+Carol+Dweck+bachillerato) — 10 min
'),
('cc000006-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',6,'Herramientas digitales para el estudio','Herramientas digitales para el estudio','https://www.youtube.com/results?search_query=Mejores+apps+para+estudiar+%E2%80%94+todas+gratis+bachillerato',71,'La tecnología puede ser tu mejor aliada o tu peor distracción. Aquí te presento herramientas gratuitas que harán tu estudio más eficiente.

**Para tomar notas:**
- Google Docs: simple, colaborativo, en la nube
- Notion: organización completa (notas, bases de datos, calendarios)
- OneNote: de Microsoft, gratuito, organizado por cuadernos

**Para organización:**
- Google Calendar: agenda y recordatorios
- Todoist: listas de tareas con prioridades
- Trello: tableros visuales tipo Kanban (por hacer, en progreso, hecho)

**Para estudio y repaso:**
- Anki: tarjetas de memoria (flashcards) con repetición espaciada. Excelente para memorizar.
- Quizlet: flashcards más visuales y con juegos
- Khan Academy: videos y ejercicios de matemáticas, ciencias e inglés
- Duolingo: para practicar inglés diariamente

**Para concentración:**
- Forest App: planta un árbol virtual que crece mientras no tocas el celular
- Focus To-Do: combina Pomodoro con lista de tareas
- Brain.fm: música diseñada para concentración

**Para crear contenido:**
- Canva: diseño gráfico fácil (presentaciones, infografías)
- Google Slides: presentaciones en la nube
- MindMeister: mapas mentales digitales

**Para comunicación:**
- Gmail: correo formal
- WhatsApp: grupos de estudio (con moderación)
- Google Meet/Zoom: videollamadas si necesitas tutoría

**Tips para que la tecnología no te distraiga:**
- Bloquea notificaciones mientras estudias
- Usa extensiones como BlockSite para bloquear redes sociales en horario de estudio
- Pon el celular en otra habitación
- Usa el modo ''No molestar''
- Ten solo las pestañas necesarias abiertas en el navegador

---
**Videos recomendados:**
1. [Mejores apps para estudiar — todas gratis](https://www.youtube.com/results?search_query=Mejores+apps+para+estudiar+%E2%80%94+todas+gratis+bachillerato) — 14 min
2. [Cómo usar Anki para estudiar mejor](https://www.youtube.com/results?search_query=C%C3%B3mo+usar+Anki+para+estudiar+mejor+bachillerato) — 12 min
3. [Notion para estudiantes — tutorial](https://www.youtube.com/results?search_query=Notion+para+estudiantes+%E2%80%94+tutorial+bachillerato) — 15 min
'),
('cc000007-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',7,'Mi proyecto académico — metas y plan de acción','Mi proyecto académico — metas y plan de acción','https://www.youtube.com/results?search_query=C%C3%B3mo+establecer+metas+SMART+bachillerato',66,'Tener un plan claro multiplica tus posibilidades de éxito. Esta semana vas a construir tu proyecto académico personal.

**Metas SMART:**
Una buena meta debe ser:
- Specific (Específica): ¿Qué exactamente quieres lograr?
- Measurable (Medible): ¿Cómo sabrás que lo lograste?
- Achievable (Alcanzable): ¿Es realista?
- Relevant (Relevante): ¿Importa para tu vida?
- Time-bound (Con plazo): ¿Para cuándo?

MAL: ''Quiero terminar la prepa''
BIEN: ''Voy a completar mi bachillerato virtual de 6 meses aprobando todas las materias con mínimo 7.0 de promedio para diciembre de 2025''

**Tu proyecto académico debe incluir:**

1. **Mi motivación:** ¿Por qué estoy estudiando el bachillerato? ¿Qué quiero lograr después?

2. **Mi meta principal:** El bachillerato completo con [promedio] para [fecha].

3. **Metas mensuales:** Qué materias completaré cada mes.

4. **Mi horario de estudio:** Días y horas específicas.

5. **Mi sistema de apoyo:** ¿Quién me apoya? ¿A quién acudo si tengo problemas?

6. **Mis obstáculos posibles:** ¿Qué podría impedirme avanzar? ¿Cómo lo resuelvo?

7. **Mi recompensa:** ¿Cómo me voy a premiar al completar cada mes?

**Después del bachillerato — opciones:**
- Universidad (presencial o en línea)
- Carrera técnica
- Emprendimiento
- Empleo formal (muchos trabajos requieren bachillerato mínimo)
- Combinaciones: trabajar + estudiar

El bachillerato es la puerta. Lo que hay detrás de esa puerta lo decides tú.

**Dato motivador:** En México, una persona con bachillerato completo gana en promedio 35% más que alguien sin él. Con licenciatura, la diferencia sube a más del 80%.

---
**Videos recomendados:**
1. [Cómo establecer metas SMART](https://www.youtube.com/results?search_query=C%C3%B3mo+establecer+metas+SMART+bachillerato) — 10 min
2. [Cómo crear un plan de estudios personal](https://www.youtube.com/results?search_query=C%C3%B3mo+crear+un+plan+de+estudios+personal+bachillerato) — 12 min
3. [¿Qué estudiar después del bachillerato?](https://www.youtube.com/results?search_query=%C2%BFQu%C3%A9+estudiar+despu%C3%A9s+del+bachillerato%3F+bachillerato) — 14 min
'),
('cc000008-0000-4000-a000-000000000001','aa000000-0000-4000-a000-000000000001',8,'Repaso general y preparación para examen final','Repaso general y preparación para examen final','https://www.youtube.com/results?search_query=Repaso+de+habilidades+para+el+estudio+bachillerato',45,'Última semana. Repasa: las ventajas y retos del bachillerato virtual, los estilos de aprendizaje VARK, técnicas de estudio efectivas (Active Recall, Pomodoro, Feynman), gestión del tiempo con la Matriz de Eisenhower, la diferencia entre motivación y disciplina, las herramientas digitales para estudiar, y las metas SMART para tu proyecto académico.')
ON CONFLICT (id) DO NOTHING;

-- ── 4. EVALUACIÓN FINAL ──────────────────────────────────────────────────────
INSERT INTO public.evaluaciones (id, materia_id, mes_id, titulo, descripcion, tiempo_limite_minutos, intentos_permitidos, activa) VALUES (
  'bb000000-0000-4000-a000-000000000001', 'f0551b82-1c3e-4286-bfb4-878842bc6eff', 'aa000000-0000-4000-a000-000000000001',
  'Examen Final — Tutoría de Ingreso I',
  'Evalúa lo aprendido sobre habilidades de estudio, técnicas, gestión del tiempo y herramientas digitales.',
  30, 3, true
) ON CONFLICT (id) DO NOTHING;

-- ── 5. PREGUNTAS ─────────────────────────────────────────────────────────────
INSERT INTO public.preguntas (id, evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden) VALUES
('dd000001-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Cuál es la principal ventaja del bachillerato virtual?','Es más fácil que el presencial','Tiene flexibilidad de horarios y acceso 24/7','No tiene exámenes','No requiere estudiar','b',1),
('dd000002-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Verdadero o Falso? Una persona con estilo de aprendizaje auditivo aprende mejor con diagramas y mapas mentales.','Verdadero','Falso','—','—','b',2),
('dd000003-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','La técnica Pomodoro consiste en estudiar bloques de:','10 minutos con 2 de descanso','25 minutos con 5 de descanso','45 minutos con 15 de descanso','60 minutos con 10 de descanso','b',3),
('dd000004-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Qué es el ''Active Recall'' (Recuerdo activo)?','Releer el material muchas veces','Cerrar el material e intentar recordar sin ver','Subrayar las ideas importantes','Copiar textualmente los apuntes','b',4),
('dd000005-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Verdadero o Falso? Subrayar todo el texto es una técnica de estudio muy efectiva.','Verdadero','Falso','—','—','b',5),
('dd000006-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','En la Matriz de Eisenhower, una tarea IMPORTANTE pero NO URGENTE se debe:','Hacer inmediatamente','Planificar para después','Eliminar','Delegar a alguien más','b',6),
('dd000007-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Cuál es la diferencia entre motivación y disciplina?','Son lo mismo','La motivación te hace empezar, la disciplina te hace continuar','La disciplina es para el trabajo, la motivación para el estudio','La motivación es más importante que la disciplina','b',7),
('dd000008-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Verdadero o Falso? Un hábito generalmente se forma después de 21-30 días de repetición consistente.','Verdadero','Falso','—','—','a',8),
('dd000009-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Qué es la ''mentalidad de crecimiento'' de Carol Dweck?','Creer que la inteligencia es fija y no cambia','Creer que puedes mejorar tus habilidades con esfuerzo y práctica','Pensar que solo los genios tienen éxito','Crecer físicamente durante la adolescencia','b',9),
('dd000010-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Qué herramienta usa tarjetas de memoria (flashcards) con repetición espaciada?','Google Docs','Canva','Anki','Trello','c',10),
('dd000011-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Verdadero o Falso? La técnica Feynman consiste en explicar un tema como si se lo enseñaras a un niño.','Verdadero','Falso','—','—','a',11),
('dd000012-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','Una meta SMART debe ser específica, medible, alcanzable, relevante y:','Total','Técnica','Con plazo definido (Time-bound)','Teórica','c',12),
('dd000013-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Cuál es el principal enemigo de la concentración al estudiar en línea?','Los libros','Las distracciones digitales (celular, redes sociales)','La falta de libros físicos','El horario de clases','b',13),
('dd000014-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','¿Verdadero o Falso? En la educación virtual, la responsabilidad del aprendizaje es 100% del alumno.','Verdadero','Falso','—','—','a',14),
('dd000015-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','Si un día no tienes ganas de estudiar, ¿qué es lo mejor que puedes hacer?','No estudiar y esperar a que regrese la motivación','Comprometerte a solo 5 minutos y empezar','Estudiar 4 horas para compensar','Dejar la materia para el mes siguiente','b',15)
ON CONFLICT (id) DO NOTHING;
