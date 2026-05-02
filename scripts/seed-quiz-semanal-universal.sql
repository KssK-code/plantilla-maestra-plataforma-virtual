-- =============================================================
-- SEED UNIVERSAL QUIZ_SEMANA — MEV Plataforma Virtual
-- =============================================================
-- 576 preguntas pedagógicas (3 por semana × 8 semanas × 24 materias)
-- Distribución balanceada: exactamente 6/6/6/6 por materia (25% cada opción)
--
-- Cadena de match (3 niveles):
--   materias.nombre + materias.nivel + semanas.numero_semana
--   JOIN: materias → meses_contenido → semanas → quiz_semana
--
-- Filtra por nivel para evitar colisión de nombres entre niveles.
--
-- Si una semana no existe en la BD, imprime aviso y se salta.
-- Idempotente: borra preguntas previas de la semana antes de insertar.
--
-- Cobertura:
--   - Preparatoria: 12 materias × 8 semanas = 288 preguntas
--   - Secundaria:   12 materias × 8 semanas = 288 preguntas
--   - Demo:         NO TOCA (gestionada por seed-demo-materia.sql)
--
-- Requisitos schema (ya en plantilla maestra):
--   - quiz_semana.opcion_d TEXT
--   - constraint respuesta_correcta IN ('a','b','c','d')
-- =============================================================

BEGIN;

-- ----------- Comprensión lectora I (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la lectura crítica?', 'Memorizar el texto', 'Un proceso activo de análisis donde el lector evalúa argumentos, identifica sesgos, distingue hechos de opiniones y construye su propia interpretación', 'Leer en voz alta', 'Solo leer rápido', 'b', 1, 'La lectura crítica va más allá de comprender literal: cuestiona, evalúa fuentes, identifica intenciones del autor y construye interpretación informada. Es habilidad fundamental para no ser víctima de desinformación.'),
      (v_semana_id, '¿Por qué es importante distinguir hechos de opiniones?', 'Porque los hechos son verificables y objetivos, mientras las opiniones son subjetivas; mezclarlos lleva a aceptar afirmaciones sin sustento', 'Solo en clases', 'Solo cuando contradicen lo que pensamos', 'No tiene importancia', 'a', 2, 'Los hechos son comprobables ("Newton publicó Principia en 1687"). Las opiniones reflejan perspectivas ("la teoría de Newton es la más elegante"). Confundirlos permite manipulación; distinguirlos protege el pensamiento crítico.'),
      (v_semana_id, 'Si lees un artículo donde el autor cita solo fuentes que apoyan su tesis e ignora estudios contrarios, ¿qué identificas?', 'Sesgo de confirmación: presentación parcial que selecciona evidencia favorable, comprometiendo la objetividad', 'Estilo impecable', 'Texto neutral', 'Buena investigación', 'a', 3, 'El sesgo de confirmación distorsiona la realidad mostrando solo un lado. Lectores críticos buscan textos que reconozcan complejidades, citen fuentes diversas y consideren contraargumentos antes de concluir.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué hacer al leer un texto académico difícil?', 'Rendirse pronto', 'Solo leer las primeras líneas', 'Leerlo varias veces, subrayar ideas clave, hacer mapas conceptuales, buscar palabras desconocidas, resumir cada sección y discutirlo con alguien', 'Memorizar palabras', 'c', 1, 'La comprensión profunda requiere estrategias activas: relectura, anotaciones, organización gráfica de ideas, vocabulario nuevo, síntesis personal y conversación. Es proceso, no acto único.'),
      (v_semana_id, '¿Qué son las inferencias en lectura?', 'Resúmenes literales', 'Citas directas', 'Información explícita', 'Conclusiones que el lector extrae integrando información del texto con sus conocimientos previos, aunque no estén dichas literalmente', 'd', 2, 'Inferir es leer entre líneas: conectar pistas del texto con saberes propios para deducir lo no dicho. Si un texto dice "Pedro caminó bajo la lluvia y llegó empapado", inferimos que no llevaba paraguas.'),
      (v_semana_id, '¿Cómo mejorar tu vocabulario para leer mejor?', 'Leer libros nuevos en general', 'Solo leer en voz alta', 'Leer diversos géneros, anotar palabras desconocidas, usar diccionario, deducir por contexto, buscar etimologías, usar palabras nuevas al hablar/escribir', 'Memorizar listas', 'c', 3, 'El vocabulario crece con exposición y uso activo. Leer textos diversos expone a vocabulario nuevo en contextos. Anotarlas, buscarlas y usarlas las consolida. La etimología revela conexiones útiles entre palabras.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza a un texto científico?', 'Solo opiniones', 'Narrativa fantástica', 'Lenguaje emotivo', 'Lenguaje preciso, objetivo, terminología técnica, estructura clara (introducción-método-resultados-discusión), citas a investigaciones previas y enfoque verificable', 'd', 1, 'Los textos científicos buscan transmitir conocimiento con máxima objetividad y precisión. Su estructura permite a otros verificar, replicar o cuestionar los hallazgos. Es fundamento del avance científico.'),
      (v_semana_id, '¿Cuál es el propósito del texto literario?', 'Únicamente persuadir', 'Crear experiencia estética y emocional, explorar la condición humana mediante ficción o poesía, suscitar reflexión y placer estético', 'Dar instrucciones', 'Solo informar', 'b', 2, 'La literatura no busca solo informar: provoca emociones, expande horizontes, permite vivir vidas ajenas, juega con el lenguaje. Su valor radica en el efecto estético y la exploración de lo humano.'),
      (v_semana_id, '¿Cómo identificar un texto periodístico de opinión?', 'Solo si es muy largo', 'No se puede distinguir', 'Por su estructura argumentativa, expresión de juicios del autor, identificación clara como "opinión" o "editorial", separación de notas informativas neutrales', 'Por estar en periódico', 'c', 3, 'Los medios serios distinguen entre noticias (información objetiva, reportaje neutral) y opinión (editorial, columnas, análisis con punto de vista). Distinguirlas evita confundir hechos con interpretaciones del periodista.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es el contexto de un texto y por qué importa?', 'No tiene importancia', 'Solo el formato visual', 'Solo el lugar donde se lee', 'Las circunstancias históricas, sociales, culturales y biográficas en que se produjo y circula; importa porque influye en su significado e interpretación', 'd', 1, 'Un texto sobre racismo escrito en 1950 vs. 2025 tendrá significados distintos por su contexto. Conocer época, autor, audiencia original y circunstancias enriquece la interpretación y evita anacronismos.'),
      (v_semana_id, '¿Qué es la connotación en el lenguaje?', 'Los significados secundarios, emocionales o asociativos que una palabra evoca más allá de su definición literal (denotación)', 'Solo errores ortográficos', 'Sinónimo perfecto', 'El significado del diccionario', 'a', 2, 'Denotación: el sentido literal ("zorro" = mamífero). Connotación: asociaciones culturales ("zorro" = astuto). Saber leer connotaciones permite captar matices, ironía, intenciones del autor y sutilezas del lenguaje.'),
      (v_semana_id, 'Al analizar un texto persuasivo (ej. discurso político), ¿qué debes identificar?', 'Tesis del autor, argumentos usados, evidencias presentadas, recursos retóricos (apelación a emociones, autoridad), posibles falacias, contexto e intereses involucrados', 'Solo el tono', 'Únicamente la longitud', 'Solo si te gusta', 'a', 3, 'Los textos persuasivos requieren análisis riguroso: ¿qué quiere convencerte? ¿con qué argumentos y datos? ¿qué emociones apela? ¿quién se beneficia si crees? Esto evita manipulación y promueve ciudadanía crítica.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué características distinguen la lectura digital de la impresa?', 'Son idénticas', 'Lectura digital incluye hipervínculos, multimedia, lectura no lineal, posibilidad de búsqueda, distracciones múltiples y formatos variables', 'Solo cambia el soporte', 'La digital es más fácil siempre', 'b', 1, 'La lectura digital es no lineal (saltos por hipervínculos), multimedia (video+texto+imagen), interactiva, pero también más distractora. Requiere habilidades específicas: filtrar, evaluar fuentes, mantener foco.'),
      (v_semana_id, '¿Cómo evaluar fuentes en internet?', 'Si aparecen primero en Google son confiables', 'Verificando autoría, fecha, dominio (.edu, .gov, .org suelen ser más confiables), presencia de sesgos comerciales, contraste con otras fuentes, ortografía y profesionalismo', 'Solo si tienen muchas visitas', 'Si están en redes sociales', 'b', 2, 'Internet contiene información de calidad mezclada con desinformación. Criterios: ¿quién lo escribe? ¿está actualizado? ¿qué dominio? ¿cita fuentes verificables? ¿hay intereses ocultos? Cruzar información con varias fuentes confiables es clave.'),
      (v_semana_id, '¿Qué desafíos presenta el exceso de información (infoxicación)?', 'Solo afecta a adultos mayores', 'Beneficia a todos siempre', 'No hay desafíos', 'Dificulta filtrar contenido relevante, satura cognitivamente, fomenta lecturas superficiales, alimenta cámaras de eco y dificulta concentración profunda', 'd', 3, 'La sobreabundancia de información puede paralizar más que ayudar. Genera fatiga, lectura fragmentada, exposición a desinformación y burbujas algorítmicas. Habilidades de filtrado y atención profunda son contrarrestantes esenciales.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué beneficios tiene el hábito lector consistente?', 'Mejora vocabulario, comprensión, pensamiento crítico, empatía, concentración, salud mental, desempeño académico y comprensión de la diversidad humana', 'Solo placer pasajero', 'Únicamente memoria', 'Pasatiempo sin más', 'a', 1, 'Estudios muestran que lectores frecuentes tienen mejor cognición, empatía (ficción literaria), reducción de estrés, vocabulario más amplio y mejor desempeño académico/profesional. Es de los hábitos más rentables.'),
      (v_semana_id, '¿Cómo desarrollar hábito lector si no leíste mucho antes?', 'Leer solo lo obligatorio', 'Esperar inspiración', 'Intentar libros muy largos', 'Empezar con lecturas atractivas (de interés personal), establecer momentos fijos del día, espacios cómodos, metas pequeñas alcanzables, no obligarte a terminar lo que no enganche', 'd', 2, 'El hábito se construye con consistencia y placer. Comenzar con géneros que disfrutes, leer 15-30 min diarios en horario fijo, abandonar libros que no enganchen (sin culpa), variar formatos. La constancia genera el gusto.'),
      (v_semana_id, '¿Qué tipos de textos deben combinarse para una formación lectora completa?', 'Solo poesía', 'Literatura (clásicos y contemporáneos), ensayo, periodismo serio, divulgación científica, biografías, historia, y textos de tu campo profesional/académico', 'Solo novelas', 'Únicamente informes', 'b', 3, 'Lector formado consume diversidad: ficción para empatía y placer, ensayo para pensamiento, periodismo para actualidad, ciencia para comprensión del mundo, historia para perspectiva. Cada género desarrolla músculos lectores distintos.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué relación hay entre lectura y aprendizaje?', 'No están relacionados', 'La lectura es la principal vía de acceso autónomo al conocimiento; quien lee mejor aprende más en cualquier disciplina y desarrolla pensamiento autónomo', 'Solo importan las clases', 'Solo la práctica enseña', 'b', 1, 'Aprender requiere acceso a información estructurada. La lectura permite explorar temas sin depender de profesores, profundizar a propio ritmo, contrastar fuentes y desarrollar criterio propio. Es base de la autoformación.'),
      (v_semana_id, '¿Cómo tomar notas efectivas mientras lees para estudiar?', 'Identificar ideas principales, parafrasearlas con tus propias palabras, conectarlas entre sí (mapas), formular preguntas, marcar dudas, sintetizar al final', 'Solo subrayar', 'No es necesario', 'Copiar textualmente todo', 'a', 2, 'La toma de notas activa procesa información en lugar de copiarla. Métodos como Cornell, mapas conceptuales, técnicas de Feynman (explicar con tus palabras) consolidan el aprendizaje y facilitan repasos.'),
      (v_semana_id, '¿Por qué releer puede ser tan importante como leer por primera vez?', 'Solo si olvidaste el texto', 'No tiene caso', 'Cada relectura revela nuevas capas de significado, conecta con conocimientos posteriores, profundiza comprensión y permite descubrir matices iniciales pasados por alto', 'Solo en libros cortos', 'c', 3, 'Los grandes textos resisten múltiples lecturas. Lo que parecía obvio puede revelarse complejo; lo confuso, claro. La relectura, especialmente con experiencia acumulada, genera lecturas más ricas e interpretaciones nuevas.');
  END IF;
END $$;

-- ----------- Comprensión lectora I (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comprensión lectora I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comprensión lectora I" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué define a un lector competente del siglo XXI?', 'Leer mucho rápido', 'Solo leer libros de moda', 'Capacidad de leer críticamente diversos textos (papel y digital), evaluar fuentes, comprender lo no dicho, integrar conocimientos, distinguir hechos de opiniones y dialogar con lo leído', 'Memorizar lecturas escolares', 'c', 1, 'El lector competente actual no solo decodifica: navega entre formatos, filtra información, contrasta, interpreta y aplica lo leído. Es lectura activa, crítica, plural y vinculada al pensamiento autónomo.'),
      (v_semana_id, '¿Cómo se relaciona la lectura con la ciudadanía democrática?', 'Solo importa el voto', 'No tienen relación', 'Solo políticos necesitan leer', 'Una ciudadanía informada y crítica solo es posible con lectura competente: leer leyes, programas políticos, prensa diversa, análisis y propuestas; sin ella la democracia se debilita', 'd', 2, 'Decisiones democráticas conscientes requieren información compleja. Quien no lee críticamente queda a merced de propaganda, redes sociales superficiales o manipulación. La lectura sostiene la ciudadanía activa.'),
      (v_semana_id, '¿Qué te llevarás de este curso para tu vida?', 'Olvidar todo después del examen', 'Solo aprobar la materia', 'Hábitos lectores fortalecidos, herramientas para leer críticamente cualquier texto, capacidad de aprender por cuenta propia, pensamiento más estructurado y placer renovado por la lectura', 'Memorizar fechas', 'c', 3, 'La verdadera ganancia de la materia no es aprobarla sino integrar lectura crítica como herramienta vital. Estudiantes con buenos hábitos lectores rinden mejor en otras materias y enfrentan la vida adulta con más recursos.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué cambios introdujo la era digital en la comunicación humana?', 'Comunicación instantánea global, multimodalidad (texto+imagen+video), audiencias masivas, asincronía, permanencia, redes descentralizadas y nuevos códigos (emojis, memes)', 'Solo cambió la velocidad', 'Eliminó la comunicación cara a cara', 'Ninguno significativo', 'a', 1, 'La revolución digital transformó cómo nos comunicamos: ya no necesitamos estar en el mismo tiempo o espacio, podemos llegar a millones, combinar formatos y crear nuevos códigos. También trae retos: superficialidad, desinformación, sobrecarga.'),
      (v_semana_id, '¿Cuál es la diferencia entre comunicación sincrónica y asincrónica?', 'La sincrónica ocurre en tiempo real (videollamada, llamada); la asincrónica permite responder cuando puedas (email, mensajes diferidos)', 'Solo la sincrónica es válida', 'La asincrónica es solo escrita', 'No hay diferencia', 'a', 2, 'Sincrónica: presente y otros conectados (Zoom, llamadas). Asincrónica: cada quien participa cuando puede (correo, foros). Cada modalidad tiene ventajas: la sincrónica es inmediata, la asincrónica permite reflexión.'),
      (v_semana_id, '¿Por qué es importante adaptar el registro al canal de comunicación?', 'Es lo mismo en todos los canales', 'No es importante', 'Cada canal (correo formal, WhatsApp, presentación) tiene normas y expectativas; usar el registro inadecuado genera malentendidos o juicios negativos', 'Solo en trabajos formales', 'c', 3, 'Un mensaje al jefe no se escribe igual que al amigo. Saber adaptar el registro (formal/informal, técnico/coloquial, conciso/elaborado) según contexto es competencia comunicativa esencial en todo ámbito profesional y social.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué plataformas son apropiadas para comunicación profesional?', 'Solo SMS', 'Solo redes sociales personales', 'Correo electrónico, LinkedIn, Slack, Microsoft Teams, Zoom, herramientas de gestión de proyectos como Trello o Asana', 'Solo TikTok', 'c', 1, 'El entorno profesional usa herramientas específicas. El correo sigue siendo formal por excelencia; LinkedIn para networking; Slack/Teams para equipos; Zoom para reuniones; gestores de proyectos para coordinación.'),
      (v_semana_id, '¿Qué características debe tener un correo electrónico profesional?', 'Solo emojis', 'Texto extenso sin estructura', 'Mensaje sin estructura', 'Asunto claro, saludo apropiado, mensaje conciso pero completo, despedida cortés, firma con datos de contacto, ortografía cuidada y archivos adjuntos referenciados', 'd', 2, 'Un correo profesional comunica eficientemente. Asunto descriptivo (no "Hola"), apertura adecuada, contenido organizado, cierre cortés y firma. Revisar ortografía es esencial: refleja seriedad y atención al detalle.'),
      (v_semana_id, '¿Cómo conducir una videollamada profesional efectiva?', 'Estar en cualquier ambiente', 'Conectarse de cualquier forma', 'Probar tecnología antes, lugar bien iluminado y silencioso, cámara a la altura de los ojos, atención plena (sin distractores), comunicación clara, respeto de turnos y manejo del tiempo', 'Solo importa el contenido', 'c', 3, 'Las videollamadas profesionales requieren preparación técnica (audio/video probados), entorno adecuado, atención completa (no multitarea), expresión clara, escucha activa y respeto del tiempo de los participantes.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué características debe tener un texto digital efectivo?', 'Solo emojis', 'Texto extenso sin pausa', 'Solo títulos llamativos', 'Claridad, concisión, párrafos cortos, jerarquía visual (subtítulos, viñetas), llamadas a la acción claras, palabras clave si aplica SEO, adaptado al dispositivo móvil', 'd', 1, 'La lectura digital es diferente: escaneo más que lectura lineal. Textos efectivos usan estructura visual clara, oraciones breves, jerarquía con subtítulos, viñetas y elementos visuales que faciliten la comprensión rápida.'),
      (v_semana_id, '¿Por qué la concisión es crucial en comunicación digital?', 'No es importante', 'Solo en mensajes de texto', 'Solo es preferencia estética', 'Por la sobrecarga de información, atención fragmentada y predominio de dispositivos móviles; mensajes claros y breves comunican mejor que extensos', 'd', 2, 'Los usuarios digitales tienen atención limitada y muchas opciones. Comunicar una idea en pocas palabras (sin sacrificar precisión) capta y retiene atención. La verbosidad pierde lectores y disuade.'),
      (v_semana_id, 'Al escribir para redes sociales, ¿qué consideraciones son clave?', 'No requieren consideraciones', 'Audiencia objetivo, plataforma específica (cada una con su lógica), tono apropiado, recursos visuales que complementen, llamadas a la acción y consciencia de que será público y permanente', 'Escribir lo mismo en todas', 'Solo importa cantidad', 'b', 3, 'Cada red social tiene su lógica: Instagram visual, Twitter/X breve, LinkedIn profesional, TikTok video corto. Adaptar contenido a cada plataforma maximiza alcance e impacto. Recordar que es público y permanente afecta cómo escribes.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es contenido multimedia?', 'Solo videos', 'Materiales que combinan diferentes formatos (texto, imagen, audio, video, animación) para comunicar de forma rica e integrada', 'Únicamente texto', 'Solo imágenes', 'b', 1, 'Multimedia integra múltiples formatos. Una infografía combina texto, datos visuales y diseño. Un video con subtítulos combina audio, imagen, texto. Tutoriales mezclan voz, video, capturas de pantalla. Mejora comprensión y engagement.'),
      (v_semana_id, '¿Qué hace efectivo a un video corto?', 'Solo el guion importa', 'Solo duración larga', 'Apertura impactante (hook), mensaje claro y enfocado, ritmo dinámico, calidad técnica básica, audio claro, llamado a la acción y adaptación al formato (vertical para móvil)', 'Múltiples temas a la vez', 'c', 2, 'Los videos cortos exitosos enganchan en los primeros 3 segundos, comunican una idea central, mantienen ritmo, suenan bien. Producción técnica buena (no perfecta) pero contenido sólido vence a producción perfecta sin sustancia.'),
      (v_semana_id, '¿Por qué cuidar la calidad de imagen y sonido en producciones digitales?', 'Es solo lujo', 'Una calidad técnica básica genera credibilidad, mantiene atención, refleja profesionalismo y respeto por la audiencia; calidad pobre puede desviar la atención del mensaje', 'Solo importa el contenido', 'Es responsabilidad solo de profesionales', 'b', 3, 'No se necesitan equipos costosos pero sí cuidar audio claro (lo más crítico), iluminación, encuadre. Audio pobre o imagen oscura disuaden incluso con contenido valioso. Móviles modernos permiten producción aceptable con técnica.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la ética digital?', 'Solo cumplir leyes', 'Conjunto de principios que guían el comportamiento responsable en entornos digitales: respeto, veracidad, privacidad, propiedad intelectual y consideración del impacto sobre otros', 'Reglas de programación', 'Solo aplica a empresas', 'b', 1, 'La ética digital aplica valores universales (respeto, honestidad, no daño) al espacio virtual. Implica respetar privacidad, dar crédito, no propagar desinformación, no acosar, considerar consecuencias de lo publicado.'),
      (v_semana_id, '¿Qué responsabilidades tienes al compartir información en redes?', 'Ninguna', 'Solo si te pagan', 'Verificar antes de compartir, citar fuentes, no propagar desinformación, respetar privacidad ajena, no incitar al odio, considerar el impacto en personas o grupos involucrados', 'Compartir todo lo que parezca interesante', 'c', 2, 'Compartir es replicar y amplificar. La responsabilidad ética implica verificar veracidad antes de difundir, dar crédito a creadores originales, no exponer información ajena sin permiso, evitar contenido que dañe individuos o grupos.'),
      (v_semana_id, '¿Cómo manejar conflictos o desacuerdos en línea con respeto?', 'Insultar al otro', 'Mantener foco en argumentos no en personas, escuchar activamente, evitar caer en provocaciones, distinguir desacuerdo respetuoso de ataque, retirarse cuando no se progresa', 'Bloquear inmediatamente', 'Borrar y olvidar', 'b', 3, 'El debate constructivo en línea ataca ideas no personas, busca entender antes de refutar, evita el sarcasmo destructivo, reconoce buenos puntos del otro y se retira de discusiones improductivas. La civilidad enriquece el ecosistema digital.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la identidad digital?', 'Imagen y reputación que construyes en internet a través de publicaciones, interacciones, comentarios, fotos, datos visibles y huella digital acumulada', 'Solo tu foto de perfil', 'Algo que se cambia fácil', 'Solo tu nombre de usuario', 'a', 1, 'Tu identidad digital es la suma de cómo te ven en línea: lo que publicas, dónde estás presente, cómo interactúas. Es relativamente permanente y consultable; empleadores, universidades y nuevas conexiones la revisan.'),
      (v_semana_id, '¿Por qué cuidar tu marca personal en línea?', 'No es relevante', 'Solo para influencers', 'Solo si eres famoso', 'Tu presencia digital influye en oportunidades académicas, laborales, profesionales y sociales; una imagen coherente y profesional abre puertas, una descuidada puede cerrarlas', 'd', 2, 'Reclutadores buscan candidatos en LinkedIn y redes. Universidades revisan presencia online. Una marca personal cuidada (publicar contenido relevante, mostrar habilidades, lenguaje profesional) genera oportunidades; lo contrario las restringe.'),
      (v_semana_id, '¿Qué consideraciones tener al construir una marca personal?', 'Definir qué proyectas (profesional, valores, intereses), separar contenido público/privado, ser auténtico pero estratégico, demostrar habilidades con contenido propio, mantener coherencia entre plataformas', 'Imitar a otros', 'Mostrar solo logros', 'Mostrar todo', 'a', 3, 'Marca personal efectiva tiene propósito claro, audiencia objetivo, contenido valioso (no solo autopromoción), autenticidad. Construirla requiere consistencia, calidad sobre cantidad y comprensión de qué quieres ser asociado profesionalmente.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la comunicación intercultural en el entorno digital?', 'Es como cualquier comunicación', 'No existe', 'Es interacción entre personas de diferentes culturas a través de medios digitales, requiriendo sensibilidad a diferencias en idiomas, costumbres, valores, humor y formas de expresar respeto', 'Solo aplica a turistas', 'c', 1, 'Internet conecta culturas. Lo que es educado en una cultura puede ser rudo en otra; el humor varía; los gestos significan distinto. Saber comunicar interculturalmente requiere humildad, curiosidad, evitar suposiciones y aprender de los errores.'),
      (v_semana_id, '¿Cómo comunicarte efectivamente con personas de otras culturas en línea?', 'Asumir que piensan como tú', 'Investigar normas culturales básicas, ser explícito y claro (menos asumido), preguntar cuando dudes, paciencia con diferencias, evitar humor que no se traduzca, respetar tiempo y formato preferido', 'Solo en inglés', 'Evitar el contacto', 'b', 2, 'La comunicación intercultural requiere mente abierta y preparación: conocer básicos de la cultura del otro, evitar modismos locales o humor cultural-específico, preguntar para clarificar, respetar tiempos y estilos diferentes. Errores son parte del aprendizaje.'),
      (v_semana_id, '¿Por qué dominar inglés y otras lenguas amplía oportunidades digitales?', 'Solo importa el español', 'Las traducciones automáticas son suficientes', 'No las amplía', 'El inglés es lengua franca de internet, ciencia y negocios; otras lenguas abren mercados específicos y profundizan conexiones; el multilingüismo es ventaja competitiva real en la era global', 'd', 3, 'Aunque traducción automática mejora, dominar inglés u otras lenguas permite conexiones profundas, acceso directo a información primaria, oportunidades laborales globales, comprensión de matices culturales. Es de las inversiones más valiosas.');
  END IF;
END $$;

-- ----------- Comunicación digital (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Comunicación digital'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Comunicación digital" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué habilidades comunicativas digitales son esenciales para tu futuro?', 'Únicamente memes', 'Solo escribir tweets', 'Solo dominio técnico', 'Redacción clara y profesional, oratoria virtual, producción multimodal básica, adaptación a plataformas, ética digital, comunicación intercultural y aprendizaje continuo', 'd', 1, 'Tu futuro profesional requerirá comunicar en múltiples formatos: emails, presentaciones virtuales, posts profesionales, videos breves, reuniones online. Ser versátil, ético y adaptativo es competencia transversal a cualquier carrera.'),
      (v_semana_id, '¿Cómo balancear vida online y offline?', 'Establecer límites de tiempo, momentos sin pantallas (comidas, antes de dormir), priorizar relaciones presenciales, ser consciente del impacto emocional, usar tecnología con propósito no compulsivamente', 'No requiere balance', 'Eliminar lo digital', 'Vivir solo en línea', 'a', 2, 'El equilibrio digital implica autoconciencia y autorregulación: usar tecnología cuando agrega valor, desconectar para descansar y conectar con personas físicamente, dormir sin pantalla, hacer ejercicio, mantener hobbies offline. Beneficia salud mental y rendimiento.'),
      (v_semana_id, '¿Qué legado positivo puedes construir con tu comunicación digital?', 'Compartir conocimiento útil, apoyar causas justas, conectar personas, crear contenido inspirador, modelar diálogo respetuoso, denunciar injusticias y aportar al bien común desde tu campo de interés', 'Solo si eres famoso', 'Solo entretener', 'No es posible', 'a', 3, 'Cada persona en línea contribuye a construir el ecosistema digital. Puedes ser parte del problema (desinformación, agresión) o solución (información veraz, diálogo, creación de valor). Tu comunicación tiene impacto, úsalo conscientemente.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué diferencia el pensamiento algebraico del aritmético?', 'Son lo mismo', 'El algebraico generaliza relaciones usando símbolos (variables) para representar cualquier número, mientras el aritmético opera con números específicos', 'El aritmético es más complejo', 'Solo cambia el nombre', 'b', 1, 'La aritmética calcula casos específicos (3+5=8). El álgebra generaliza (a+b=c describe la suma de cualquier par de números). Esta abstracción es base de la matemática avanzada y de modelar fenómenos.'),
      (v_semana_id, '¿Cómo se simplifica la expresión 3(x + 4) - 2x?', '3x + 12 - 2x = x + 12', '3x - 4', '5x + 4', 'No se puede simplificar', 'a', 2, 'Aplicando propiedad distributiva: 3(x+4) = 3x + 12. Luego restando 2x: 3x + 12 - 2x = x + 12. La distributividad y combinación de términos semejantes son herramientas algebraicas básicas.'),
      (v_semana_id, '¿Por qué es importante dominar el álgebra básica?', 'Solo en universidad', 'Solo para resolver ejercicios', 'Es fundamento de matemáticas avanzadas (cálculo, estadística), modelado de fenómenos en ciencias, finanzas, programación e ingeniería; sin álgebra muchas disciplinas se cierran', 'No tiene utilidad real', 'c', 3, 'El álgebra es lenguaje universal para describir relaciones cuantitativas. Aparece en física (fórmulas), economía (modelos), informática (algoritmos), química (estequiometría). Quien la domina tiene acceso a innumerables campos.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Resuelve: 2x - 7 = 3x + 2', 'x = 5', 'x = -9', 'x = 9', 'x = -5', 'b', 1, 'Restando 2x ambos lados: -7 = x + 2. Restando 2: -9 = x. Verificación: 2(-9) - 7 = -25, y 3(-9) + 2 = -25 ✓. Las ecuaciones se resuelven aplicando operaciones inversas a ambos lados.'),
      (v_semana_id, '¿Qué representa una inecuación como x > 5?', 'Cualquier número', 'Un solo valor de x', 'Todos los valores reales mayores que 5 (excluyendo el 5)', 'Solo el número 5', 'c', 2, 'Las inecuaciones definen conjuntos de soluciones, no valores únicos. x > 5 es el conjunto (5, ∞), excluyendo 5. Si fuera x ≥ 5, incluiría 5. Aparecen en problemas de optimización y restricciones.'),
      (v_semana_id, 'Si una empresa quiere ganancias mayores a $10,000 y su ganancia es G = 50x - 2000 (donde x es unidades vendidas), ¿qué inecuación resolver?', '50x = 10000, dando x = 200', '50x - 2000 = 10000, dando x = 240', '50x - 2000 > 10000, dando x > 240', 'No se puede plantear', 'c', 3, 'La condición "ganancias mayores a $10,000" es G > 10000, es decir 50x - 2000 > 10000. Resolviendo: 50x > 12000, x > 240. Deben vender más de 240 unidades. Las inecuaciones modelan condiciones del mundo real.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una función matemáticamente?', 'Una operación cualquiera', 'Una relación que asigna a cada elemento de un conjunto (dominio) exactamente un elemento de otro (codominio)', 'Solo una fórmula', 'Una ecuación', 'b', 1, 'Una función es regla que asigna un único valor de salida a cada entrada. Si f(x)=x+1, para x=2 hay un único f(2)=3. La unicidad es esencial: una entrada no puede dar dos salidas en una función.'),
      (v_semana_id, 'Si f(x) = x² - 3x + 2, ¿cuánto vale f(2)?', '2', '4', '6', '0', 'd', 2, 'Sustituyendo x=2: f(2) = 2² - 3(2) + 2 = 4 - 6 + 2 = 0. Evaluar funciones consiste en reemplazar la variable y simplificar siguiendo orden de operaciones. Práctica esencial para análisis de funciones.'),
      (v_semana_id, '¿Qué tipo de función modela mejor el costo total C de comprar x kilos de tomates a $25 c/u más $50 fijos?', 'Exponencial: C = 25^x', 'No se puede modelar', 'Cuadrática: C = 25x²', 'Lineal: C = 25x + 50', 'd', 3, 'Costo crece linealmente con x: por cada kilo más sumas 25 al total, partiendo de 50 fijos. C = 25x + 50 (donde 25 es la pendiente y 50 la ordenada al origen). Modelado correcto permite predecir y optimizar.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué información proporciona la pendiente de una recta?', 'La razón de cambio: cuánto cambia y por cada unidad que cambia x; indica inclinación y dirección (positiva sube, negativa baja, cero plana)', 'Solo el corte con el eje y', 'Su grosor', 'Su largo total', 'a', 1, 'Pendiente = cambio en y / cambio en x. Es velocidad de cambio. En contextos: precio por unidad, velocidad constante, crecimiento por mes. Permite predecir y comparar tasas en distintos contextos.'),
      (v_semana_id, 'Encuentra la ecuación de la recta que pasa por (1,3) y (3,7)', 'y = 3x', 'y = 2x + 1', 'y = x + 2', 'y = 4x - 5', 'b', 2, 'Pendiente m = (7-3)/(3-1) = 4/2 = 2. Usando punto (1,3): y - 3 = 2(x - 1), entonces y = 2x + 1. Verificación con (3,7): 2(3)+1 = 7 ✓. Forma punto-pendiente facilita encontrar ecuaciones.'),
      (v_semana_id, 'Una empresa cobra $30 más $0.20 por minuto de llamada. ¿Qué expresión modela el costo total?', 'C = 0.20m / 30', 'C = 30 × 0.20m', 'C = 30 + 0.20m (donde m son los minutos)', 'C = 30 - 0.20m', 'c', 3, 'Costo fijo + variable: C(m) = 30 + 0.20m. Si m=100, C=30+20=$50. Modelar funciones lineales aparece en muchos contextos: tarifas, salarios con bono, gastos mensuales.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se llama la gráfica de una función cuadrática?', 'Parábola', 'Hipérbola', 'Recta', 'Círculo', 'a', 1, 'Las funciones cuadráticas y = ax² + bx + c tienen gráfica parabólica. Si a > 0 abre hacia arriba (mínimo); si a < 0 abre hacia abajo (máximo). Aparecen en trayectorias balísticas, áreas máximas, optimización.'),
      (v_semana_id, 'Encuentra el vértice de y = x² - 4x + 3', '(-2, 15)', '(4, 3)', '(2, -1)', '(0, 3)', 'c', 2, 'Para y = ax² + bx + c, el vértice tiene x = -b/(2a). Aquí: x = -(-4)/(2·1) = 2. Sustituyendo: y = 4 - 8 + 3 = -1. Vértice: (2,-1). Es mínimo porque a > 0. Importante para optimización.'),
      (v_semana_id, 'Un proyectil sigue h(t) = -5t² + 20t (h en metros, t en segundos). ¿Cuál es la altura máxima?', '30 metros', '40 metros', '10 metros', '20 metros', 'd', 3, 'Vértice en t = -20/(2·(-5)) = 2 seg. Altura máxima: h(2) = -5(4) + 20(2) = -20 + 40 = 20 m. Las parábolas modelan trayectorias por gravedad. Encontrar máximos resuelve problemas de optimización en física, economía, etc.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tipo de problemas se resuelven con sistemas de ecuaciones?', 'No tienen aplicación práctica', 'Únicamente cálculo financiero', 'Solo en libros de texto', 'Aquellos con varias incógnitas relacionadas: mezclas químicas, problemas de edades, equilibrios económicos, optimización con restricciones, posiciones en geometría', 'd', 1, 'Cuando un problema tiene múltiples variables relacionadas, los sistemas son la herramienta natural. Aplicaciones incluyen mezclas (cuántos kilos de cada producto a precio diferente para promedio dado), edad (relaciones temporales), física (fuerzas), etc.'),
      (v_semana_id, 'Resuelve por sustitución: y = 2x y x + y = 9', 'x = 3, y = 6', 'x = 6, y = 3', 'x = 4, y = 5', 'x = 9, y = 0', 'a', 2, 'Sustituyendo y = 2x en x + y = 9: x + 2x = 9, 3x = 9, x = 3. Entonces y = 2(3) = 6. Verificación: 3 + 6 = 9 ✓. La sustitución es elegante cuando una variable está despejada en una ecuación.'),
      (v_semana_id, 'Si dos productos cuestan $250 (uno de $30 más que el otro), ¿cuáles son sus precios?', '$110 y $140', '$120 y $130', '$100 y $130', '$130 y $140', 'a', 3, 'Sea x el precio menor: x + (x+30) = 250, 2x + 30 = 250, 2x = 220, x = 110. Los precios son $110 y $140. Verificación: 110+140=250 ✓ y 140-110=30 ✓. Modelar y resolver problemas de palabras con sistemas.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué herramienta usa la geometría analítica?', 'Solo dibujos', 'Combina álgebra con geometría usando un plano cartesiano (ejes x, y) para describir y analizar figuras geométricas con ecuaciones', 'Solo cálculos numéricos', 'Únicamente compás', 'b', 1, 'Descartes unió álgebra y geometría: una ecuación describe una figura, y figuras se analizan con métodos algebraicos. Esto permite describir circunferencias, parábolas y otras curvas con precisión y resolverlas analíticamente.'),
      (v_semana_id, '¿Cuál es la ecuación de una circunferencia con centro (0,0) y radio 5?', 'x² - y² = 25', 'x + y = 5', 'x² + y² = 25', 'x² + y² = 5', 'c', 2, 'Ecuación de circunferencia con centro origen y radio r: x² + y² = r². Aquí r=5, entonces r²=25. Si centro es (h,k): (x-h)² + (y-k)² = r². Aplicaciones en órbitas, áreas circulares, etc.'),
      (v_semana_id, 'Calcula la distancia entre los puntos (3, 1) y (7, 4)', '4', '5', '7', '11', 'b', 3, 'Fórmula: d = √((7-3)² + (4-1)²) = √(16+9) = √25 = 5. Es aplicación directa del teorema de Pitágoras a coordenadas cartesianas. Útil en navegación, gráficos por computadora, análisis espacial.');
  END IF;
END $$;

-- ----------- Conocimiento matemático I (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático I" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo conectas álgebra, funciones y geometría analítica?', 'No están conectados', 'Solo se relacionan en niveles avanzados', 'Son temas aislados', 'Se entrelazan: el álgebra define funciones, las funciones tienen representación gráfica, la geometría analítica permite analizarlas, y juntas modelan fenómenos del mundo real', 'd', 1, 'Estas ramas se complementan profundamente: ecuaciones algebraicas se visualizan como gráficas; problemas geométricos se resuelven algebraicamente; funciones modelan fenómenos. Esta integración es el poder de la matemática moderna.'),
      (v_semana_id, '¿Por qué las matemáticas son la base de las ciencias y la tecnología?', 'Solo por costumbre', 'No tienen relación con ciencias', 'Solo en algunas áreas', 'Porque ofrecen lenguaje preciso para describir patrones, relaciones y leyes; permiten cuantificar, predecir y modelar fenómenos en física, química, biología, economía y tecnología', 'd', 2, 'Las matemáticas son lenguaje universal de la ciencia. Las leyes físicas se expresan matemáticamente (E=mc²). La biología usa estadística; la química, ecuaciones; la informática, lógica matemática. Sin matemáticas, ciencia moderna no existiría.'),
      (v_semana_id, '¿Qué hábitos favorecen el éxito en matemáticas universitarias?', 'Práctica constante, comprensión profunda (no memorística), resolución de problemas variados, conexión entre conceptos, perseverancia ante dificultad y solicitud de ayuda oportuna', 'Estudiar solo antes de exámenes', 'Solo memorizar fórmulas', 'Esperar inspiración', 'a', 3, 'Las matemáticas universitarias requieren consistencia y profundidad: práctica diaria, entender el "por qué", resolver problemas desafiantes (no solo similares), conectar temas, aceptar el error como parte del proceso, buscar ayuda cuando se atoran las ideas.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué relaciona la trigonometría?', 'Operaciones aritméticas', 'Solo cuadrados', 'Ángulos con lados de triángulos, especialmente rectángulos, mediante funciones seno, coseno y tangente', 'Solo círculos', 'c', 1, 'Trigonometría (medida de triángulos) relaciona ángulos con razones entre lados. Las funciones sen, cos, tan permiten resolver triángulos y modelar fenómenos periódicos como ondas, mareas, sonido.'),
      (v_semana_id, 'En un triángulo rectángulo, si el cateto opuesto a un ángulo es 3 y la hipotenusa es 5, ¿cuánto vale el seno?', '0.8', '0.5', '1.5', '0.6', 'd', 2, 'sen(θ) = cateto opuesto / hipotenusa = 3/5 = 0.6. Recordar SOH (Sine = Opposite/Hypotenuse). Estas razones son fundamentales para resolver problemas de altura, distancia, navegación.'),
      (v_semana_id, 'Si una escalera de 4m forma un ángulo de 60° con el suelo, ¿qué altura alcanza? (sen 60° ≈ 0.866)', '4 m', '8 m', '2 m', '3.46 m', 'd', 3, 'Altura = hipotenusa × sen(ángulo) = 4 × sen(60°) = 4 × 0.866 ≈ 3.46 m. La trigonometría permite calcular alturas inaccesibles directamente, distancia entre puntos sin medir directamente, ángulos de inclinación.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué representa la función y = sen(x)?', 'Una parábola', 'Una onda periódica que oscila entre -1 y 1, con período de 2π', 'Una hipérbola', 'Una recta', 'b', 1, 'sen(x) y cos(x) son funciones periódicas con forma de onda. Modelan fenómenos cíclicos: día/noche, mareas, vibraciones, ondas sonoras y electromagnéticas. Su período (2π en radianes) refleja la cíclicidad.'),
      (v_semana_id, '¿Qué es un radián?', 'Igual a un grado', 'Otra unidad para medir ángulos basada en la longitud del arco; 360° = 2π radianes (≈ 6.28)', 'Solo se usa en física', 'Una unidad de longitud', 'b', 2, 'Radianes y grados son ambas unidades de ángulo. 1 radián es el ángulo cuyo arco iguala el radio. Los radianes simplifican fórmulas de cálculo y son estándar en matemática avanzada y ciencias.'),
      (v_semana_id, '¿Qué fenómenos se modelan con funciones trigonométricas?', 'Únicamente sombras', 'Movimiento ondulatorio (sonido, luz, ondas en agua), movimiento periódico (péndulos), señales eléctricas alternas, mareas, ciclos biológicos y musicales', 'Solo en problemas escolares', 'Solo movimiento circular', 'b', 3, 'Donde hay periodicidad, hay funciones trigonométricas: música (frecuencias), electricidad (corriente AC), comunicaciones (modulación), fenómenos naturales (mareas, estaciones), incluso ciclos circadianos del cuerpo.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un logaritmo?', 'Solo un cálculo decorativo', 'No tiene aplicación', 'Un sinónimo de potencia', 'La operación inversa de la exponenciación: log_b(x) responde "¿a qué exponente elevar b para obtener x?"', 'd', 1, 'Si 2³ = 8, entonces log₂(8) = 3. El logaritmo "deshace" la exponencial. Aplicaciones: pH (acidez), decibeles (sonido), magnitudes de terremotos (Richter), interés compuesto, compresión de datos.'),
      (v_semana_id, '¿Cuánto vale log₁₀(1000)?', '1', '2', '3', '10', 'c', 2, 'log₁₀(1000) pregunta: ¿a qué potencia elevar 10 para obtener 1000? 10³ = 1000, entonces log₁₀(1000) = 3. Logaritmo en base 10 cuenta cifras: 1000 tiene 3 ceros, log = 3.'),
      (v_semana_id, 'Una población de bacterias se modela P(t) = 100 · 2^t (t en horas). ¿Cuántas habrá en 5 horas?', '500', '1000', '3200', '5000', 'c', 3, 'P(5) = 100 × 2⁵ = 100 × 32 = 3200. Las funciones exponenciales modelan crecimiento explosivo (bacterias, virus, dinero a interés compuesto) y decaimientos (radiactividad, depreciación).');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué representa la probabilidad de un evento?', 'Una predicción exacta', 'La medida cuantitativa de la frecuencia esperada de ese evento, expresada entre 0 (imposible) y 1 (seguro)', 'Solo es teórica', 'Algo subjetivo sin reglas', 'b', 1, 'P(evento) cuantifica incertidumbre. P=0: imposible; P=1: seguro; P=0.5: igualmente probable. Permite tomar decisiones bajo incertidumbre: medicina (riesgo-beneficio), economía (inversión), juegos, predicción meteorológica.'),
      (v_semana_id, 'En estadística, ¿qué es la desviación estándar?', 'El promedio', 'Una medida de dispersión: indica cuánto varían los datos respecto a la media; valores pequeños indican datos agrupados, grandes indican dispersos', 'El valor más bajo', 'El valor más alto', 'b', 2, 'Dos grupos pueden tener misma media pero distribuciones distintas. Desviación estándar mide dispersión: datos cercanos a la media (DE pequeña) vs. datos esparcidos (DE grande). Crucial en control de calidad, inversiones, ciencia.'),
      (v_semana_id, 'Si en una caja hay 5 bolas rojas y 3 azules, ¿cuál es la probabilidad de sacar una azul?', '3/8', '5/8', '1/3', '3/5', 'a', 3, 'P(azul) = casos favorables / casos totales = 3/(5+3) = 3/8 = 0.375 = 37.5%. La probabilidad clásica funciona cuando todos los casos son igualmente probables. Base para análisis de juegos, encuestas, decisiones.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es el volumen de una esfera de radio 3?', '36π (porque V = 4/3 π r³ = 4/3 × π × 27 = 36π)', '12π', '9π', '4π', 'a', 1, 'Volumen de esfera = (4/3)πr³ = (4/3)π(3³) = (4/3)π(27) = 36π ≈ 113.1 unidades cúbicas. Aparece en cálculos de globos, planetas, gotas, recipientes esféricos.'),
      (v_semana_id, '¿Qué relación geométrica importante existe entre área de un círculo y el cuadrado de su radio?', 'A = πr², donde π (≈3.14159) es la constante de proporcionalidad universal entre área y r²', 'Son iguales', 'No tienen relación', 'Solo en círculos pequeños', 'a', 2, 'π es uno de los números más importantes de la matemática: relaciona área con radio², perímetro con diámetro. Aparece en innumerables fórmulas. Su valor irracional ha fascinado a matemáticos por milenios.'),
      (v_semana_id, '¿En qué áreas profesionales es esencial la geometría espacial?', 'No es esencial', 'Solo en arquitectura', 'Únicamente en escultura', 'Arquitectura, ingeniería civil, diseño industrial, animación 3D, cirugía robótica, exploración espacial, urbanismo, gráficos por computadora', 'd', 3, 'La geometría 3D es base de muchas profesiones modernas: cualquier modelado por computadora, cálculos estructurales, planificación urbana, fabricación, simulaciones científicas. Saber visualizar y calcular en 3D es habilidad valiosa.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una muestra estadística?', 'Un subconjunto representativo de la población total que se estudia para hacer inferencias sobre el conjunto completo', 'Solo unos pocos casos cualquiera', 'Datos inventados', 'Toda la población', 'a', 1, 'Estudiar toda una población suele ser imposible. Se toma una muestra representativa y se usan métodos estadísticos para inferir características de la población completa. Crítico: la muestra debe ser representativa para evitar sesgos.'),
      (v_semana_id, '¿Por qué las encuestas pueden ser confiables sin entrevistar a todos?', 'Son siempre exactas', 'Adivinan el resultado', 'No son confiables', 'Una muestra aleatoria adecuadamente diseñada (suficiente tamaño, sin sesgos) permite inferir características de la población con margen de error calculable', 'd', 2, 'Bien hechas, encuestas con 1000-2000 personas pueden representar países enteros con margen de error de ±3%. Lo crítico es muestreo aleatorio sin sesgo (todos con igual chance de ser elegidos), tamaño adecuado y método.'),
      (v_semana_id, '¿Qué es el "margen de error" en una encuesta?', 'El rango dentro del cual probablemente se encuentra el valor verdadero de la población; ±3% significa que el resultado real probablemente está entre 3% arriba y 3% abajo del medido', 'No tiene importancia', 'Cuántas personas se equivocaron al responder', 'Cuántos errores cometieron', 'a', 3, 'Toda muestra tiene incertidumbre. Margen de error refleja esa imprecisión inherente. Si encuesta dice "candidato gana 52% ±3%", el real puede estar entre 49-55%. Por eso resultados muy cercanos pueden estar dentro del margen.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un modelo matemático?', 'Una fórmula cualquiera', 'Una representación visual', 'Una representación abstracta de un fenómeno real usando ecuaciones, funciones u otras estructuras matemáticas para analizarlo, predecir comportamientos o tomar decisiones', 'Solo dibujos', 'c', 1, 'Modelos matemáticos describen sistemas reales (clima, economía, epidemia, tráfico) en términos cuantitativos. Permiten simular escenarios, predecir resultados, optimizar decisiones. Son herramientas fundamentales de ciencia moderna.'),
      (v_semana_id, '¿Por qué los modelos pueden equivocarse a pesar de ser matemáticos?', 'Por errores de cálculo', 'No se equivocan', 'Toda matemática es exacta', 'Son simplificaciones de realidad compleja: no incluyen todas las variables, sus supuestos pueden no cumplirse, y eventos imprevistos pueden alterar predicciones', 'd', 2, '"Todos los modelos están equivocados, pero algunos son útiles" (Box). Los modelos simplifican; lo importante es que capturen lo esencial. Buen modelado reconoce supuestos y limitaciones, no los oculta.'),
      (v_semana_id, 'En la pandemia, los modelos matemáticos ayudaron a predecir contagios. ¿Qué muestra esto?', 'Que las matemáticas no sirven', 'Que pueden modelar situaciones complejas y guiar políticas públicas, aunque las predicciones siempre tengan incertidumbre y dependan de supuestos cambiantes (medidas, comportamientos)', 'Que predicen el futuro exactamente', 'Que solo son útiles en pandemias', 'b', 3, 'Modelos epidemiológicos (SIR, SEIR) ayudaron a estimar capacidad hospitalaria, evaluar medidas, planear vacunación. Sus errores y aciertos enseñan tanto las potencias como límites del modelado matemático aplicado.');
  END IF;
END $$;

-- ----------- Conocimiento matemático II (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Conocimiento matemático II'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Conocimiento matemático II" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo te ayudará el conocimiento matemático en tu vida profesional?', 'Solo en algunas áreas', 'Solo si trabajas en ciencias', 'Como base de pensamiento lógico, capacidad analítica, manejo de datos, comprensión cuantitativa y resolución de problemas; útil en cualquier carrera moderna', 'No será útil', 'c', 1, 'Aún en humanidades necesitas estadística para investigación; en negocios para finanzas; en arte para proporciones; en política para análisis de datos. Las matemáticas desarrollan músculos cognitivos transferibles a cualquier campo.'),
      (v_semana_id, '¿Cómo enfrentar materias matemáticas universitarias exitosamente?', 'Memorizar todo', 'Esperar a último momento', 'Mantener bases sólidas (no avanzar con huecos), practicar regularmente, entender conceptos en profundidad, resolver problemas variados, formar grupos de estudio, no temer a errores ni a pedir ayuda', 'Solo asistir a clases', 'c', 2, 'Matemáticas universitarias avanzan rápido y cada tema construye sobre anteriores. Necesitas: dedicación constante (no maratones de último minuto), comprensión real (no memoria), práctica activa, colaboración con compañeros, persistencia.'),
      (v_semana_id, '¿Qué actitud cultivar hacia las matemáticas en general?', 'Reconocerlas como lenguaje universal, herramienta de pensamiento y belleza intelectual; cultivar curiosidad, persistencia, gusto por desafíos y reconocimiento de su utilidad práctica y valor cultural', 'Evitarlas si es posible', 'Verlas como obstáculo', 'Solo tolerarlas', 'a', 3, 'Las matemáticas no son enemigas: son lenguaje del universo, fuente de placer estético (belleza de demostraciones), herramienta práctica para mejorar el mundo. Cambiar actitud cambia rendimiento. Persistencia y curiosidad superan al "talento natural".');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué define la salud integral según la OMS?', 'Solo bienestar físico', 'Tener mucha energía', 'Solo ausencia de enfermedad', 'Estado de completo bienestar físico, mental y social, no solo la ausencia de enfermedad', 'd', 1, 'La OMS define salud holísticamente: incluye dimensión física (cuerpo), mental (mente, emociones) y social (relaciones, comunidad). Las tres están interconectadas.'),
      (v_semana_id, '¿Cuáles son los pilares fundamentales del bienestar?', 'Alimentación equilibrada, actividad física regular, sueño adecuado, manejo del estrés y vida social saludable', 'Únicamente medicamentos', 'Solo dieta', 'Solo ejercicio', 'a', 2, 'El bienestar se construye con múltiples hábitos. Una sola dimensión descuidada (mal sueño, sedentarismo, dieta inadecuada) afecta todo el sistema. Es enfoque integral, no compartimentado.'),
      (v_semana_id, '¿Por qué la salud preventiva es más eficiente que la curativa?', 'Es lo mismo', 'Previene enfermedades antes de que se desarrollen, reduce costos médicos, mejora calidad de vida y aumenta esperanza de vida saludable', 'No funciona', 'Es más cara', 'b', 3, 'Prevenir cuesta menos que curar. Hábitos saludables sostenidos previenen diabetes, hipertensión, cáncer y otras enfermedades crónicas. Es la mejor inversión personal y social en salud.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una alimentación equilibrada?', 'Comer poco', 'Solo comer verduras', 'Una dieta variada que incluye proporciones adecuadas de proteínas, carbohidratos complejos, grasas saludables, frutas, verduras, agua y fibra', 'Una dieta restrictiva', 'c', 1, 'El equilibrio nutricional aporta todos los nutrientes necesarios. El plato del bien comer guía: 50% verduras y frutas, 25% cereales integrales, 25% proteínas. Variedad asegura completitud nutricional.'),
      (v_semana_id, '¿Por qué se recomienda evitar ultraprocesados?', 'Son baratos', 'Son rápidos', 'Contienen exceso de azúcares, grasas trans, sodio y aditivos, y suelen ser pobres en fibra y micronutrientes; aumentan riesgo de obesidad, diabetes y enfermedades cardiovasculares', 'Saben mal', 'c', 2, 'Los ultraprocesados están diseñados para ser hiperpalatables y económicos, pero perjudican la salud. Pueden generar adicción, alteran microbiota y son factor causal en epidemias modernas de enfermedades crónicas.'),
      (v_semana_id, '¿Qué es la alimentación consciente (mindful eating)?', 'Comer rápido', 'No comer', 'Solo contar calorías', 'Comer con atención plena: notar sabores, texturas, hambre y saciedad reales; sin distracciones (pantallas), sin culpa y respetando las señales del cuerpo', 'd', 3, 'Mindful eating mejora digestión, ayuda a regular cantidad consumida (mejor saciedad), aumenta el placer al comer y previene desórdenes alimenticios. Es opuesto a comer mecánico o emocional.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuánto ejercicio recomienda la OMS para adolescentes?', 'Una vez a la semana', 'Al menos 60 minutos diarios de actividad física moderada a vigorosa', 'Solo cuando se quiera', 'Una hora a la semana', 'b', 1, 'OMS recomienda mínimo 60 min diarios de actividad para niños y adolescentes. Combinar aeróbico (correr, nadar) con fortalecimiento muscular y flexibilidad. Beneficios mentales además de físicos.'),
      (v_semana_id, '¿Qué beneficios del ejercicio van más allá del físico?', 'Solo se ve bien', 'Reduce ansiedad, mejora estado de ánimo, aumenta autoestima, mejora cognición y concentración, regula sueño, libera endorfinas y reduce riesgo de depresión', 'Ninguno mental', 'Es solo físico', 'b', 2, 'El ejercicio es uno de los antidepresivos naturales más potentes. Mejora función cognitiva, sueño, autoestima. Es prácticamente requisito para salud mental óptima, no opcional.'),
      (v_semana_id, '¿Cómo incorporar actividad física si tu vida es muy sedentaria?', 'Solo si tienes tiempo libre', 'Empezar progresivamente con caminatas, escaleras en lugar de elevador, deportes que disfrutes, breaks activos cada 60-90 min, encontrar compañeros, hacerlo sostenible', 'Esperar la motivación perfecta', 'Empezar de golpe con maratón', 'b', 3, 'Comenzar pequeño y aumentar gradualmente es clave para sostenibilidad. Encontrar actividades que disfrutes (no solo "deber"), incorporar al estilo de vida, no a la fuerza. Constancia vence intensidad esporádica.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuántas horas de sueño necesitan los adolescentes?', 'Menos de 6 horas', 'Solo 1-2 horas', '4-5 horas', '8-10 horas por noche para funcionar óptimamente', 'd', 1, 'Adolescentes necesitan 8-10 horas; adultos 7-9. La privación crónica afecta concentración, ánimo, sistema inmune, peso y rendimiento académico. No es lujo: es necesidad biológica.'),
      (v_semana_id, '¿Qué es la higiene del sueño?', 'Conjunto de hábitos que favorecen sueño reparador: horarios consistentes, evitar pantallas antes de dormir, ambiente oscuro y fresco, evitar cafeína por la tarde, rutinas relajantes', 'Dormir con luz', 'Bañarse antes de dormir', 'Cambiar sábanas frecuentemente', 'a', 2, 'Buena higiene de sueño marca diferencia entre dormir mal o reparador. Pantallas emiten luz azul que suprime melatonina; cafeína perdura horas; ambiente importa. Pequeños cambios producen grandes mejoras.'),
      (v_semana_id, '¿Por qué es problemático mirar pantallas antes de dormir?', 'Es bueno relajarse', 'La luz azul suprime la melatonina (hormona del sueño), retrasando el inicio y reduciendo calidad; estímulo mental dificulta desconexión; redes sociales generan ansiedad', 'Solo afecta a niños', 'No tiene impacto', 'b', 3, 'Pantallas en últimos 30-60 min antes de dormir son grandes saboteadores del sueño. Idealmente desconectar 1 hora antes; usar modo nocturno; preferir lectura o meditación.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la salud mental?', 'Pensar siempre positivo', 'Solo no tener enfermedad mental', 'No es importante', 'Estado de bienestar emocional y psicológico que permite enfrentar el estrés normal de la vida, trabajar productivamente, tener relaciones satisfactorias y contribuir a la comunidad', 'd', 1, 'Salud mental va más allá de ausencia de trastornos: es capacidad funcional, regulación emocional, sentido de propósito, conexión con otros. Es tan importante como salud física.'),
      (v_semana_id, '¿Cómo gestionar el estrés de manera saludable?', 'Aislarse de todos', 'Ignorarlo', 'Reconocer lo que lo causa, técnicas de respiración y meditación, ejercicio, hablar con personas de confianza, organización del tiempo, dormir bien y buscar ayuda profesional si es persistente', 'Beber alcohol', 'c', 2, 'Estrés agudo es normal; crónico es dañino. Estrategias saludables: identificar fuentes, técnicas de relajación, actividad física, apoyo social, manejo del tiempo. Cuando supera capacidad personal: ayuda profesional sin estigma.'),
      (v_semana_id, '¿Por qué pedir ayuda profesional psicológica es valioso?', 'Es una herramienta valiosa para entender emociones, desarrollar habilidades de afrontamiento, superar dificultades y prevenir o tratar trastornos; al igual que ir al médico por dolor físico', 'No funciona', 'Solo para casos graves', 'Es señal de debilidad', 'a', 3, 'Estigma cultural ha disuadido a muchos. Pedir ayuda mental es señal de fortaleza y autocuidado, no debilidad. Profesionales (psicólogos, psiquiatras) ofrecen herramientas científicas. Salud mental merece misma atención que física.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una adicción?', 'Un patrón compulsivo de consumo o conducta que la persona no puede controlar a pesar de consecuencias negativas; afecta cerebro, conducta y vida; puede ser a sustancias o conductas (juegos, redes)', 'Solo decisión personal', 'Hábito común', 'Solo a drogas duras', 'a', 1, 'Adicción es enfermedad cerebral compleja, no falta de voluntad. Modifica circuitos de recompensa. Puede ser a sustancias (alcohol, tabaco, drogas) o conductuales (juegos, internet, gambling). Tratamiento requiere apoyo profesional.'),
      (v_semana_id, '¿Qué factores aumentan riesgo de desarrollar adicciones?', 'Falta de carácter', 'Es totalmente aleatorio', 'Solo factores genéticos', 'Combinación de factores: genéticos, exposición temprana, traumas, salud mental, presión social, accesibilidad y falta de habilidades de afrontamiento', 'd', 2, 'Las adicciones son multifactoriales. No hay perfil único. Quien tiene historia familiar de adicción, salud mental sin atender, traumas, círculo social que normaliza consumo, mayor riesgo. Conciencia ayuda a prevenir.'),
      (v_semana_id, '¿Qué hacer ante presión de pares para consumir alcohol/drogas?', 'Aislarse totalmente', 'No es importante el grupo', 'Aceptar siempre', 'Tomar decisiones basadas en valores propios, tener respuestas asertivas preparadas, alejarse de situaciones de presión, buscar amistades que respeten tus decisiones, recordar consecuencias a largo plazo', 'd', 3, 'Asertividad es clave: decir "no, gracias" sin justificarse, tener excusas listas, alejarse de presión, mantener amistades que respeten tus decisiones. Construir autoestima y autoconfianza facilita resistencia a presión grupal.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué incluye la salud sexual integral?', 'Solo no enfermarse', 'Solo aspectos físicos', 'Bienestar físico, emocional, mental y social respecto a la sexualidad; relaciones respetuosas, decisiones informadas, prevención de ITS y embarazos no planificados, libertad de coerción', 'Solo prevenir embarazo', 'c', 1, 'Salud sexual incluye dimensiones físicas, emocionales, sociales, éticas. Implica decisiones informadas, consentimiento, respeto, prevención. La OMS la define como derecho humano fundamental.'),
      (v_semana_id, '¿Por qué el consentimiento es fundamental en relaciones?', 'Es base ética y legal: toda actividad sexual requiere acuerdo libre, informado, entusiasta y reversible de todos los involucrados; sin consentimiento, es agresión', 'Solo en algunos casos', 'Implícito siempre', 'No es necesario', 'a', 2, 'Consentimiento es claro, libre, entusiasta, específico, reversible. No hay consentimiento bajo coerción, manipulación, intoxicación o cuando se duerme. Es responsabilidad continua de todos los participantes.'),
      (v_semana_id, '¿Qué métodos previenen tanto embarazos como ITS?', 'Preservativos (condones masculino o femenino) son los únicos que protegen contra embarazo y la mayoría de ITS; combinables con otros para mayor eficacia', 'Solo anticonceptivos hormonales', 'Únicamente abstinencia', 'Solo método de ritmo', 'a', 3, 'Solo preservativos previenen ambas. Otros (pastilla, DIU) son más efectivos contra embarazo pero no previenen ITS. La combinación de métodos (doble protección) es más segura. Información clara salva vidas.');
  END IF;
END $$;

-- ----------- Estilo de vida saludable (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Estilo de vida saludable'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Estilo de vida saludable" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué decisiones de hoy impactan tu salud futura?', 'Ninguna realmente', 'Casi todas: alimentación, actividad, sueño, manejo del estrés, evitar adicciones, relaciones saludables; estos hábitos formados ahora condicionarán tu salud en décadas futuras', 'Solo en vejez', 'Solo lo genético importa', 'b', 1, 'Adolescencia y juventud son ventanas críticas para formar hábitos. La epigenética muestra que ambiente afecta expresión genética. Sembrar hábitos saludables ahora cosecha beneficios toda la vida.'),
      (v_semana_id, '¿Cómo balancear disfrute con salud sin caer en restricciones extremas?', 'Renunciar a todo lo placentero', 'Ser perfecto siempre', 'Adoptar enfoque 80/20: la mayor parte del tiempo elegir saludable, permitirse momentos de placer sin culpa; sostenibilidad sobre perfección; salud como medio para vida plena, no fin restrictivo', 'No preocuparse en absoluto', 'c', 2, 'Restricciones extremas suelen fallar a largo plazo. El equilibrio sostenible (80% bueno, 20% flexible) es realista y duradero. La salud es para disfrutar la vida, no para sufrir por ella.'),
      (v_semana_id, '¿Qué compromiso personal puedes asumir hoy con tu salud?', 'No comprometerse', 'Esperar para empezar', 'Identificar 1-3 cambios pequeños y específicos (más agua, dormir 30 min más, caminar diario, menos pantallas), implementarlos progresivamente, monitorear y ajustar', 'Cambiar todo de golpe', 'c', 3, 'Cambios pequeños sostenidos generan transformaciones grandes. Empezar con metas específicas y alcanzables (no "ser saludable" sino "caminar 30 min lunes-miércoles-viernes"). Construir hábitos uno a uno.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuándo y dónde nacieron las primeras universidades?', 'Siglo XX en EE.UU.', 'En la Edad Media (siglos XI-XII) en Europa: Bologna (1088), Oxford, París, Salamanca, como centros de estudio superior', 'En el Renacimiento', 'Recientemente', 'b', 1, 'Las universidades medievales europeas nacieron como gremios de estudiantes/profesores. Bologna es la más antigua continuamente operativa. Heredaron tradición de academias griegas y casas de sabiduría islámicas. México tiene la primera de América (UNAM, 1551).'),
      (v_semana_id, '¿Cuál es la misión esencial de una universidad?', 'Solo formar trabajadores', 'Generar, preservar y transmitir conocimiento; formar profesionales y ciudadanos críticos; contribuir al desarrollo social, cultural, científico y tecnológico', 'Hacer dinero', 'Solo dar diplomas', 'b', 2, 'Universidad cumple roles entrelazados: docencia (formación), investigación (creación de conocimiento), extensión/vinculación (compromiso social). Más allá del título, busca formar pensadores autónomos y ciudadanos comprometidos.'),
      (v_semana_id, '¿Por qué la universidad es importante para una sociedad?', 'No es importante', 'Solo para empleos', 'Solo para los que la cursan', 'Es motor de desarrollo: forma profesionales que necesita el país, genera conocimiento e innovación, preserva cultura, fomenta pensamiento crítico, eleva calidad de vida y democracia', 'd', 3, 'Países con sistemas universitarios sólidos tienen más desarrollo, innovación y movilidad social. La universidad genera externalidades positivas: investigación que beneficia a todos, ciudadanía mejor formada, cultura.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los niveles del sistema educativo mexicano?', 'Solo primaria', 'Educación inicial, preescolar, primaria, secundaria, media superior (preparatoria), superior (licenciatura), posgrado', 'Únicamente universidad', 'Solo dos niveles', 'b', 1, 'México tiene sistema educativo amplio: básica (preescolar+primaria+secundaria) obligatoria; media superior obligatoria desde 2012; superior optativa pero recomendada. Cada nivel construye sobre anterior.'),
      (v_semana_id, '¿Qué tipos de instituciones de educación superior existen en México?', 'Solo universidades', 'Universidades públicas (autónomas y federales), privadas, tecnológicos, normales, politécnicos, institutos especializados; cada una con su perfil y enfoque', 'Solo públicas', 'Solo privadas', 'b', 2, 'Diversidad institucional: UNAM, IPN, UAM (federal), universidades estatales, institutos tecnológicos, normales (formación docente), privadas (Tec, Anáhuac, Ibero), interculturales. Cada tipo aporta al sistema.'),
      (v_semana_id, '¿Qué retos enfrenta la educación superior en México?', 'Solo económicos', 'Ninguno', 'Cobertura limitada (no toda la población accede), calidad heterogénea, desigualdad de oportunidades, desfase con mercado laboral, financiamiento insuficiente, desafíos en investigación', 'Solo políticos', 'c', 3, 'Aunque ha crecido, la cobertura educativa superior mexicana ronda 40% (vs. 70-90% en países OCDE). Retos: ampliar acceso, mejorar calidad, vincular con desarrollo, fortalecer investigación, reducir brechas geográficas y socioeconómicas.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué se entiende por identidad universitaria?', 'Sentido de pertenencia y vinculación con una institución educativa que se construye al adoptar sus valores, tradiciones, cultura y misión, generando compromiso con su comunidad', 'Las instalaciones', 'Solo el lema', 'Solo el uniforme', 'a', 1, 'Identidad universitaria trasciende lo administrativo: es identificarse con valores, historia, principios y comunidad. Genera lealtad, compromiso, comportamiento ético, orgullo. Se construye con participación y experiencia.'),
      (v_semana_id, '¿Qué papel juegan las tradiciones universitarias?', 'No tienen importancia', 'Son obsoletas', 'Construyen comunidad, transmiten valores, generan pertenencia, vinculan con la historia institucional, dan continuidad y refuerzan identidad de generaciones de estudiantes', 'Solo entretienen', 'c', 2, 'Tradiciones (himnos, ceremonias, símbolos, celebraciones) crean identidad colectiva. Conectan generaciones, dan sentido de propósito, refuerzan valores y construyen comunidad que perdura más allá de los años de estudio.'),
      (v_semana_id, '¿Cómo construir tu identidad universitaria personal?', 'Solo asistiendo a clases', 'Participando en actividades, conociendo historia y valores institucionales, contribuyendo a la comunidad, vinculándote con compañeros, maestros y exalumnos, asumiendo los principios institucionales', 'No es necesario', 'Pasivamente', 'b', 3, 'Identidad se construye activamente: investigando historia institucional, participando en eventos, integrándose a grupos académicos/culturales/deportivos, conectando con la red de exalumnos. Da sentido más profundo a años universitarios.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué oportunidades ofrece la vida universitaria más allá de las clases?', 'Investigación, intercambios académicos, deportes, cultura, voluntariado, emprendimiento, redes profesionales, prácticas profesionales, congresos, debate, descubrimiento personal', 'Solo fiestas', 'Ninguna', 'Solo distracción', 'a', 1, 'Universidad es ecosistema rico para crecimiento integral. Aprovechar oportunidades extra-académicas (clubes, deportes, voluntariado, intercambios) potencia formación, expande horizontes y construye habilidades transferibles.'),
      (v_semana_id, '¿Por qué es valioso participar en organizaciones estudiantiles?', 'Solo si te pagan', 'No aporta nada', 'Solo distrae', 'Desarrolla liderazgo, trabajo en equipo, comunicación, gestión de proyectos, networking; aplica conocimientos a situaciones reales, complementa la formación académica con habilidades blandas', 'd', 2, 'Participar en grupos estudiantiles (académicos, culturales, deportivos, sociales) desarrolla habilidades blandas críticas en el mundo profesional: liderazgo, gestión, comunicación, resolución de conflictos. Aplicación práctica de la teoría.'),
      (v_semana_id, '¿Cómo balancear estudio, actividades y vida personal?', 'Definir prioridades, planificar tiempo, ser realista sobre carga, descansar, mantener salud, decir no a compromisos excesivos, ajustar dinámicamente, reconocer que es proceso de aprendizaje', 'No estudiar', 'Sacrificar lo personal', 'Hacerlo todo a la vez', 'a', 3, 'El balance es habilidad clave de vida. Requiere autoconocimiento (qué energía tengo), priorización (qué es importante), gestión del tiempo, autocuidado y flexibilidad. Universidad es entrenamiento para gestionar vida adulta.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la ética académica?', 'Es opcional', 'Solo cumplir normas', 'Conjunto de principios y conductas que rigen la actividad académica: honestidad intelectual, integridad, originalidad, respeto, no plagio, datos verídicos, atribución apropiada', 'Solo no copiar', 'c', 1, 'Ética académica es base de credibilidad del conocimiento. Implica honestidad (no plagiar, no inventar datos, no falsificar), respeto (a fuentes, profesores, compañeros), integridad (cumplir lo prometido, ser justo).'),
      (v_semana_id, '¿Por qué el plagio académico es falta grave?', 'Es robo intelectual: presentar ideas o trabajo de otros como propios; viola autoría, daña tu reputación, deshonra el aprendizaje y compromete validez de tu título académico', 'No tiene consecuencias', 'Es solo un error menor', 'Solo si te descubren', 'a', 2, 'Plagio compromete fundamentos del conocimiento. Académicamente puede llevar a expulsión, profesionalmente a pérdida de credenciales, éticamente daña carácter. Citar adecuadamente toma poco esfuerzo y construye integridad.'),
      (v_semana_id, '¿Qué responsabilidades tienes como universitario hacia la sociedad?', 'Ninguna', 'Solo después de graduarse', 'Aprovechar tu formación (especialmente si es financiada con recursos públicos), aplicar conocimiento al bien común, contribuir profesionalmente, participar ciudadanamente, ser modelo ético', 'Solo a la universidad', 'c', 3, 'Universitarios tienen privilegio educativo no universal. Devolver a la sociedad mediante práctica profesional ética, ciudadanía activa, voluntariado, transmisión de conocimiento es ética de reciprocidad y compromiso social.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la investigación científica?', 'Memorización de datos', 'Cualquier curiosidad', 'Solo opinión', 'Búsqueda sistemática y rigurosa de conocimiento mediante el método científico: observación, hipótesis, experimentación, análisis, replicabilidad, revisión por pares', 'd', 1, 'Investigación genera conocimiento confiable mediante metodología rigurosa: protocolos, controles, peer review, replicabilidad. Distingue conocimiento científico de creencia. Bases de medicina, tecnología, política basada en evidencia.'),
      (v_semana_id, '¿Cómo distinguir información científica confiable?', 'Confiar en lo que parece bien', 'Si la dice un famoso', 'Si está en redes sociales', 'Por publicación en revistas con peer review, autoría académica, citación por otros estudios, reproducibilidad, consenso de expertos, transparencia metodológica', 'd', 2, 'Información científica confiable tiene marcadores: revisada por pares, en revistas serias, citada por otros, transparente en métodos, expertos coinciden. Desconfiar de afirmaciones únicas, sin fuentes, sin metodología clara.'),
      (v_semana_id, '¿Por qué es importante el método científico para la sociedad?', 'Solo importa a científicos', 'Solo es teórico', 'Genera conocimiento confiable que mejora medicina, tecnología, agricultura, ambiente; protege contra pseudociencia y desinformación; permite políticas públicas basadas en evidencia', 'No tiene impacto social', 'c', 3, 'Avances que damos por sentado (medicinas, vacunas, internet, GPS) provienen de investigación rigurosa. Sin método científico, dependeríamos de ensayo y error o autoridad. Permite distinguir lo que funciona de lo que no.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué define a una profesión?', 'Actividad que requiere formación universitaria especializada, conocimientos técnicos profundos, ética profesional, responsabilidad social y suele estar regulada por colegios o asociaciones', 'Cualquier trabajo', 'Solo si te gusta', 'Solo cobrar por servicios', 'a', 1, 'Profesión implica compromiso especial: formación rigurosa, ética específica, responsabilidad ante clientes/pacientes/sociedad, regulación. Distingue de oficios; conlleva privilegios y responsabilidades particulares.'),
      (v_semana_id, '¿Qué es la responsabilidad social profesional?', 'No es responsabilidad del profesional', 'Solo cumplir contrato', 'Solo si te beneficia', 'Conciencia de que la práctica profesional impacta a otros y sociedad; ejercer con ética, calidad, considerando consecuencias sociales/ambientales, contribuyendo al bien común', 'd', 2, 'Profesional médico, ingeniero, abogado, contador no solo trabaja para sí: sus decisiones afectan a otros (pacientes, comunidades, ambiente). Responsabilidad social es ejercer pensando en impacto más amplio, no solo lucro personal.'),
      (v_semana_id, '¿Cómo elegir vocación profesional reflexivamente?', 'Lo que digan los demás', 'Por moda', 'Por dinero solamente', 'Conocer tus aptitudes, intereses, valores; investigar carreras, su mercado, demanda; conversar con profesionistas; considerar impacto social; aceptar que es proceso, no decisión única', 'd', 3, 'Decisión vocacional involucra autoconocimiento (qué se me da, qué me apasiona, qué valoro) y conocimiento del mundo (qué carreras existen, mercados, impacto). Rara vez es decisión final; ajustar es normal y maduro.');
  END IF;
END $$;

-- ----------- Historia e identidad universitaria (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Historia e identidad universitaria'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Historia e identidad universitaria" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué legado puedes construir como universitario?', 'Solo personal', 'Tu formación profesional ética, contribuciones al conocimiento, mentorías a otros, participación cívica, prácticas que construyan sociedad mejor; el verdadero legado es lo que dejas para otros', 'Solo dinero', 'Ninguno', 'b', 1, 'Más allá del título, lo que construyes son: conocimientos al servicio de otros, relaciones que enriquezcan, mentorías a próximas generaciones, prácticas profesionales éticas, participación en bien común. Legado es huella positiva en otros.'),
      (v_semana_id, '¿Cómo evolucionará tu identidad universitaria con el tiempo?', 'Se mantendrá viva si participas como exalumno: actualizándote, mentorizando a estudiantes, apoyando a tu institución, manteniendo redes, aplicando los valores adquiridos durante toda tu vida', 'No tiene continuidad', 'Solo dura años escolares', 'Se desvanecerá', 'a', 2, 'Universidad no termina al graduarte: red de exalumnos, formación continua, mentorías, apoyo a la institución son formas de mantener vivo el vínculo. Universitarios comprometidos benefician a su alma mater y a sí mismos por décadas.'),
      (v_semana_id, '¿Qué actitud llevarte a la siguiente etapa de tu formación?', 'Mínimo esfuerzo', 'Pasividad', 'Compromiso, curiosidad, ética, espíritu de servicio, autonomía intelectual, aceptación de retos, apertura a aprender, gratitud por la oportunidad y propósito de contribuir al bien común', 'Solo competencia', 'c', 3, 'Las actitudes que cultives marcarán tu trayectoria más que las calificaciones. Compromiso, ética, curiosidad, servicio definen profesionales destacados. La universidad es preparación para vida; las actitudes son las herramientas más duraderas.');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which is the most appropriate way to introduce yourself in a formal context?', 'Juan here', 'Hey, I am Juan', 'Good morning, my name is Juan and I am a student at this university', 'What''s up, I''m Juan', 'c', 1, 'Formal introductions in English use complete sentences, polite greetings, and clear identification. The structure includes greeting + name + relevant context (occupation, role).'),
      (v_semana_id, 'Choose the correct verb form: "She _____ from Mexico"', 'be', 'are', 'is', 'am', 'c', 2, 'Subject-verb agreement: "she" requires "is" (third person singular). Pattern: I am, you are, he/she/it is, we/you/they are.'),
      (v_semana_id, 'Why is it important to learn English in academic contexts?', 'It is not necessary', 'Only for traveling', 'Only for entertainment', 'It is the lingua franca of science, technology, business, and academia, providing access to research, opportunities, and global communication', 'd', 3, 'English dominates international academic and professional communication. Most scientific research, technical documentation, and global business operates in English. Mastery opens countless opportunities.');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'When do we use the present continuous tense?', 'For actions happening now or around the present time', 'For past actions', 'For future plans only', 'For routine actions', 'a', 1, 'Present continuous (am/is/are + verb-ing) describes actions in progress now: "I am studying" or temporary situations: "She is living in Mexico this year". Different from simple present (habits).'),
      (v_semana_id, 'Which sentence is correct?', 'I am studying English right now', 'I studying English now', 'I am study English now', 'I study English now', 'a', 2, 'Present continuous: subject + am/is/are + verb-ing. "Right now" indicates action in progress. Always include "to be" auxiliary; gerund (-ing) cannot stand alone with subject.'),
      (v_semana_id, 'How do you form a question in present continuous?', 'You studying now?', 'Are you studying now?', 'You are studying now?', 'Studying you are now?', 'b', 3, 'Questions invert subject and auxiliary: "to be" comes first, then subject, then verb-ing. Pattern: Am/Is/Are + subject + verb-ing? "Are you studying?", "Is she working?".');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What is the past tense of "study"?', 'studyed', 'studyd', 'study', 'studied', 'd', 1, 'Regular verbs ending in consonant+y: change y→i and add -ed. Study→studied. Other examples: try→tried, cry→cried. Verbs ending in vowel+y just add -ed: play→played.'),
      (v_semana_id, 'Choose the correct past tense: "Yesterday, I _____ to the cinema"', 'go', 'goed', 'went', 'going', 'c', 2, '"Go" is irregular: go-went-gone. Common irregular verbs: see-saw, eat-ate, drink-drank, write-wrote. Memorizing irregular verb forms is essential for accurate past tense use.'),
      (v_semana_id, 'How do you make past simple negative?', 'I didn''t study (using "did not" + base verb)', 'I not studied', 'I no studied', 'I didn''t studied', 'a', 3, 'Past negative: subject + did not (didn''t) + base verb. Important: after "did", use base form (study), not past form (studied). Same for questions: "Did you study?".');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which expression talks about future plans?', 'I study right now', 'I will study yesterday', 'I am going to study tomorrow', 'I studied next year', 'c', 1, 'Future plans/intentions use "going to": "I am going to study". For predictions or spontaneous decisions use "will": "I think it will rain". Time markers like "tomorrow", "next year" indicate future.'),
      (v_semana_id, 'What does "will" express in this sentence: "I will help you"?', 'A daily routine', 'A past action', 'A current action', 'A spontaneous decision or promise about the future', 'd', 2, '"Will" can express: spontaneous decisions ("I''ll get it!"), promises ("I will help"), predictions ("It will rain"), future facts. Different from "going to" (planned actions).'),
      (v_semana_id, 'How do you ask about future plans?', 'What you do tomorrow?', 'What are you going to do tomorrow? / What will you do tomorrow?', 'What you will?', 'Tomorrow what you?', 'b', 3, 'Future questions: "What are you going to do?" (plans), "What will you do?" (predictions/uncertain). Maintain question structure: WH-word + auxiliary + subject + verb.');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What does the modal verb "must" express?', 'Strong obligation or necessity', 'Ability', 'Permission', 'Possibility', 'a', 1, 'Modal verbs express different ideas: must (strong obligation), can (ability), may/might (possibility), should (advice), have to (external obligation). "You must study" = strong obligation.'),
      (v_semana_id, 'Choose the correct sentence with "should":', 'You should to study more', 'You should study more', 'You should studied more', 'You should studying more', 'b', 2, 'Modal verbs are followed by base verb (no "to", no -ing, no -ed). "Should" gives advice. Other examples: can do, must go, will eat. Never "should to" or "can doing".'),
      (v_semana_id, 'How do you ask for permission politely?', 'Phone, please', 'I want to use your phone', 'May I use your phone?', 'Give me your phone', 'c', 3, '"May I...?" is the most polite way to ask permission. Alternatives: "Could I...?", "Can I...?" (informal). Politeness levels: May (most formal) > Could > Can. Add "please" for extra courtesy.');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'How do you form the comparative of "tall"?', 'tallest', 'most tall', 'more tall', 'taller', 'd', 1, 'Short adjectives (1 syllable): add -er for comparative (taller), -est for superlative (tallest). Long adjectives (3+ syllables): use more/most + adjective (more important, most important).'),
      (v_semana_id, 'Choose the correct sentence:', 'She is more tall than me', 'She is taller than me', 'She is tallest than me', 'She is more taller than me', 'b', 2, 'Comparatives: adjective+er + than + person/thing. "She is taller than me/I am". Don''t double comparison: "more taller" is incorrect. For long adjectives: "more important than".'),
      (v_semana_id, 'Which is the superlative of "good"?', 'goodest', 'best', 'better', 'gooder', 'b', 3, 'Irregular comparisons: good-better-best, bad-worse-worst, far-farther/further-farthest/furthest. These don''t follow regular rules; they must be memorized.');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which conditional expresses something always true (zero conditional)?', 'If I had gone, I would see her', 'If I were rich, I would travel', 'If I will go, I see her', 'If you heat water to 100°C, it boils', 'd', 1, 'Zero conditional: if + present simple, present simple. Used for general truths, scientific facts, things that always happen. "If you heat water, it boils" - always true.'),
      (v_semana_id, 'Complete: "If it _____ tomorrow, we will stay home"', 'rain', 'rains', 'will rain', 'rained', 'b', 2, 'First conditional: if + present simple, will + base verb. The "if" clause uses present (not future) even when referring to future events. Pattern for real future possibilities.'),
      (v_semana_id, 'What does first conditional express?', 'Imaginary situations', 'Habits', 'Past situations', 'Real or possible situations in the future', 'd', 3, 'First conditional describes real possibilities about future. "If I have time, I will help you" suggests it''s possible. Different from second conditional (imaginary): "If I had time, I would help".');
  END IF;
END $$;

-- ----------- Inglés nivel 1 (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 1'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 1" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What is the best strategy to improve your English?', 'Combine reading, listening, speaking and writing practice; immerse yourself in content (movies, music, books); practice consistently; not fear mistakes; engage with native speakers when possible', 'Wait until you "know enough"', 'Only attend class', 'Memorize grammar rules only', 'a', 1, 'Language acquisition requires multimodal exposure and active practice. Passive learning (just rules) is insufficient. Watching, listening, reading and especially speaking build real competence. Mistakes are part of progress.'),
      (v_semana_id, 'Why is regular practice more effective than intensive cramming?', 'It''s not more effective', 'It''s the same', 'Brain consolidates language gradually; spaced repetition outperforms massed study; consistency builds habits; avoids burnout; mirrors how children acquire language naturally', 'Cramming is better', 'c', 2, 'Neuroscience supports spaced repetition: 30 minutes daily beats 3.5 hours weekly. Brain encodes language better with regular exposure. Learning languages is marathon, not sprint.'),
      (v_semana_id, 'What attitude is most beneficial when learning English?', 'Curiosity about culture, willingness to make mistakes, persistence through challenges, embracing daily practice, finding joy in progress, viewing it as opening doors to global community', 'Wait for perfect conditions', 'Perfectionism that prevents speaking', 'Frustration with errors', 'a', 3, 'Mindset shapes outcome. Curious, error-tolerant, persistent learners outperform those who fear mistakes. Language learning is long-term; enjoying the journey, celebrating small wins, and connecting with English-speaking culture sustain motivation.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'When do we use the present perfect tense?', 'For specific past times', 'For past actions with present relevance, experiences, unfinished time periods, or actions that started in past and continue', 'For future plans', 'For routine actions only', 'b', 1, 'Present perfect (have/has + past participle) connects past with present: "I have lived here for 5 years" (still living), "She has visited Paris" (experience), "I have just eaten" (recent). Distinct from past simple.'),
      (v_semana_id, 'Choose the correct sentence:', 'I have been to Paris three times', 'I have go to Paris', 'I has been to Paris', 'I have went to Paris', 'a', 2, 'Present perfect: subject + have/has + past participle. "Been" is past participle of "be" (also "go" in this expression of having visited). Use "for" with periods (for 5 years), "since" with starting points (since 2020).'),
      (v_semana_id, 'What''s the difference between "I lived in Mexico" and "I have lived in Mexico"?', 'Only spelling', 'No difference', 'The first means past completed (no longer living there); the second connects past to present (often still living there or focuses on the experience)', 'Only formality', 'c', 3, 'Past simple = finished action with past time. Present perfect = past with present relevance. "I lived" suggests no longer there. "I have lived" suggests current relevance: still living, recent experience, or ongoing situation.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'How is the passive voice formed?', 'Just add -ed', 'Use "have" only', 'Subject + verb + object', 'Object becomes subject + form of "to be" + past participle (e.g., "The book was read by her")', 'd', 1, 'Passive: object of active becomes subject; verb changes to be + past participle. Active: "She wrote the book". Passive: "The book was written (by her)". Used when actor is unknown, unimportant, or to focus on action recipient.'),
      (v_semana_id, 'Convert to passive: "They built the house in 1990"', 'The house was built in 1990', 'The house built in 1990', 'The house has built in 1990', 'The house is build in 1990', 'a', 2, 'Active past: built. Passive: was/were + past participle (built). "The house was built" - subject (the house) receives the action. "By them" can be added but often omitted when actor is general/unimportant.'),
      (v_semana_id, 'When is passive voice especially useful?', 'Never', 'In academic writing, news reports, scientific writing, when emphasizing the receiver or when actor is unknown/unimportant', 'Only in conversation', 'Always', 'b', 3, 'Passive: emphasizes object/result over actor. "The discovery was made in 1928" focuses on discovery, not who. "Mistakes were made" hides responsibility. Common in formal writing, science, news. Active voice usually clearer in conversation.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'How do you change "I am tired" to reported speech?', 'He said tired', 'He said I am tired', 'He said he was tired', 'He said he is tired', 'c', 1, 'Reported speech: pronouns change (I→he), tense moves back (am→was). Direct: "I am tired". Reported: "He said (that) he was tired". Backshift: present→past, past→past perfect, will→would.'),
      (v_semana_id, 'Choose correct reported speech: She said, "I will help you"', 'She said she would help me', 'She said she help me', 'She said I will help you', 'She said she will help me', 'a', 2, 'Backshift: will → would. Pronouns adjust: "you" (the listener) becomes "me" (the reporter). Pattern: She said (that) she would help me.'),
      (v_semana_id, 'Why is reported speech important?', 'Only academic', 'Just decorative', 'It''s not used', 'For everyday communication: telling what others said, news reports, summaries, conversations about other conversations', 'd', 3, 'We constantly report what others say: "She told me she was busy", "The teacher said the test would be Friday". Mastering reported speech essential for natural communication, journalism, business, and storytelling.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What is a phrasal verb?', 'A combination of a verb + particle (preposition or adverb) that often has a meaning different from the individual words: "give up" (quit), "look after" (care for)', 'A verb in past', 'Two separate verbs', 'A long verb', 'a', 1, 'Phrasal verbs are essential English vocabulary. "Look up" can mean search information; "look after" means care for; "look forward to" means anticipate. Same verb + different particle = different meaning. Common in conversational English.'),
      (v_semana_id, 'What does "give up" mean?', 'To celebrate', 'To deliver', 'To quit, abandon, surrender', 'To raise', 'c', 2, '"Give up" means to stop trying, quit. "Don''t give up your dreams" = don''t quit pursuing them. Other common phrasal verbs: take off (airplane departs), turn down (reject/lower volume), put up with (tolerate).'),
      (v_semana_id, 'Why are phrasal verbs challenging for English learners?', 'Only in writing', 'They''re easy', 'They have unpredictable meanings, large in number (thousands), are very common in conversation, and meaning changes with particle choice', 'They don''t exist', 'c', 3, 'Phrasal verbs frustrate learners because their meaning isn''t deducible from parts. "Run into" doesn''t mean physically run into, but unexpectedly meet. Mastery requires exposure, contextual learning, and gradual accumulation.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What does the second conditional express?', 'Past habits', 'Always-true statements', 'Real future possibility', 'Imaginary or unlikely present/future situations: "If I were rich, I would travel"', 'd', 1, 'Second conditional: If + past simple, would + base verb. Imagines hypothetical situations. "If I were a bird, I would fly" - I''m not, but imagining. Note: "were" used for all subjects in formal English (not "was").'),
      (v_semana_id, 'What does third conditional express?', 'Daily habits', 'Real possibilities', 'Imagined past situations and their consequences: "If I had studied, I would have passed"', 'Future facts', 'c', 2, 'Third conditional: If + past perfect, would have + past participle. About past hypotheticals (regrets, "what ifs"). "If I had known, I would have told you" - but I didn''t know. Most complex but essential for sophisticated expression.'),
      (v_semana_id, 'Complete: "If she had arrived earlier, we _____ caught the train"', 'have', 'had', 'will have', 'would have', 'd', 3, 'Third conditional: if + past perfect (had arrived), main clause = would have + past participle (would have caught). Both halves about imagined past, contrary to what actually happened.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What characterizes academic English writing?', 'Casual conversational tone', 'Formal vocabulary, complete sentences, third person preference, evidence-based arguments, citations, clear structure (intro-body-conclusion)', 'Personal opinions only', 'Slang and contractions', 'b', 1, 'Academic writing: formal tone, precise vocabulary, evidence-supported arguments, proper citations (APA, MLA), avoid contractions and slang, third person typical, organized structure. Different from creative or conversational writing.'),
      (v_semana_id, 'How should you cite sources in academic writing?', 'Just mention names', 'No citations needed', 'Copy without attribution', 'Reference sources properly using established citation formats (APA, MLA, Chicago) with author, date, title; provide bibliography; quote when using exact words', 'd', 2, 'Citation systems (APA: author-date; MLA: author-page) credit ideas, allow verification, avoid plagiarism, demonstrate research depth. Use direct quotes sparingly, paraphrase often, always cite. Essential academic skill.'),
      (v_semana_id, 'Why are connectors important in academic writing?', 'They show logical relationships between ideas (however, therefore, moreover, in contrast), guide reader, build coherent argument, demonstrate sophisticated thinking', 'Not needed', 'Only in poetry', 'Decorative only', 'a', 3, 'Connectors (however=contrast, therefore=conclusion, moreover=addition, similarly=comparison) reveal relationships between ideas, guide reader through your reasoning, signal organization. Sophisticated academic writing relies on them heavily.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What''s essential in a professional email in English?', 'Casual greetings', 'Clear subject line, appropriate salutation (Dear Mr./Ms.), polite tone, conciseness, action items if any, professional closing (Sincerely, Best regards), signature', 'Many emojis', 'Long, complex sentences', 'b', 1, 'Professional emails: descriptive subject, formal greeting, clear and concise body, polite closing. Avoid contractions in formal emails, slang, excessive emojis. Proofread carefully. Reflects professionalism, especially in international contexts.'),
      (v_semana_id, 'How do you give a presentation in English effectively?', 'Memorize word-by-word', 'Practice extensively, make eye contact, use clear pronunciation, structure with intro-body-conclusion, signpost transitions ("Now let''s look at..."), engage audience, manage nerves, allow Q&A', 'Wing it', 'Read directly from slides', 'b', 2, 'English presentations: thorough preparation but not memorization, clear structure, transitional phrases, audience engagement, pronunciation focus on clarity (not perfect accent). Practice aloud, time yourself, anticipate questions. International audiences appreciate clear, structured speakers.'),
      (v_semana_id, 'Why is intercultural communication important when using English?', 'Only language matters', 'Not important', 'English connects diverse cultures with different norms; awareness of cultural differences in directness, hierarchy, time orientation, humor enhances effective international communication', 'All cultures are identical', 'c', 3, 'English is global lingua franca but speakers come from diverse cultures. Same English words may carry different cultural assumptions. Awareness of cultural variation in communication styles (directness, formality, time) prevents misunderstandings in international contexts.');
  END IF;
END $$;

-- ----------- Inglés nivel 2 (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés nivel 2'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés nivel 2" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'How does English proficiency benefit professional life?', 'Limited benefit', 'Access to international jobs, ability to attend global conferences, read scientific literature, communicate with diverse colleagues, advance in multinational companies, expand career opportunities significantly', 'Only travel', 'Just for school', 'b', 1, 'English fluency dramatically expands professional horizons: international roles, remote work for global companies, conferences, latest research access, multinational team collaboration. Often differentiator between candidates. Investment with lifelong returns.'),
      (v_semana_id, 'How can you continue improving English independently after this course?', 'Wait for perfect time', 'Only formal classes', 'Stop learning', 'Read books and articles in English, watch movies/series with subtitles, listen to podcasts, find conversation partners (online or in-person), use language apps, write a journal in English, set realistic daily practice goals', 'd', 2, 'Self-directed learning continues forever: surround yourself with English content matching interests, practice daily even briefly, maintain conversation practice, write regularly, embrace mistakes. Languages are learned by use, not just study.'),
      (v_semana_id, 'What attitude leads to long-term English mastery?', 'Curiosity about cultures, willingness to make mistakes (essential!), persistence through plateaus, finding genuine interest topics, embracing English as life-long companion rather than school subject', 'Fear of speaking', 'Avoiding English', 'Perfectionism that prevents speaking', 'a', 3, 'Mastery comes from sustained engagement: language as gateway to cultures, content, opportunities. Embrace mistakes as steppingstones. Find what genuinely interests you in English (music, films, gaming, books) - intrinsic motivation sustains learning over years.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué distingue al lenguaje humano de otros sistemas de comunicación animal?', 'No hay diferencia significativa', 'Solo el volumen de los sonidos', 'La doble articulación, la creatividad infinita, la capacidad de referirse a lo ausente y la transmisión cultural', 'Únicamente la cantidad de palabras', 'c', 1, 'El lenguaje humano permite combinar unidades para generar mensajes infinitos, hablar de pasado/futuro o conceptos abstractos, y se transmite culturalmente, no solo genéticamente.'),
      (v_semana_id, '¿Cuál es la función predominante en un texto científico?', 'Función referencial o representativa, centrada en transmitir información objetiva sobre la realidad', 'Función fática', 'Función expresiva', 'Función poética', 'a', 2, 'La función referencial busca informar sobre el mundo de forma objetiva. Es propia de textos científicos, periodísticos informativos y académicos donde el contenido importa más que el emisor.'),
      (v_semana_id, '¿Qué se entiende por contexto en un acto comunicativo?', 'El conjunto de circunstancias situacionales, culturales y lingüísticas que rodean al mensaje y permiten interpretarlo correctamente', 'Las palabras del mensaje', 'Solo el lugar físico', 'Únicamente la hora', 'a', 3, 'El contexto incluye situación física, conocimientos compartidos, relación entre interlocutores y cultura común. Es esencial: la misma frase puede tener significados distintos según el contexto.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué estudia la morfología?', 'El significado de las palabras', 'El uso social del lenguaje', 'Los sonidos del lenguaje', 'La estructura interna de las palabras y cómo se forman a partir de morfemas', 'd', 1, 'La morfología analiza cómo se construyen las palabras a partir de unidades mínimas con significado (morfemas): raíz, prefijos, sufijos, desinencias.'),
      (v_semana_id, '¿Cuál es la diferencia entre sintaxis y semántica?', 'La sintaxis solo analiza verbos', 'La semántica solo estudia frases hechas', 'Son lo mismo', 'La sintaxis estudia cómo se combinan palabras para formar oraciones; la semántica estudia el significado de palabras y enunciados', 'd', 2, 'La sintaxis se ocupa de la estructura gramatical (orden, concordancia, función). La semántica se ocupa del significado, las relaciones entre palabras y cómo construimos sentido.'),
      (v_semana_id, 'En "El estudiante leyó atentamente el ensayo crítico", ¿cuál es el complemento directo?', 'Atentamente', 'El ensayo crítico', 'Leyó', 'El estudiante', 'b', 3, 'El complemento directo recibe la acción del verbo y responde a "¿qué leyó?". En este caso, "el ensayo crítico" es lo que se leyó. Se puede sustituir por "lo": "lo leyó atentamente".');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué características tiene la trama expositiva?', 'Presenta información de forma clara y ordenada con propósito explicativo, usando definiciones, ejemplos, comparaciones y datos', 'Defiende una postura con argumentos', 'Describe lugares u objetos', 'Cuenta hechos en secuencia temporal', 'a', 1, 'La trama expositiva organiza información para explicar un tema. Recursos típicos: definiciones, clasificaciones, ejemplos, comparaciones, causa-efecto. Predomina en textos académicos y divulgativos.'),
      (v_semana_id, '¿Qué distingue a una crónica periodística?', 'Es ficción literaria pura', 'Solo presenta datos sin estilo', 'Combina información veraz sobre hechos reales con un estilo personal y narrativo del periodista, ofreciendo contexto e interpretación', 'Es solo opinión sin hechos', 'c', 2, 'La crónica narra hechos reales con cierto orden cronológico, pero incorpora la mirada del cronista: descripciones evocadoras, observaciones personales, contexto histórico y voz propia.'),
      (v_semana_id, '¿Para qué sirve un texto instructivo?', 'Expresar emociones', 'Guiar al lector paso a paso para realizar una tarea o procedimiento (recetas, manuales, instructivos)', 'Convencer al lector', 'Entretener narrativamente', 'b', 3, 'El texto instructivo da indicaciones claras y ordenadas para ejecutar acciones: armar muebles, cocinar, usar aparatos. Usa imperativos, numeración o viñetas, y lenguaje preciso.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué niveles de comprensión lectora existen?', 'Únicamente memorización', 'Nivel literal (qué dice el texto), inferencial (qué se deduce) y crítico-valorativo (qué juicio se forma sobre el texto)', 'Solo lectura en voz alta', 'Solo el nivel literal', 'b', 1, 'La comprensión lectora va de identificar información explícita (literal), a deducir lo no dicho (inferencial), hasta evaluar críticamente el texto, su validez, propósito y calidad (crítico-valorativo).'),
      (v_semana_id, '¿Qué es una inferencia textual?', 'Un dato explícito del texto', 'Una opinión personal sin base', 'Una traducción del texto', 'Una conclusión extraída del texto a partir de pistas, conectando información explícita con conocimientos previos', 'd', 2, 'Inferir es leer "entre líneas": deducir lo no dicho explícitamente combinando pistas textuales con saberes previos. Si un texto menciona "tomó el paraguas y salió", inferimos que llovía.'),
      (v_semana_id, '¿Cómo se identifica el propósito comunicativo de un texto?', 'Por la editorial que lo publica', 'Solo por el título', 'Analizando qué busca el autor (informar, persuadir, narrar, instruir, expresar emociones), a quién se dirige y qué efecto pretende provocar', 'Por la longitud del texto', 'c', 3, 'Reconocer el propósito implica identificar la intención del autor: informar objetivamente, convencer de algo, contar una historia, dar instrucciones, expresar sentimientos o entretener.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un texto académico?', 'Solo libros de texto', 'Cualquier texto escolar', 'Solo escritos de profesores', 'Texto producido en contexto educativo o de investigación con lenguaje formal, objetividad, estructura clara, fundamentación y aparato crítico (citas, referencias)', 'd', 1, 'Los textos académicos (ensayos, monografías, reportes, artículos científicos) se distinguen por rigor metodológico, lenguaje preciso, fundamentación con fuentes citadas y propósito de construir conocimiento.'),
      (v_semana_id, '¿Cuáles son las etapas del proceso de escritura?', 'Planificación (qué decir, cómo, a quién), redacción del borrador, revisión (contenido y forma), corrección y edición final', 'Solo entregar el primer intento', 'Únicamente revisar ortografía', 'Solo redactar', 'a', 2, 'Escribir bien es proceso: planear (definir tema, estructurar ideas), borrar (escribir sin perfeccionismo), revisar (mejorar contenido y claridad), corregir (gramática, ortografía) y editar (presentación final).'),
      (v_semana_id, '¿Por qué es importante citar fuentes en textos académicos?', 'Por reconocimiento ético del trabajo intelectual ajeno, para evitar plagio, dar credibilidad y permitir verificación al lector', 'No es realmente necesario', 'Para hacer el texto más largo', 'Solo si lo pide el profesor', 'a', 3, 'Citar reconoce a quien aportó las ideas (ética), evita el plagio (legal), respalda los argumentos propios (rigor) y permite a otros consultar las fuentes para profundizar (utilidad).');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué estructura básica tiene un ensayo argumentativo?', 'Solo introducción y conclusión', 'Introducción con tesis clara, desarrollo con argumentos sólidos y refutación de contraargumentos, conclusión que reafirma la postura', 'Cualquier orden funciona', 'Solo desarrollo', 'b', 1, 'El ensayo argumentativo presenta una tesis (postura), la sustenta con argumentos (datos, ejemplos, autoridades, razonamientos), considera objeciones, y cierra con conclusión que sintetiza y reafirma.'),
      (v_semana_id, '¿Qué tipos de argumentos son más sólidos?', 'Solo los basados en sentimientos', 'Argumentos de tradición exclusivamente', 'Aquellos basados en datos verificables, evidencia empírica, autoridades reconocidas, razonamientos lógicos y ejemplos pertinentes', 'Apelaciones emotivas únicamente', 'c', 2, 'Los argumentos sólidos se apoyan en hechos comprobables, estudios serios, expertos reconocidos en su campo, lógica coherente y ejemplos significativos. Las falacias se basan en autoridad ilegítima, emociones o tradición sin fundamento.'),
      (v_semana_id, '¿Qué es una falacia argumentativa?', 'Un razonamiento aparentemente válido pero defectuoso lógicamente, que busca persuadir sin sustento real', 'Un argumento muy bueno', 'Una palabra grandilocuente', 'Solo una mentira directa', 'a', 3, 'Las falacias son trampas argumentativas: ataques personales (ad hominem), autoridad ilegítima, generalizaciones apresuradas, falsas dicotomías, etc. Reconocerlas protege de la manipulación.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué son los registros lingüísticos?', 'Solo dialectos antiguos', 'Idiomas distintos', 'Variantes del lenguaje según el grado de formalidad y contexto comunicativo: formal (situaciones serias) e informal (cotidianas)', 'Errores en el habla', 'c', 1, 'Adaptamos nuestro lenguaje según situación: formal en entrevistas laborales, ensayos, oficios; informal con amigos, familia, mensajes personales. Saber alternar registros es competencia comunicativa clave.'),
      (v_semana_id, '¿Por qué el español de México tiene características únicas?', 'No tiene características propias', 'Por imitar al español ibérico', 'Porque está mal hablado', 'Por el contacto histórico con lenguas indígenas, evolución particular y creatividad de sus hablantes, generando vocabulario, entonación y expresiones propias', 'd', 2, 'El español mexicano integra préstamos del náhuatl (chocolate, aguacate, tomate), del maya y otras lenguas, junto con expresiones propias y entonación distintiva, fruto de su historia y vitalidad.'),
      (v_semana_id, '¿Qué actitud debemos tener ante variantes lingüísticas distintas a la propia?', 'Ignorarlas', 'Respetarlas como expresiones legítimas de la diversidad cultural y comunicativa, valorando la riqueza que aportan', 'Considerarlas erróneas', 'Imponerlas', 'b', 3, 'Cada variante (de país, región, grupo social) es legítima y refleja identidad cultural. No hay variantes "mejores" o "peores" del español, sino apropiadas a su contexto. La diversidad enriquece la lengua.');
  END IF;
END $$;

-- ----------- Lengua y comunicación I (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Lengua y comunicación I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Lengua y comunicación I" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué la competencia comunicativa es esencial en la vida profesional?', 'Solo en algunos trabajos especializados', 'Permite expresar ideas con claridad, persuadir, negociar, redactar documentos profesionales, presentar propuestas y construir relaciones laborales efectivas', 'Solo importa el conocimiento técnico', 'No tiene relación con el éxito laboral', 'b', 1, 'En cualquier profesión se requiere comunicar bien: explicar a clientes, negociar con colegas, redactar informes, hacer presentaciones, escribir correos efectivos. Los expertos comunicativos suelen tener más oportunidades.'),
      (v_semana_id, '¿Cómo seguir desarrollando habilidades comunicativas?', 'Evitando situaciones comunicativas desafiantes', 'Esperando aprenderlas pasivamente', 'Leer ampliamente, escribir regularmente diversos tipos de texto, exponer oralmente, escuchar críticamente y solicitar retroalimentación constructiva', 'Solo estudiando gramática', 'c', 2, 'La competencia comunicativa se desarrolla con práctica activa y diversa: lectura amplia, escritura variada con revisión, participación oral en debates y exposiciones, y apertura a recibir retroalimentación.'),
      (v_semana_id, '¿Cuál es el valor de dominar la lengua materna?', 'Únicamente impresionar a otros', 'No tiene valor práctico', 'Solo cumplir con la escuela', 'Es base del pensamiento, la identidad cultural, la participación democrática, el acceso al conocimiento y la realización personal y profesional', 'd', 3, 'Dominar la lengua materna es dominar el instrumento con que pensamos, nos identificamos culturalmente, participamos socialmente, accedemos al saber y nos realizamos. Es una de las herramientas más poderosas de la vida.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es el pensamiento computacional?', 'Memorizar comandos', 'Solo saber usar computadoras', 'Una forma de resolver problemas que combina descomposición, reconocimiento de patrones, abstracción y diseño de algoritmos', 'Programar en cualquier lenguaje', 'c', 1, 'El pensamiento computacional es un enfoque sistemático para abordar problemas: descomponerlos en partes, identificar patrones, generalizar (abstracción) y diseñar pasos claros (algoritmos) para resolverlos.'),
      (v_semana_id, '¿Qué significa "descomponer un problema"?', 'Dividirlo en subproblemas más pequeños y manejables que se pueden resolver individualmente', 'Romperlo físicamente', 'Olvidarlo', 'Ignorar partes complicadas', 'a', 2, 'La descomposición es estrategia clave: un problema complejo (organizar un evento) se divide en tareas más simples (invitar, lugar, comida, etc.) que se resuelven por separado para luego integrar.'),
      (v_semana_id, '¿Para qué sirve la abstracción en pensamiento computacional?', 'Identificar lo esencial de un problema, ignorar detalles irrelevantes y construir modelos generales aplicables a casos similares', 'Solo para hablar bonito', 'Hacer las cosas más complicadas', 'Esconder información esencial', 'a', 3, 'Abstraer es enfocarse en lo importante. Un mapa abstrae el territorio mostrando lo relevante (calles) y omitiendo detalles innecesarios. En programación, permite crear soluciones reutilizables.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un algoritmo?', 'Un programa de computadora', 'Solo código de programación', 'Una secuencia ordenada y finita de pasos claros para resolver un problema o alcanzar un objetivo', 'Una fórmula matemática solamente', 'c', 1, 'Un algoritmo es un conjunto de instrucciones ordenadas que llevan de un estado inicial a un resultado deseado. Existen en la vida diaria: una receta de cocina es un algoritmo culinario.'),
      (v_semana_id, '¿Cuáles son las características de un buen algoritmo?', 'Preciso, claro, finito (termina), eficiente (resuelve con mínimos recursos) y correcto (produce el resultado esperado)', 'Usar muchas variables', 'Estar escrito en inglés siempre', 'Ser muy largo y complejo', 'a', 2, 'Un buen algoritmo tiene pasos sin ambigüedad, finaliza en tiempo razonable, resuelve correctamente el problema y lo hace usando recursos eficientemente (tiempo, memoria).'),
      (v_semana_id, '¿Qué herramienta visual representa el flujo de un algoritmo?', 'Hoja de cálculo', 'Diagrama de flujo (con símbolos como rectángulos para procesos, rombos para decisiones, óvalos para inicio/fin)', 'Mapa mental', 'Tabla de datos', 'b', 3, 'Los diagramas de flujo visualizan algoritmos con símbolos estandarizados conectados por flechas. Facilitan diseño, comprensión y comunicación de la lógica antes de programar.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una variable en programación?', 'Un símbolo matemático', 'Solo números', 'Algo que cambia al azar', 'Un espacio en la memoria identificado con un nombre, que almacena un valor que puede cambiar durante la ejecución del programa', 'd', 1, 'Una variable es como una caja etiquetada en memoria donde guardamos información. Por ejemplo, "edad = 17" guarda el valor 17 en una variable llamada "edad" que podemos consultar y modificar.'),
      (v_semana_id, '¿Cuáles son los tipos de datos básicos en programación?', 'Enteros (int), decimales (float), texto (string), lógicos (boolean: verdadero/falso) y otros como listas o arreglos', 'Solo texto', 'Solo números', 'Únicamente decimales', 'a', 2, 'Los tipos básicos clasifican los datos: int (números enteros), float (con decimales), string (texto entre comillas), boolean (true/false). Cada tipo permite operaciones específicas.'),
      (v_semana_id, '¿Qué tipo de dato es "Hola Mundo"?', 'Booleano', 'Entero (int)', 'Decimal (float)', 'Cadena de texto (string)', 'd', 3, 'El texto entre comillas es una cadena (string). Los strings pueden contener letras, números, símbolos y espacios, y se manipulan con operaciones específicas como concatenación o búsqueda.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué hace una estructura condicional (if-else)?', 'Repetir acciones siempre', 'Ejecutar diferentes bloques de código según se cumpla o no una condición', 'Solo imprimir mensajes', 'Almacenar datos', 'b', 1, 'Las condicionales permiten que el programa tome decisiones: "si llueve, llevar paraguas; si no, llevar gorra". En código: if (condición) { hacer A } else { hacer B }.'),
      (v_semana_id, '¿Para qué sirven los ciclos o bucles (loops)?', 'Detener el programa', 'Solo dibujar gráficos', 'Repetir un bloque de código múltiples veces, ya sea un número fijo (for) o mientras se cumpla una condición (while)', 'Ejecutar una vez', 'c', 2, 'Los bucles automatizan tareas repetitivas. "for i in range(10)" ejecuta algo 10 veces. "while x > 0" repite mientras x sea positivo. Son esenciales para procesar listas, validar datos o crear animaciones.'),
      (v_semana_id, '¿Qué es una función en programación?', 'Solo el resultado final', 'Un bloque de código reutilizable que realiza una tarea específica, recibe parámetros (entradas) y puede devolver un resultado (salida)', 'Una variable', 'Un mensaje de error', 'b', 3, 'Las funciones encapsulan lógica reutilizable. En lugar de repetir código, defines una función ("calcular_iva") que recibe datos, los procesa y devuelve resultado. Hace los programas modulares y mantenibles.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son lenguajes de programación populares para principiantes?', 'Únicamente Assembly', 'Solo HTML (que no es programación)', 'Solo C++', 'Python, JavaScript, Scratch (visual) y Block-based, conocidos por su sintaxis amigable y comunidad activa', 'd', 1, 'Python es ideal por sintaxis clara y versatilidad. Scratch es visual con bloques arrastrables, perfecto para iniciar. JavaScript es esencial en web. Tienen tutoriales y comunidades enormes.'),
      (v_semana_id, '¿Qué es un IDE (Integrated Development Environment)?', 'Una aplicación que integra herramientas para desarrollar software: editor de código, compilador, depurador (debugger) y otras utilidades', 'Una computadora especial', 'Una página web', 'Un lenguaje de programación', 'a', 2, 'Los IDEs (VS Code, PyCharm, IntelliJ) facilitan programar al unir editor con resaltado de sintaxis, autocompletado, ejecución de código, depuración y control de versiones en una sola interfaz.'),
      (v_semana_id, '¿Qué es la depuración (debugging)?', 'Compilar el código', 'El proceso de identificar, localizar y corregir errores (bugs) en un programa', 'Solo ejecutar el código', 'Borrar el programa', 'b', 3, 'Debuggear es habilidad esencial: detectar dónde y por qué falla un programa, usando mensajes de error, prints estratégicos o herramientas de depuración para corregir defectos lógicos o sintácticos.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la World Wide Web?', 'Solo redes sociales', 'Únicamente correo electrónico', 'Lo mismo que Internet', 'Un servicio que opera sobre Internet, basado en páginas web (HTML), enlaces y navegadores, accesibles mediante URLs', 'd', 1, 'Internet es la infraestructura global de redes. La Web es uno de sus servicios: documentos hipertexto interconectados (páginas web) accesibles vía navegador. También hay otros servicios como email, FTP, etc.'),
      (v_semana_id, '¿Cómo funciona básicamente una página web?', 'Solo con cables físicos', 'Magia digital', 'El navegador (cliente) solicita la página al servidor mediante HTTP, el servidor envía HTML/CSS/JavaScript, y el navegador los procesa y muestra al usuario', 'Por ondas de radio', 'c', 2, 'El modelo cliente-servidor: tu navegador pide datos, el servidor responde con código (HTML estructura, CSS estilos, JavaScript interactividad), y el navegador interpreta todo para mostrar la página final.'),
      (v_semana_id, '¿Qué importancia tienen los datos en la era digital?', 'Ninguna especial', 'Son el "petróleo del siglo XXI": empresas y gobiernos los usan para tomar decisiones, personalizar servicios, hacer inteligencia artificial y modelar comportamientos', 'Solo tienen valor estadístico', 'Son irrelevantes', 'b', 3, 'Los datos masivos (Big Data) impulsan la economía digital, la IA, la medicina personalizada, el marketing dirigido, las ciudades inteligentes. Su valor genera también debates sobre privacidad y poder.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la huella digital?', 'Un archivo de fotos', 'Una marca de dedo en la pantalla', 'El rastro de información que dejamos al usar internet: publicaciones, búsquedas, ubicaciones, compras, etc., que puede ser permanente y rastreable', 'Solo el historial del navegador', 'c', 1, 'Cada acción en internet deja rastro: posts, likes, búsquedas, ubicaciones GPS, compras. Esta huella digital puede afectar reputación, oportunidades laborales y privacidad. Es importante gestionarla conscientemente.'),
      (v_semana_id, '¿Cuáles son buenas prácticas de seguridad digital?', 'Compartir contraseñas con amigos', 'Usar la misma contraseña en todos lados', 'Aceptar todos los permisos sin leer', 'Contraseñas fuertes y únicas, autenticación de dos factores, software actualizado, no abrir enlaces sospechosos, respaldar datos y verificar privacidad de cuentas', 'd', 2, 'La ciberseguridad personal requiere prácticas básicas: contraseñas robustas distintas por cuenta, segundo factor (código por SMS o app), actualizaciones regulares, escepticismo ante enlaces o adjuntos, y respaldos.'),
      (v_semana_id, '¿Qué responsabilidades éticas implica el uso de tecnología?', 'Solo cumplir leyes mínimas', 'No copiar trabajos ajenos', 'Respetar derechos de autor, proteger privacidad propia y ajena, no acosar, verificar información antes de compartir, usar tecnología para fines constructivos y reflexionar sobre impactos sociales', 'No hay responsabilidades', 'c', 3, 'La ética digital incluye: respeto a la propiedad intelectual, privacidad, no participación en ciberacoso, consumo crítico de información, y consideración de cómo nuestras acciones digitales afectan a otros y a la sociedad.');
  END IF;
END $$;

-- ----------- Pensamiento digital y programación básica (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Pensamiento digital y programación básica'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Pensamiento digital y programación básica" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué el pensamiento computacional es valioso aunque no se sea programador?', 'Solo importa para informáticos', 'Desarrolla habilidades de resolución de problemas, organización, pensamiento lógico y diseño de soluciones aplicables a cualquier ámbito de la vida', 'Solo aplica a tecnología', 'No es valioso fuera de la programación', 'b', 1, 'El pensamiento computacional es habilidad transversal: ayuda a abordar problemas complejos en cualquier campo (gestión, ciencias, arte, vida personal) descomponiendo, reconociendo patrones y diseñando soluciones sistemáticas.'),
      (v_semana_id, '¿Qué impacto tiene la inteligencia artificial en la sociedad actual?', 'Está transformando trabajo, salud, educación, transporte, comunicación y entretenimiento, planteando enormes oportunidades y también retos éticos importantes', 'Solo afecta a programadores', 'Es solo ciencia ficción', 'Ninguno aún', 'a', 2, 'La IA ya está presente: asistentes virtuales, recomendaciones de contenido, diagnósticos médicos, vehículos autónomos. Plantea retos: empleos, sesgos algorítmicos, privacidad, autonomía humana y necesidad de regulación.'),
      (v_semana_id, '¿Cómo seguir desarrollando habilidades digitales?', 'Solo en clases formales', 'Evitando tecnología nueva', 'Esperando aprenderlas pasivamente', 'Practicando con tutoriales en línea (Codecademy, Khan Academy, freeCodeCamp), construyendo proyectos personales, participando en comunidades y manteniéndose curioso ante nuevas tecnologías', 'd', 3, 'Las habilidades digitales se desarrollan haciendo: tutoriales gratuitos en línea, proyectos prácticos pequeños y crecientes, comunidades como Stack Overflow o GitHub, y curiosidad constante por experimentar.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se entiende la sexualidad humana de manera integral?', 'Como dimensión integral que abarca aspectos biológicos, psicológicos, sociales, culturales, éticos y afectivos a lo largo de toda la vida', 'Solo desde la adultez', 'Solo como acto biológico reproductivo', 'Únicamente como atracción física', 'a', 1, 'La OMS define la sexualidad como aspecto central del ser humano que incluye sexo, identidad, roles, orientación, erotismo, placer, intimidad y reproducción, expresada en pensamientos, fantasías, deseos, valores, actitudes y prácticas.'),
      (v_semana_id, '¿Cuál es la diferencia entre sexo y género?', 'Solo importa el género', 'Son lo mismo', 'El sexo se refiere a características biológicas (cromosómicas, anatómicas, hormonales); el género es construcción sociocultural sobre lo que significa ser hombre, mujer u otra identidad en una cultura', 'Solo importa el sexo biológico', 'c', 2, 'El sexo es biológico (cuerpo). El género es sociocultural: roles, expectativas, comportamientos asignados según la sociedad. Diferencias importantes para entender desigualdad, identidad y derechos.'),
      (v_semana_id, '¿Por qué la educación sexual integral es importante para los jóvenes?', 'Solo importa cuando se es adulto', 'Solo para evitar embarazos', 'Brinda información veraz para tomar decisiones libres y responsables sobre el cuerpo, las relaciones, prevenir riesgos, ejercer derechos y vivir la sexualidad de forma plena y respetuosa', 'No es necesaria', 'c', 3, 'La educación sexual integral, recomendada por OMS y UNESCO, abarca anatomía, relaciones, derechos, valores, prevención y diversidad. Permite decisiones informadas, previene abusos, ETS y embarazos no deseados, y promueve relaciones sanas.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los principales órganos del aparato reproductor femenino?', 'Solo los visibles externamente', 'Únicamente los ovarios', 'Los testículos', 'Internos: ovarios, trompas de Falopio, útero, vagina; externos: vulva (labios mayores y menores, clítoris, meato urinario)', 'd', 1, 'El aparato reproductor femenino tiene órganos internos (ovarios donde maduran óvulos, trompas que los conducen, útero donde se desarrolla el embarazo, vagina) y externos (la vulva, conocida en conjunto, no solo "vagina").'),
      (v_semana_id, '¿Cuáles son los principales órganos del aparato reproductor masculino?', 'Únicamente la próstata', 'Los ovarios', 'Solo el pene', 'Testículos (producción de espermatozoides y testosterona), epidídimo, conductos deferentes, vesículas seminales, próstata, uretra y pene', 'd', 2, 'El sistema reproductor masculino incluye: testículos (gónadas que producen espermatozoides y hormonas), conductos transportadores, glándulas accesorias (vesículas seminales, próstata) y pene como órgano copulador.'),
      (v_semana_id, '¿Qué es el ciclo menstrual?', 'Solo la menstruación', 'Proceso hormonal de aproximadamente 28 días que prepara al cuerpo femenino para un posible embarazo, incluyendo fases folicular, ovulatoria, lútea y menstrual', 'Algo que solo dura un día', 'Una enfermedad', 'b', 3, 'El ciclo menstrual coordina cambios hormonales y físicos: maduración de un óvulo, ovulación (liberación), preparación del endometrio, y si no hay fecundación, descamación del endometrio (menstruación). Conocerlo ayuda a la salud y planificación.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la identidad de género?', 'La vivencia interna y profunda del propio género que cada persona tiene, que puede coincidir o no con el sexo asignado al nacer', 'Solo binario hombre o mujer', 'La forma de vestir', 'Lo mismo que el sexo biológico', 'a', 1, 'La identidad de género es la percepción interna que cada persona tiene de su género (mujer, hombre, no binario, etc.). Puede coincidir con el sexo asignado (cisgénero) o no (transgénero, no binarie).'),
      (v_semana_id, '¿Qué es la orientación sexual?', 'La atracción afectiva, emocional y/o sexual de una persona hacia otras: heterosexual, homosexual, bisexual, asexual, pansexual, entre otras', 'Una elección consciente que se cambia a voluntad', 'Solo se manifiesta en la adultez', 'La identidad de género', 'a', 2, 'La orientación sexual describe hacia quién(es) se experimenta atracción. Es distinta de la identidad de género. Las personas pueden ser heterosexuales, homosexuales (gay/lesbiana), bisexuales, asexuales (sin atracción sexual), entre otras orientaciones.'),
      (v_semana_id, '¿Por qué es importante respetar la diversidad sexual y de género?', 'Es un derecho humano fundamental: cada persona tiene derecho a su identidad y orientación sin discriminación, y el respeto promueve sociedades más justas, libres y saludables', 'No es realmente importante', 'Solo importa en algunas culturas', 'Solo es opcional', 'a', 3, 'Los derechos humanos protegen a todas las personas independientemente de orientación o identidad. La discriminación por estos motivos viola derechos básicos, daña a personas y comunidades, y debilita democracia y convivencia.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué incluye la salud sexual y reproductiva?', 'Estado de bienestar físico, mental y social en relación con la sexualidad: ausencia de enfermedades pero también placer, seguridad, libertad de coerción y derechos', 'Únicamente atención médica al embarazo', 'Solo ausencia de enfermedades', 'Solo planificación familiar', 'a', 1, 'La OMS define la salud sexual integralmente: no solo ausencia de ITS o disfunciones, sino bienestar pleno que incluye relaciones placenteras seguras y respetuosas, libres de violencia, con acceso a información y servicios.'),
      (v_semana_id, '¿Cuáles son los métodos anticonceptivos más comunes y efectivos?', 'De barrera (condón masculino y femenino), hormonales (píldora, parche, anillo, inyección, implante), DIU, anticoncepción de emergencia, definitivos (vasectomía, ligadura)', 'Solo el condón', 'Únicamente abstinencia', 'Solo la píldora', 'a', 2, 'Existen múltiples métodos con distintas eficacias y características. Solo el condón previene también ITS. La elección depende de cada persona/pareja, su salud, momento vital y preferencias, idealmente con asesoría profesional.'),
      (v_semana_id, '¿Qué son las infecciones de transmisión sexual (ITS)?', 'Únicamente VIH', 'Infecciones causadas por bacterias, virus o parásitos que se transmiten principalmente por contacto sexual; incluyen sífilis, gonorrea, clamidia, VPH, herpes, hepatitis B, VIH, entre otras', 'Algo que solo afecta a algunos grupos', 'Solo problemas leves', 'b', 3, 'Las ITS son enfermedades comunes con consecuencias variables, desde tratables (gonorrea, sífilis) hasta crónicas (VIH, herpes). La prevención (condón, vacunas como VPH) y diagnóstico oportuno son fundamentales para la salud individual y pública.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza a una relación afectiva sana?', 'Control absoluto de una persona sobre otra', 'Dependencia emocional total', 'Respeto mutuo, comunicación honesta, confianza, igualdad, consentimiento, apoyo, autonomía individual y resolución pacífica de conflictos', 'Sumisión de uno de los miembros', 'c', 1, 'Las relaciones sanas se basan en respeto a la individualidad, comunicación abierta, equilibrio de poder, decisiones compartidas, libertad de cada miembro y manejo constructivo de desacuerdos. Son nutricias, no asfixiantes.'),
      (v_semana_id, '¿Qué es el consentimiento sexual?', 'Algo implícito o asumido', 'Acuerdo libre, consciente, informado, específico, reversible y entusiasta entre las personas involucradas, sin presión, manipulación ni incapacidad para decidir', 'Solo importa la primera vez', 'Una formalidad innecesaria', 'b', 2, 'El consentimiento debe ser explícito y verificado (no asumido), libre (sin coacción), informado, específico para cada acto, y reversible (se puede retirar en cualquier momento). Sin consentimiento, hay agresión.'),
      (v_semana_id, '¿Qué señales indican una relación de violencia o abuso?', 'Diversidad de gustos personales', 'Control excesivo, celos extremos, aislamiento de seres queridos, humillaciones, amenazas, agresiones físicas, presión sexual, manipulación emocional o económica', 'Discusiones ocasionales', 'Diferencias de opinión normales', 'b', 3, 'La violencia no es solo física: incluye psicológica (humillaciones, control), económica (controlar dinero) y sexual (presión o coacción). Reconocer señales tempranas (celos extremos, aislamiento, manipulación) protege la integridad personal.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la equidad de género?', 'No tomar en cuenta las diferencias', 'Justicia en el trato y oportunidades entre géneros, reconociendo desigualdades históricas y aplicando medidas para superarlas, garantizando los mismos derechos a todas las personas', 'Tratar a todas las personas exactamente igual sin considerar circunstancias', 'Solo aplicar a mujeres', 'b', 1, 'La equidad reconoce que las personas parten de situaciones desiguales y aplica medidas para nivelar oportunidades. La igualdad busca el resultado de mismos derechos para todas las personas, sin importar el género.'),
      (v_semana_id, '¿Cómo se manifiestan las desigualdades de género en la sociedad?', 'Solo en países subdesarrollados', 'Ya no existen', 'Brecha salarial, división desigual del trabajo doméstico, violencia de género, menor representación política, estereotipos limitantes, acceso desigual a oportunidades', 'Solo afectan a mujeres en zonas rurales', 'c', 2, 'Las desigualdades de género persisten en distintos grados en todo el mundo: ingresos, doble jornada (trabajo + hogar), violencia machista, brechas en política y liderazgo, estereotipos sobre profesiones, discriminación. Reconocerlas es paso para superarlas.'),
      (v_semana_id, '¿Qué pueden hacer los jóvenes por la equidad de género?', 'Solo es asunto de gobiernos', 'No tienen capacidad de influir', 'Esperar a que cambien las cosas solas', 'Cuestionar estereotipos en su entorno, distribuir tareas equitativamente, respetar autonomía de pares, denunciar violencia, apoyar liderazgo femenino y de identidades diversas, educarse sobre el tema', 'd', 3, 'El cambio cultural empieza en lo cotidiano: cuestionar bromas sexistas, compartir equitativamente tareas domésticas en familia, respetar elecciones ajenas, apoyar a víctimas de violencia, valorar liderazgo diverso. Cada acción suma.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué es importante el autocuidado en la sexualidad?', 'Solo para evitar embarazos', 'Únicamente por miedo a enfermedades', 'Permite tomar decisiones informadas, prevenir riesgos físicos y emocionales, construir relaciones sanas y vivir la sexualidad de forma libre, segura y placentera', 'No es importante', 'c', 1, 'El autocuidado integra prevención (anticoncepción, protección contra ITS), atención emocional (relaciones sanas, autoestima), conocimiento del propio cuerpo y respeto a sus tiempos y límites. Es base de bienestar sexual integral.'),
      (v_semana_id, '¿Qué hacer ante una situación de violencia sexual o de género?', 'Quedarse callado por vergüenza', 'Buscar ayuda en personas de confianza, instituciones especializadas (línea contra violencia, centros de salud, ministerio público), no autoculparse y conocer derechos', 'Asumir que es culpa propia', 'Resolverlo en privado sin apoyo', 'b', 2, 'Ante violencia: la víctima nunca es culpable. Buscar ayuda inmediata: línea 911, instituciones contra violencia (Locatel, INMUJERES), centros de salud (atención médica y psicológica), denuncia legal. El silencio perpetúa la violencia.'),
      (v_semana_id, '¿Qué papel cumple la familia en la educación sexual?', 'Únicamente cuando hay problemas', 'Ninguno, es solo tema escolar', 'Solo prohibir y castigar', 'Es fundamental: brindar información veraz, valores, escucha sin juicio, comunicación abierta y acompañamiento, complementando lo que se aprende en otros espacios', 'd', 3, 'La familia idealmente acompaña con comunicación honesta y respetuosa, ofrece valores y escucha sin juicio. Cuando esto no es posible, otros adultos confiables, escuela y profesionales son recursos válidos para los jóvenes.');
  END IF;
END $$;

-- ----------- Sexualidad y género (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Sexualidad y género'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Sexualidad y género" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se relaciona la sexualidad con el proyecto de vida personal?', 'Solo importa al formar pareja', 'Solo cuestión privada sin trascendencia', 'No tiene relación', 'Es dimensión integral del proyecto vital: incluye decisiones sobre relaciones, salud, paternidad/maternidad, identidad, valores y cómo vivir la propia humanidad plenamente', 'd', 1, 'La sexualidad atraviesa decisiones vitales importantes: relaciones, formación de familia, identidad personal, salud, valores, autoexpresión. Integrarla conscientemente al proyecto de vida favorece bienestar y autenticidad.'),
      (v_semana_id, '¿Cuáles son derechos sexuales y reproductivos fundamentales?', 'Privilegios opcionales', 'Solo derecho a información', 'Solo aplican a adultos casados', 'Decidir libremente sobre el propio cuerpo, recibir educación e información, acceder a servicios de salud, ejercer la sexualidad sin discriminación o violencia, decidir si tener hijos y cuándo', 'd', 2, 'Los derechos sexuales y reproductivos, reconocidos internacionalmente, son derechos humanos. Incluyen autonomía corporal, información veraz, atención médica, libertad ante violencia, decisión reproductiva, no discriminación. Son base de dignidad y libertad.'),
      (v_semana_id, '¿Qué actitudes favorecen una vivencia sana de la sexualidad?', 'Aislamiento e incomunicación', 'Vergüenza, silencio y desinformación', 'Información veraz, autoconocimiento, respeto a sí mismo y a otros, comunicación honesta, responsabilidad, libertad de decisión y reconocimiento de la diversidad', 'Imposiciones rígidas sin reflexión', 'c', 3, 'Vivir la sexualidad sanamente requiere informarse de fuentes confiables, conocerse a sí mismo, respetarse y respetar a otros, comunicar honestamente, asumir responsabilidad de decisiones, ejercer libertad informada y abrazar diversidad humana.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué implica iniciar el bachillerato como nueva etapa formativa?', 'Solo continuar estudiando como antes', 'Asumir mayor responsabilidad personal, desarrollar autonomía, profundizar conocimientos, decidir sobre futuro académico-profesional y consolidar identidad personal', 'Únicamente cumplir con asistencia', 'Es lo mismo que la secundaria', 'b', 1, 'El bachillerato marca transición hacia mayor autonomía. Demanda responsabilidad propia en estudio, gestión del tiempo, decisiones sobre vocación, fortalecimiento de identidad y preparación para educación superior o vida laboral.'),
      (v_semana_id, '¿Qué es la identidad estudiantil?', 'La forma en que cada estudiante se reconoce y posiciona como miembro de una comunidad educativa, con valores, metas, hábitos y formas de aprender propias', 'Únicamente el carnet escolar', 'Una etiqueta sin importancia', 'Solo el uniforme escolar', 'a', 2, 'La identidad estudiantil incluye reconocerse como aprendiz: con metas educativas, hábitos de estudio, vinculación con la institución y compañeros, y valores que guían el comportamiento académico.'),
      (v_semana_id, '¿Por qué es importante el sentido de pertenencia a la institución educativa?', 'Favorece motivación, integración con compañeros y docentes, mejor desempeño, bienestar emocional y aprovechamiento de oportunidades que ofrece la escuela', 'No tiene impacto real', 'Solo para recibir becas', 'Únicamente por presión social', 'a', 3, 'Sentirse parte de la institución mejora la experiencia educativa: motiva, facilita relaciones positivas, fomenta participación y aumenta la posibilidad de aprovechar recursos y oportunidades.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son hábitos de estudio efectivos?', 'Estudiar todo la noche anterior al examen', 'Estudiar solo cuando hay tiempo libre', 'Memorizar sin comprender', 'Espacios y horarios fijos, planificación, sesiones distribuidas en el tiempo, descansos, técnicas activas (resúmenes, mapas, autoexplicación), revisión periódica', 'd', 1, 'La ciencia del aprendizaje muestra que estudiar regularmente con sesiones distribuidas (no concentradas), técnicas activas (no solo releer) y descansos genera mejor retención que cargas intensivas de último minuto.'),
      (v_semana_id, '¿Qué técnica de estudio favorece la comprensión y retención?', 'Releer mecánicamente', 'Técnicas activas: hacer resúmenes con palabras propias, mapas conceptuales, autoexplicación, ejercicios de práctica, evocación libre y enseñar a otros', 'Solo escuchar pasivamente', 'Subrayar todo el texto', 'b', 2, 'Las técnicas activas exigen procesar la información: reformular con palabras propias, conectar conceptos visualmente, autoevaluarse, practicar problemas, recordar sin mirar el texto y enseñar (lo que más consolida).'),
      (v_semana_id, '¿Por qué es importante gestionar bien el tiempo de estudio?', 'Solo importa en exámenes', 'Solo por obligación escolar', 'Permite cumplir tareas, evitar acumulación, equilibrar estudio con descanso y vida personal, y reducir estrés mientras se logran objetivos académicos', 'No es realmente importante', 'c', 3, 'La gestión del tiempo permite distribuir esfuerzo, evitar el agobio de último momento, equilibrar diversas áreas vitales (estudio, deporte, familia, descanso) y mantener salud mental mientras se cumplen metas.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es el aprendizaje significativo según David Ausubel?', 'Repetir hasta retener', 'Aquel en que el estudiante relaciona la nueva información con conocimientos previos de manera sustancial, construyendo comprensión profunda y duradera', 'Solo aprender lo que gusta', 'Memorizar palabra por palabra', 'b', 1, 'El aprendizaje significativo, opuesto al memorístico, ocurre cuando integramos nuevos conocimientos a estructuras mentales previas. Esto los hace duraderos, transferibles y útiles para resolver problemas reales.'),
      (v_semana_id, '¿Qué es la metacognición?', 'Memorizar mejor', 'Pensar más rápido', 'Solo prestar atención', 'La capacidad de reflexionar sobre los propios procesos de pensamiento y aprendizaje: saber qué se sabe, identificar dificultades y elegir estrategias para superarlas', 'd', 2, 'La metacognición es "pensar sobre el pensar": monitorear cómo aprendemos, identificar dónde fallamos, elegir estrategias, autoevaluarnos. Es habilidad clave para autonomía y éxito académico.'),
      (v_semana_id, '¿Cómo se desarrollan habilidades de pensamiento crítico?', 'Memorizando opiniones de expertos', 'Solo siguiendo instrucciones', 'Aceptando todo lo que se lee', 'Cuestionando información, analizando argumentos, considerando diferentes perspectivas, evaluando evidencias, distinguiendo hechos de opiniones y elaborando juicios fundamentados', 'd', 3, 'El pensamiento crítico se cultiva con práctica: hacer preguntas, contrastar fuentes, distinguir hechos de opiniones, evaluar evidencias, considerar contraargumentos. Es esencial en la era de información abundante y desinformación.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué es importante la salud emocional para el estudio?', 'Las emociones afectan motivación, concentración, memoria y rendimiento; cuidar la salud emocional favorece aprendizaje y bienestar integral', 'Solo en momentos de crisis', 'No tiene relación con el estudio', 'Solo importa el coeficiente intelectual', 'a', 1, 'Estudios neurocientíficos muestran que el estado emocional impacta la cognición. Ansiedad, depresión o estrés afectan atención, memoria y motivación. Cuidar emociones es base del rendimiento académico sostenible.'),
      (v_semana_id, '¿Qué estrategias ayudan a manejar el estrés académico?', 'Aislarse de los demás', 'Ignorar las señales de agotamiento', 'Planificar, dividir tareas grandes, técnicas de relajación (respiración, mindfulness), actividad física, sueño adecuado, alimentación balanceada y buscar apoyo cuando se necesita', 'Solo trabajar más duro', 'c', 2, 'El estrés se gestiona con multiples estrategias: planificación reduce sensación de descontrol, fragmentación hace tareas manejables, ejercicio y sueño regulan biológicamente, mindfulness baja la ansiedad, y el apoyo social es protector.'),
      (v_semana_id, '¿Cuándo es importante buscar ayuda profesional para asuntos emocionales?', 'Nunca, los problemas se resuelven solos', 'Solo si la familia lo decide', 'Solo en casos extremos de crisis suicida', 'Cuando malestares como tristeza, ansiedad o estrés persisten, interfieren con la vida diaria, o se experimentan pensamientos de daño propio o desesperanza profunda', 'd', 3, 'Pedir ayuda profesional es signo de fortaleza, no debilidad. Si los malestares persisten, afectan funcionamiento o aparecen pensamientos preocupantes, acudir a psicólogo o consejero escolar es la opción adecuada y efectiva.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza una buena convivencia escolar?', 'Solo tolerancia pasiva', 'Que todos sean iguales', 'Ausencia total de conflictos', 'Respeto a la diversidad, comunicación asertiva, resolución pacífica de conflictos, empatía, inclusión y construcción colectiva de un ambiente seguro para aprender', 'd', 1, 'La buena convivencia no es ausencia de diferencias, sino su gestión respetuosa. Implica reconocer la diversidad como valor, comunicarse asertivamente, resolver conflictos sin violencia y construir comunidad.'),
      (v_semana_id, '¿Qué habilidades favorecen el trabajo en equipo efectivo?', 'Solo trabajar individualmente', 'Imponer la propia opinión', 'Comunicación clara, escucha activa, distribución equitativa de tareas, respeto a aportes diversos, manejo constructivo de desacuerdos, compromiso compartido y reconocimiento mutuo', 'Evitar dar opiniones', 'c', 2, 'El trabajo en equipo eficaz requiere habilidades sociales: comunicar bien, escuchar genuinamente, asignar roles equitativamente, valorar la diversidad de aportes, resolver desacuerdos constructivamente y celebrar logros colectivos.'),
      (v_semana_id, '¿Qué es el bullying o acoso escolar y cómo enfrentarlo?', 'Bromas inofensivas que se deben aguantar', 'Conducta agresiva, sistemática y desigual entre pares; se enfrenta no participando, apoyando a víctimas, denunciando a adultos confiables y promoviendo cultura de respeto', 'Solo es problema de los débiles', 'Algo natural en la adolescencia', 'b', 3, 'El bullying es violencia repetida con desbalance de poder, no broma inocua. Causa daños profundos. Enfrentarlo requiere acción de toda la comunidad: víctimas buscan ayuda, testigos no callan ni participan, adultos intervienen, escuela previene.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la orientación vocacional?', 'Únicamente seguir lo que dicen los padres', 'Proceso reflexivo de autoconocimiento (intereses, aptitudes, valores) y exploración de opciones formativas y profesionales para tomar decisiones vocacionales informadas', 'Decidir profesión antes de los 12 años', 'Solo elegir según el dinero que se ganará', 'b', 1, 'La orientación vocacional combina conocerse a uno mismo (qué me gusta, en qué soy bueno, qué valoro) con conocer el mundo de las profesiones, para tomar decisiones formativas y laborales coherentes con uno mismo.'),
      (v_semana_id, '¿Qué factores conviene considerar al pensar en futuro académico-profesional?', 'Únicamente el prestigio social', 'Solo lo que dicen los demás', 'Intereses propios, aptitudes, valores personales, oportunidades del mercado laboral, condiciones económicas, gustos por entornos de trabajo y proyecto de vida amplio', 'Solo el sueldo esperado', 'c', 2, 'Una buena decisión vocacional integra factores personales (qué disfruto, en qué destaco, qué valoro) y contextuales (oportunidades laborales, condiciones económicas, ambiente de trabajo) en una visión amplia de vida.'),
      (v_semana_id, '¿Por qué es normal sentir incertidumbre vocacional en bachillerato?', 'Solo les pasa a algunos', 'Significa que se está fallando', 'Es etapa de exploración: aún se está construyendo identidad, conociendo el mundo laboral y experimentando intereses; la incertidumbre es parte natural del proceso de decisión madura', 'Indica falta de inteligencia', 'c', 3, 'La incertidumbre vocacional en bachillerato es normal y saludable: estás explorando quién eres y qué quieres. Mejor tomar decisiones informadas con dudas honestas que apresurar elecciones por presión externa.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tipos de recursos suelen ofrecer las instituciones educativas?', 'Bibliotecas físicas y digitales, laboratorios, asesorías académicas, orientación psicológica y vocacional, plataformas educativas, talleres extracurriculares, becas, eventos culturales', 'Solo aulas y maestros', 'Únicamente libros impresos', 'Solo cafetería', 'a', 1, 'Las instituciones suelen ofrecer múltiples recursos más allá del aula: bibliotecas (físicas y bases de datos digitales), laboratorios, tutorías, apoyo psicopedagógico, plataformas en línea, talleres, deporte, eventos. Aprovecharlos enriquece la formación.'),
      (v_semana_id, '¿Cómo aprovechar las plataformas educativas digitales?', 'Evitándolas si es posible', 'Solo para entregar tareas', 'Únicamente cuando lo pide el profesor', 'Acceder a materiales (videos, lecturas), realizar actividades, comunicarse con docentes y compañeros, organizar el aprendizaje, autoevaluarse y aprovechar recursos complementarios', 'd', 2, 'Las plataformas educativas modernas son ecosistemas completos: contenidos multimedia, foros, calendarios, evaluaciones, mensajería, recursos extra. Aprovecharlas activamente potencia el aprendizaje y desarrolla competencias digitales.'),
      (v_semana_id, '¿Qué precauciones tomar al usar tecnología para estudiar?', 'Confiar en la primera fuente que aparezca', 'Ninguna, todo recurso digital es bueno', 'Verificar fuentes confiables, evitar distracciones (redes sociales mientras estudias), proteger información personal, equilibrar pantalla con descanso visual, no copiar/plagiar', 'No usar tecnología en absoluto', 'c', 3, 'Tecnología bien usada potencia aprendizaje, mal usada lo entorpece. Cuidados básicos: verificar credibilidad de fuentes, gestionar distracciones, proteger privacidad, descansar la vista, citar fuentes para no plagiar.');
  END IF;
END $$;

-- ----------- Tutoría de ingreso I (preparatoria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tutoría de ingreso I'
    AND m.nivel = 'preparatoria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tutoría de ingreso I" (preparatoria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué actitudes favorecen el éxito académico sostenido en bachillerato?', 'Esperar que todo sea fácil', 'Compromiso, constancia, curiosidad, autodisciplina, apertura al aprendizaje, perseverancia ante dificultades, búsqueda de ayuda cuando se necesita y crecimiento como meta', 'Conformarse con el mínimo esfuerzo', 'Compararse negativamente con otros', 'b', 1, 'El éxito sostenido viene menos del talento innato y más de actitudes cultivables: compromiso con metas, constancia diaria, curiosidad, disciplina personal, mentalidad de crecimiento (errores como aprendizaje) y red de apoyo.'),
      (v_semana_id, '¿Por qué tener un proyecto de vida ayuda al estudiante?', 'Da dirección, motivación y sentido a las decisiones cotidianas, permite establecer metas claras, organizar el presente con vistas al futuro y enfrentar desafíos con propósito', 'Solo es un ejercicio escolar', 'No ayuda, mejor improvisar', 'Limita las opciones', 'a', 2, 'Un proyecto de vida (flexible, no rígido) orienta decisiones diarias, da sentido a esfuerzos académicos, prioriza acciones, motiva ante dificultades. No es camino inalterable, sino brújula adaptable que da rumbo personal.'),
      (v_semana_id, '¿Qué compromiso conviene asumir al iniciar el bachillerato?', 'Compromiso integral con el propio crecimiento: académico (aprender activamente), personal (autoconocimiento), social (buena convivencia), físico-emocional (autocuidado) y proyectivo (construir futuro)', 'Esperar que la vida pase', 'Solo aprobar materias', 'Estudiar lo mínimo necesario', 'a', 3, 'El bachillerato es etapa rica para crecer integralmente. Comprometerse va más allá de aprobar: implica aprender genuinamente, conocerse, convivir bien, cuidar salud física-emocional y construir activamente el propio futuro.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué característica distingue a las células eucariotas de las procariotas?', 'Las eucariotas solo se encuentran en plantas', 'Las eucariotas son siempre más pequeñas', 'Las eucariotas tienen núcleo definido y organelos membranosos', 'Las eucariotas no contienen ADN', 'c', 1, 'Las células eucariotas tienen el material genético encerrado en un núcleo verdadero rodeado por membrana, y poseen organelos especializados como mitocondrias, cloroplastos y aparato de Golgi. Las procariotas (bacterias) carecen de estas estructuras membranosas internas.'),
      (v_semana_id, '¿Cuál es la función principal de las mitocondrias?', 'Generar energía mediante respiración celular', 'Eliminar desechos celulares', 'Almacenar información genética', 'Producir proteínas', 'a', 2, 'Las mitocondrias son las "centrales energéticas" de la célula. Convierten la glucosa y el oxígeno en ATP, la molécula de energía que las células necesitan para funcionar.'),
      (v_semana_id, '¿Por qué se considera a la célula la unidad básica de la vida?', 'Porque solo las células contienen agua', 'Porque solo las células pueden moverse', 'Porque es el organismo más pequeño visible', 'Porque todos los seres vivos están formados por células y todas provienen de células preexistentes', 'd', 3, 'La teoría celular establece que todos los seres vivos están compuestos por células, que la célula es la unidad estructural y funcional básica, y que toda célula proviene de otra célula preexistente por división.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la función principal del sistema nervioso?', 'Producir hormonas exclusivamente', 'Filtrar la sangre', 'Bombear sangre por el cuerpo', 'Coordinar y controlar las funciones del organismo, recibiendo y enviando señales', 'd', 1, 'El sistema nervioso, compuesto por cerebro, médula espinal y nervios, recibe estímulos del entorno, los interpreta y coordina respuestas adecuadas en todo el organismo.'),
      (v_semana_id, '¿Cómo trabajan en conjunto los diferentes sistemas del cuerpo humano?', 'Solo se relacionan los sistemas digestivo y circulatorio', 'Solo importan los sistemas nervioso y muscular', 'Todos los sistemas se coordinan e interrelacionan para mantener la homeostasis del organismo', 'Cada sistema funciona aisladamente sin afectar a otros', 'c', 2, 'Los sistemas corporales (nervioso, circulatorio, digestivo, respiratorio, etc.) trabajan de manera integrada. Por ejemplo, el oxígeno que captan los pulmones es transportado por la sangre a todas las células.'),
      (v_semana_id, '¿Qué es la homeostasis?', 'Un tipo de enfermedad genética', 'La capacidad del cuerpo de mantener condiciones internas estables a pesar de cambios externos', 'Un proceso de digestión específico', 'La reproducción celular acelerada', 'b', 3, 'La homeostasis es el equilibrio dinámico que mantiene constantes la temperatura, el pH, la glucosa y otros parámetros internos del cuerpo, esencial para la salud y la supervivencia.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Dónde comienza realmente la digestión de los alimentos?', 'En el intestino grueso', 'En el estómago al llegar el alimento', 'En la boca, con la masticación y la saliva', 'En el intestino delgado únicamente', 'c', 1, 'La digestión inicia en la boca: la masticación tritura el alimento (digestión mecánica) y la saliva contiene amilasa, una enzima que comienza a descomponer los almidones (digestión química).'),
      (v_semana_id, '¿Cuál es la función principal del intestino delgado?', 'Almacenar alimentos', 'Absorber nutrientes hacia el torrente sanguíneo', 'Producir hormonas reproductivas', 'Solo eliminar desechos', 'b', 2, 'El intestino delgado es el principal sitio de absorción de nutrientes. Sus vellosidades aumentan la superficie de contacto y permiten que aminoácidos, glucosa, vitaminas y minerales pasen a la sangre.'),
      (v_semana_id, 'Si una persona consume alimentos ultraprocesados regularmente, ¿qué consecuencia digestiva puede esperar?', 'Mejora su digestión por el procesamiento previo', 'Aumenta su capacidad pulmonar', 'Posibles trastornos digestivos por exceso de azúcares, grasas y aditivos, junto con deficiencia de fibra', 'Sus huesos se vuelven más fuertes automáticamente', 'c', 3, 'Los alimentos ultraprocesados suelen ser altos en azúcares, grasas saturadas, sodio y aditivos, y bajos en fibra. Esto puede causar estreñimiento, alterar la microbiota intestinal y aumentar riesgo de enfermedades metabólicas.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los tres macronutrientes esenciales en la alimentación?', 'Azúcares, sales y aditivos', 'Vitaminas, minerales y agua', 'Carbohidratos, proteínas y grasas', 'Hierro, calcio y vitamina C', 'c', 1, 'Los macronutrientes son nutrientes que el cuerpo necesita en grandes cantidades: carbohidratos (energía rápida), proteínas (construcción de tejidos) y grasas (reserva energética y funciones celulares).'),
      (v_semana_id, '¿Qué representa el plato del bien comer en una alimentación equilibrada?', 'Una guía nutricional que clasifica alimentos en grupos y sugiere proporciones para una dieta balanceada', 'Un menú obligatorio diario', 'Una lista de alimentos prohibidos', 'Un plan de pérdida de peso', 'a', 2, 'El plato del bien comer es una herramienta visual que organiza los alimentos en tres grupos (verduras y frutas; cereales; leguminosas y origen animal) y sugiere consumir suficiente, variado y equilibrado.'),
      (v_semana_id, '¿Por qué la fibra dietética es importante a pesar de no aportar energía?', 'Aumenta el peso corporal', 'No tiene función real en el cuerpo', 'Mejora el tránsito intestinal, regula el azúcar en sangre y alimenta la microbiota benéfica', 'Solo sirve para llenar el estómago', 'c', 3, 'La fibra, aunque no se digiere ni aporta calorías, es fundamental: previene el estreñimiento, ayuda a controlar los niveles de glucosa y colesterol, y nutre las bacterias beneficiosas del intestino.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la función esencial del sistema respiratorio?', 'Bombear sangre al cuerpo', 'Producir energía directamente', 'Filtrar la sangre de toxinas', 'Realizar el intercambio de gases: tomar oxígeno y eliminar dióxido de carbono', 'd', 1, 'El sistema respiratorio inhala oxígeno necesario para la respiración celular y exhala el dióxido de carbono producido como desecho metabólico, intercambio que ocurre en los alvéolos pulmonares.'),
      (v_semana_id, '¿Qué estructura impide que los alimentos entren a la tráquea al tragar?', 'El diafragma', 'La epiglotis', 'La lengua', 'Los pulmones', 'b', 2, 'La epiglotis es una estructura cartilaginosa que actúa como una "tapa": durante la deglución se cierra sobre la tráquea, dirigiendo el alimento hacia el esófago y evitando que pase a las vías respiratorias.'),
      (v_semana_id, '¿Cómo afecta el tabaquismo al sistema respiratorio a largo plazo?', 'Solo afecta el corazón, no los pulmones', 'Daña los cilios bronquiales, los alvéolos y aumenta riesgo de EPOC, enfisema y cáncer pulmonar', 'Mejora la capacidad pulmonar', 'No tiene efecto demostrado', 'b', 3, 'El humo del tabaco contiene miles de sustancias tóxicas que destruyen los cilios que limpian las vías respiratorias, dañan los alvéolos donde ocurre el intercambio gaseoso y son la principal causa de cáncer pulmonar y EPOC.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la función principal del sistema circulatorio?', 'Transportar oxígeno, nutrientes, hormonas y desechos a través de la sangre por todo el cuerpo', 'Producir hormonas sexuales', 'Solo eliminar desechos sólidos', 'Sintetizar vitaminas', 'a', 1, 'El sistema circulatorio (corazón, vasos sanguíneos y sangre) distribuye oxígeno y nutrientes a todas las células, recoge los desechos para eliminarlos y transporta hormonas, células inmunitarias y calor.'),
      (v_semana_id, '¿Qué tipo de vasos sanguíneos llevan sangre desde el corazón hacia el resto del cuerpo?', 'Los nervios', 'Las venas', 'Los capilares solamente', 'Las arterias', 'd', 2, 'Las arterias transportan sangre desde el corazón hacia los tejidos. Tienen paredes gruesas y elásticas para soportar la presión del bombeo. Las venas regresan la sangre al corazón.'),
      (v_semana_id, '¿Por qué la presión arterial alta sostenida es peligrosa?', 'Daña arterias, corazón, riñones y cerebro, aumentando riesgo de infartos y derrames', 'Mejora la circulación', 'No tiene consecuencias serias', 'Solo causa dolor de cabeza ocasional', 'a', 3, 'La hipertensión arterial sostenida fuerza al corazón a trabajar más y daña las paredes de los vasos sanguíneos, lo que puede provocar infarto cardíaco, accidente cerebrovascular, insuficiencia renal e insuficiencia cardíaca.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la diferencia entre una enfermedad infecciosa y una crónica no transmisible?', 'Solo las crónicas son curables', 'Las crónicas son siempre genéticas y no prevenibles', 'No hay diferencia entre ellas', 'Las infecciosas son causadas por agentes biológicos como virus o bacterias; las crónicas no se contagian y se desarrollan por hábitos o factores genéticos', 'd', 1, 'Las enfermedades infecciosas (gripe, COVID-19, tuberculosis) son causadas por patógenos transmisibles. Las crónicas no transmisibles (diabetes, hipertensión, cáncer) se desarrollan gradualmente por estilos de vida, ambiente o herencia.'),
      (v_semana_id, '¿Qué papel cumplen las vacunas en la salud pública?', 'Solo funcionan en niños', 'Estimulan al sistema inmunitario para crear defensas sin causar la enfermedad, previniendo brotes y protegiendo a la población', 'Causan enfermedades artificialmente sin propósito', 'Reemplazan completamente la alimentación saludable', 'b', 2, 'Las vacunas exponen al cuerpo a fragmentos inactivos o atenuados de patógenos para que el sistema inmunitario aprenda a reconocerlos y combatirlos, generando inmunidad sin riesgo de enfermedad real.'),
      (v_semana_id, 'Para mantener buena salud, ¿qué hábitos preventivos son más recomendables?', 'Solo hacer ejercicio intenso una vez al mes', 'Alimentación balanceada, actividad física regular, sueño adecuado, manejo del estrés y revisiones médicas', 'Tomar medicamentos preventivos diariamente sin diagnóstico', 'Evitar todo contacto social', 'b', 3, 'La prevención integra múltiples hábitos: nutrición equilibrada, ejercicio (al menos 30 min diarios), 7-9 horas de sueño, manejo emocional y chequeos preventivos para detectar problemas a tiempo.');
  END IF;
END $$;

-- ----------- Ciencias Naturales I (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales I" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tienen en común todos los seres vivos a nivel celular?', 'Todos están formados por células, que son la unidad estructural y funcional de la vida', 'Todos tienen exactamente las mismas células', 'Todos tienen siempre núcleo', 'Solo los animales tienen células', 'a', 1, 'Independientemente de si son procariotas (bacterias) o eucariotas (animales, plantas, hongos), todos los organismos vivos están formados por al menos una célula, que es la unidad básica de la vida.'),
      (v_semana_id, '¿Por qué los sistemas del cuerpo no pueden funcionar de manera aislada?', 'Porque todos los sistemas dependen entre sí: por ejemplo, el digestivo aporta nutrientes que el circulatorio distribuye y el respiratorio oxigena', 'Porque solo trabajan durante el día', 'Porque están desconectados anatómicamente', 'Porque cada uno tiene su propia fuente de energía independiente', 'a', 2, 'Todos los sistemas del cuerpo están interconectados funcionalmente. La energía obtenida del sistema digestivo, distribuida por el circulatorio y oxigenada por el respiratorio, mantiene activo al sistema nervioso y a todos los demás.'),
      (v_semana_id, '¿Cuál es la mejor estrategia personal para mantener la salud a largo plazo?', 'Tomar suplementos sin asesoría médica', 'Esperar a sentirse mal para actuar', 'Confiar en que la genética sea suficiente', 'Adoptar hábitos saludables sostenidos en alimentación, ejercicio, descanso y prevención médica', 'd', 3, 'La salud a largo plazo depende menos de eventos aislados y más de hábitos cotidianos sostenidos. Una alimentación balanceada, actividad física, sueño suficiente y revisiones preventivas son la mejor inversión.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se define la materia en términos científicos?', 'Solo lo que podemos ver con los ojos', 'Todo aquello que tiene masa y ocupa un espacio en el universo', 'Solo los objetos sólidos', 'Aquello que es visible y se puede tocar siempre', 'b', 1, 'La materia es cualquier sustancia que tenga masa (cantidad de materia) y volumen (espacio ocupado). Incluye sólidos, líquidos, gases e incluso el plasma estelar.'),
      (v_semana_id, '¿Cuáles son los principales estados físicos de la materia?', 'Solo sólido y líquido', 'Sólido y gaseoso únicamente', 'Caliente, tibio y frío', 'Sólido, líquido, gaseoso y plasma', 'd', 2, 'La materia puede existir en cuatro estados principales: sólido (forma y volumen definidos), líquido (volumen definido pero no forma), gaseoso (ni forma ni volumen definidos) y plasma (gas ionizado, como en el sol).'),
      (v_semana_id, '¿Qué propiedad de la materia depende SOLO del tipo de sustancia, no de la cantidad?', 'El peso', 'La densidad', 'La masa', 'El volumen', 'b', 3, 'La densidad (masa/volumen) es una propiedad intensiva: caracteriza a la sustancia sin importar cuánta haya. Un gramo de oro y un kilogramo de oro tienen la misma densidad.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son las tres partículas subatómicas básicas que componen el átomo?', 'Protones, neutrones y electrones', 'Iones, isótopos y moléculas', 'Sólidos, líquidos y gases', 'Carbono, hidrógeno y oxígeno', 'a', 1, 'Los átomos están formados por protones (carga +) y neutrones (sin carga) en el núcleo, y electrones (carga -) que orbitan alrededor. El número de protones determina el elemento.'),
      (v_semana_id, '¿Qué representa el número atómico de un elemento?', 'Su peso en gramos', 'El número de moléculas', 'Su temperatura de fusión', 'La cantidad de protones en su núcleo, que define qué elemento es', 'd', 2, 'El número atómico (Z) corresponde a la cantidad de protones en el núcleo y es único para cada elemento. Por ejemplo, el hidrógeno tiene Z=1, el oxígeno Z=8 y el oro Z=79.'),
      (v_semana_id, '¿Por qué la tabla periódica es una herramienta poderosa?', 'Organiza los elementos por número atómico y propiedades, permitiendo predecir comportamientos químicos', 'Solo lista los nombres alfabéticamente', 'Es un calendario científico', 'Sirve solo como decoración en el laboratorio', 'a', 3, 'La tabla periódica agrupa los elementos por número atómico y propiedades similares. Esto permite predecir cómo reaccionará un elemento, qué enlaces forma y a qué grupo pertenece (metales, no metales, gases nobles).');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la diferencia entre una mezcla y un compuesto?', 'Las mezclas siempre son sólidas y los compuestos líquidos', 'Los compuestos son más fáciles de separar', 'En la mezcla los componentes mantienen sus propiedades y pueden separarse físicamente; en el compuesto los elementos se unen químicamente formando una nueva sustancia', 'No hay diferencia entre ambos', 'c', 1, 'Una mezcla (ej: agua con sal) puede separarse por métodos físicos como filtrado o evaporación. Un compuesto (ej: agua H2O) requiere reacciones químicas para descomponerse en sus elementos originales.'),
      (v_semana_id, '¿Cómo identificar una reacción química?', 'No se puede identificar visualmente', 'Solo por aumento de temperatura', 'Por la formación de nuevas sustancias con propiedades diferentes, evidenciada por cambios de color, gas, calor o luz', 'Por cambios físicos como tamaño solamente', 'c', 2, 'En una reacción química se rompen y forman enlaces, generando sustancias nuevas. Las pistas incluyen cambios de color, formación de burbujas (gas), liberación o absorción de calor, o emisión de luz.'),
      (v_semana_id, 'Si mezclas vinagre y bicarbonato de sodio y observas burbujas, ¿qué tipo de cambio ocurrió?', 'No ocurrió ningún cambio', 'Físico, porque cambia el aspecto', 'Biológico, porque participa un ser vivo', 'Químico, porque se forman nuevas sustancias (entre ellas dióxido de carbono gaseoso)', 'd', 3, 'La reacción entre el ácido acético del vinagre y el bicarbonato de sodio produce acetato de sodio, agua y dióxido de carbono (las burbujas). Es un cambio químico porque se forman sustancias diferentes.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué establece la ley de conservación de la energía?', 'La energía se puede crear desde la nada', 'La energía no se crea ni se destruye, solo se transforma de una forma a otra', 'La energía solo existe en forma de electricidad', 'La energía debe consumirse cada día', 'b', 1, 'La ley de conservación de la energía es uno de los principios fundamentales de la física: la energía total de un sistema cerrado permanece constante, aunque cambie de forma (cinética, potencial, térmica, química, etc.).'),
      (v_semana_id, '¿Cuál es un ejemplo de transformación de energía química a energía cinética?', 'Hervir agua en una olla', 'Un foco encendido constantemente', 'El motor de un automóvil quemando gasolina para producir movimiento', 'Un imán atrayendo metal', 'c', 2, 'En el motor de un auto, la energía química almacenada en la gasolina se libera por combustión, generando calor que se convierte en energía cinética (movimiento) del vehículo.'),
      (v_semana_id, '¿Por qué las energías renovables son una alternativa importante hoy en día?', 'No producen energía suficiente', 'Son más caras que los combustibles fósiles', 'Provienen de fuentes inagotables o de rápida regeneración (sol, viento, agua) y reducen las emisiones contaminantes', 'Solo funcionan en países desarrollados', 'c', 3, 'Las energías renovables (solar, eólica, hidráulica, geotérmica, biomasa) ofrecen una fuente sostenible que no se agota como los combustibles fósiles y produce muchas menos emisiones de gases de efecto invernadero.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se define la velocidad en física?', 'La distancia recorrida por unidad de tiempo, en una dirección específica', 'Solo la rapidez al ir en línea recta', 'El cambio en el peso del objeto', 'Lo mismo que la aceleración', 'a', 1, 'La velocidad es una magnitud vectorial que combina la rapidez (cuánto se mueve un objeto en un tiempo dado) con la dirección del movimiento. Sus unidades comunes son metros por segundo (m/s) o kilómetros por hora (km/h).'),
      (v_semana_id, '¿Qué establece la primera ley de Newton (ley de inercia)?', 'La fuerza es igual a la masa por el peso', 'Toda acción tiene una reacción solo en líquidos', 'Todo cuerpo necesita una fuerza para mantenerse en reposo', 'Un cuerpo en reposo permanece en reposo, y un cuerpo en movimiento sigue en movimiento, a menos que una fuerza externa actúe sobre él', 'd', 2, 'La ley de la inercia establece que los objetos resisten cambios en su estado de movimiento. Por eso al frenar un auto bruscamente sentimos que nos vamos hacia adelante: nuestro cuerpo tiende a seguir moviéndose.'),
      (v_semana_id, '¿Por qué un objeto cae cuando lo soltamos?', 'Por la rotación de la Tierra solamente', 'Porque la presión del aire lo empuja hacia abajo', 'Por la gravedad de la Tierra, que ejerce una fuerza atractiva sobre los objetos hacia su centro', 'Porque el objeto pesa demasiado', 'c', 3, 'La gravedad es la fuerza con la que la Tierra atrae a los objetos hacia su centro. En la Tierra, los objetos caen con una aceleración constante de aproximadamente 9.8 m/s² (sin contar la resistencia del aire).');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la corriente eléctrica?', 'La luz que emiten los focos', 'El flujo ordenado de electrones a través de un conductor', 'Calor producido por el sol', 'Un campo magnético solamente', 'b', 1, 'La corriente eléctrica es el movimiento ordenado de electrones (carga negativa) a través de un material conductor, como un cable de cobre, impulsados por una diferencia de potencial (voltaje).'),
      (v_semana_id, '¿Cuál es la relación fundamental entre electricidad y magnetismo?', 'Una corriente eléctrica genera un campo magnético, y un campo magnético variable puede inducir una corriente eléctrica', 'Son fenómenos completamente independientes', 'Solo se relacionan en aparatos eléctricos modernos', 'El magnetismo solo existe en imanes naturales', 'a', 2, 'El electromagnetismo, descubierto por Oersted y Faraday, es la base de motores, generadores, transformadores y la mayoría de la tecnología moderna. Electricidad y magnetismo son dos manifestaciones del mismo fenómeno.'),
      (v_semana_id, '¿Por qué es peligroso manipular aparatos eléctricos con las manos mojadas?', 'Solo daña el aparato sin afectar a la persona', 'Solo si el aparato es muy antiguo', 'No representa ningún peligro', 'El agua es un buen conductor por las sales disueltas, lo que aumenta el riesgo de electrocución', 'd', 3, 'El agua pura no conduce bien la electricidad, pero el agua de la piel o del grifo contiene sales y minerales disueltos que la convierten en buen conductor. Por eso, manipular electricidad con manos mojadas o en ambientes húmedos aumenta el riesgo de descarga.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué evidencias respaldan la teoría del Big Bang sobre el origen del universo?', 'No hay evidencias científicas reales', 'La expansión del universo, la radiación de fondo cósmico y la abundancia de elementos ligeros', 'Únicamente registros antiguos de astrónomos', 'Solo cálculos teóricos sin observación', 'b', 1, 'El Big Bang está sustentado por: la expansión observada del universo (galaxias alejándose), la detección de la radiación cósmica de microondas (eco del Big Bang), y la proporción observada de hidrógeno, helio y litio.'),
      (v_semana_id, '¿Por qué experimentamos diferentes estaciones del año en la Tierra?', 'Por cambios en la velocidad de rotación', 'Por la actividad solar exclusivamente', 'Por la inclinación del eje de rotación de la Tierra (23.5°), que hace que diferentes hemisferios reciban más o menos luz solar según la posición en su órbita', 'Por la distancia variable de la Tierra al Sol', 'c', 2, 'La inclinación del eje terrestre hace que durante el año un hemisferio reciba luz solar más directa (verano) mientras el otro la recibe oblicua (invierno). La distancia al Sol varía muy poco y no es la causa principal.'),
      (v_semana_id, '¿Qué impacto tienen las actividades humanas en el equilibrio terrestre?', 'Influyen significativamente: cambio climático por gases de efecto invernadero, deforestación, contaminación y pérdida de biodiversidad', 'Ninguno demostrado científicamente', 'Solo afectan al clima local sin consecuencias globales', 'Solo afectan a las grandes ciudades', 'a', 3, 'Las actividades humanas (combustión de fósiles, deforestación, agricultura intensiva, contaminación) están alterando el clima, los ecosistemas y los ciclos biogeoquímicos a escala global, según consenso científico mundial.');
  END IF;
END $$;

-- ----------- Ciencias Naturales II (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Naturales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Naturales II" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la idea central que conecta materia, energía y sus transformaciones?', 'Materia y energía son intercambiables y se conservan en todo proceso, transformándose pero sin perderse', 'Son conceptos completamente independientes', 'Solo la energía se conserva', 'Solo la materia se conserva en reacciones', 'a', 1, 'Las leyes de conservación (de la materia y de la energía) son pilares de la ciencia: en cualquier proceso físico o químico, ni la materia ni la energía se crean ni se destruyen, solo se transforman. Einstein mostró que incluso son convertibles: E=mc².'),
      (v_semana_id, '¿Por qué el método científico es importante para entender los fenómenos naturales?', 'Porque siempre da respuestas absolutas e inmutables', 'Porque ofrece un proceso sistemático (observar, hipotetizar, experimentar, analizar) que reduce sesgos y permite construir conocimiento confiable', 'Solo lo usan los científicos profesionales', 'No tiene aplicación en la vida diaria', 'b', 2, 'El método científico es una forma estructurada de abordar preguntas: minimiza errores, exige evidencia y permite que otros validen los resultados. Es la base del conocimiento confiable y aplica también en decisiones cotidianas.'),
      (v_semana_id, '¿Cómo puede tu generación contribuir al cuidado del planeta y el avance científico?', 'Confiando solo en la tecnología futura', 'Ignorando los problemas porque son demasiado grandes', 'Esperando que las generaciones anteriores resuelvan todo', 'Adoptando hábitos sostenibles, informándose con fuentes confiables, apoyando ciencia y educación, y participando ciudadanamente', 'd', 3, 'El cambio requiere acción colectiva e individual: consumo responsable, alfabetización científica, apoyo a políticas basadas en evidencia y participación democrática. Cada generación tiene capacidad de impacto si actúa informadamente.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué estudia la geografía como ciencia social?', 'Las relaciones entre las sociedades humanas y los espacios geográficos donde habitan, incluyendo aspectos físicos, sociales, económicos y culturales', 'Solo el clima de cada país', 'Únicamente cómo dibujar mapas', 'Solo la formación de montañas y volcanes', 'a', 1, 'La geografía es la ciencia que analiza tanto las características físicas del territorio (relieve, clima, recursos) como la forma en que las sociedades los habitan, transforman y se organizan en ellos.'),
      (v_semana_id, '¿Cuál es la diferencia entre coordenadas geográficas (latitud y longitud)?', 'Son lo mismo, solo se llaman diferente', 'La latitud mide grados al este u oeste, la longitud al norte y sur', 'Solo la longitud sirve para ubicar lugares', 'La latitud mide la distancia al ecuador (norte/sur) y la longitud al meridiano de Greenwich (este/oeste)', 'd', 2, 'La latitud va de 0° en el ecuador hasta 90° en los polos (norte o sur). La longitud va de 0° en Greenwich hasta 180° hacia el este o el oeste. Juntas permiten ubicar cualquier punto del planeta.'),
      (v_semana_id, 'Si dos lugares están a la misma latitud pero distinta longitud, ¿qué se puede inferir?', 'Pueden tener climas similares por la misma posición respecto al ecuador, pero estarán en husos horarios distintos', 'Tienen exactamente la misma cultura', 'Tienen el mismo idioma', 'Es el mismo lugar', 'a', 3, 'La latitud influye en el clima (la cantidad de luz solar recibida). Lugares a la misma latitud suelen tener climas comparables. La longitud determina el huso horario y por tanto la hora local.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué factores influyen en el crecimiento poblacional de un país?', 'Solo la mortalidad', 'La tasa de natalidad, mortalidad, esperanza de vida, migración (inmigración y emigración) y políticas públicas', 'Únicamente el número de hijos por familia', 'Solo la inmigración', 'b', 1, 'El crecimiento poblacional resulta de la diferencia entre nacimientos y muertes, sumada al saldo migratorio. Influyen también factores como acceso a salud, educación y políticas demográficas.'),
      (v_semana_id, '¿Cómo enriquecen las culturas indígenas a la identidad de México?', 'Únicamente influyen en zonas rurales', 'Aportando lenguas, tradiciones, cosmovisiones, gastronomía, arte y conocimientos ancestrales que constituyen la base pluricultural de la nación', 'No tienen impacto cultural relevante', 'Solo aportan vestimenta tradicional', 'b', 2, 'México es un país pluricultural reconocido constitucionalmente. Las 68 lenguas indígenas, las cosmovisiones de pueblos como los nahuas, mayas, mixtecos, zapotecos y otros, junto con su arte, gastronomía y saberes, son patrimonio cultural fundamental.'),
      (v_semana_id, '¿Qué consecuencias tiene la discriminación étnica o cultural en una sociedad?', 'Solo afecta a quienes la sufren directamente', 'No tiene consecuencias visibles', 'Beneficia a la mayoría', 'Genera exclusión, desigualdad de oportunidades, violencia y debilita la cohesión social y el desarrollo', 'd', 3, 'La discriminación violenta derechos humanos, perpetúa desigualdades históricas, limita el potencial de millones de personas y afecta la convivencia democrática. Es un problema social y económico que retrasa el desarrollo del país.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles fueron las dos grandes áreas culturales del México prehispánico?', 'La costa este y la costa oeste', 'Norte y sur del país sin diferencias', 'Aridoamérica (semidesértica, pueblos cazadores-recolectores) y Mesoamérica (agrícola, civilizaciones complejas)', 'Solo la zona maya', 'c', 1, 'Aridoamérica abarcaba el norte árido habitado por grupos seminómadas. Mesoamérica (centro y sur) fue cuna de civilizaciones agrícolas con escritura, calendarios, ciudades y arquitectura monumental: olmecas, mayas, teotihuacanos, mexicas, etc.'),
      (v_semana_id, '¿Qué innovaciones aportó la civilización maya al conocimiento humano?', 'Solo arquitectura piramidal', 'Solamente cerámica decorativa', 'No aportaron innovaciones notables', 'Sistemas de escritura compleja, calendarios precisos, conocimientos astronómicos y matemáticos avanzados (incluyendo el concepto del cero)', 'd', 2, 'Los mayas desarrollaron escritura jeroglífica, dos calendarios precisos (sagrado de 260 días y solar de 365), observaciones astronómicas excepcionales y matemáticas avanzadas con el concepto del cero, anterior al uso europeo.'),
      (v_semana_id, '¿Cómo se organizaba políticamente el imperio mexica al llegar los españoles?', 'Funcionaba como una democracia moderna', 'Era una confederación de reinos independientes', 'Como una triple alianza (Tenochtitlán, Texcoco, Tlacopan) que dominaba a numerosos pueblos tributarios bajo el liderazgo del huey tlatoani', 'Era una sociedad sin organización política', 'c', 3, 'El imperio mexica se basaba en la Triple Alianza fundada en 1430. El huey tlatoani gobernaba con apoyo de la nobleza guerrera y sacerdotal, y mantenía el control mediante tributo, comercio y conquista militar.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué factores facilitaron la conquista española sobre el imperio mexica en 1521?', 'Únicamente la superioridad bélica española', 'Solo la traición de un grupo de mexicas', 'Tecnología militar (caballos, armas de fuego), enfermedades epidémicas (viruela), alianzas con pueblos enemigos del imperio (como los tlaxcaltecas) y crisis interna', 'Solo la rendición voluntaria', 'c', 1, 'La conquista no se explica por un solo factor. Hernán Cortés se alió con pueblos sometidos por los mexicas (especialmente Tlaxcala). Las epidemias diezmaron a la población indígena, y la tecnología militar dio ventajas tácticas decisivas.'),
      (v_semana_id, '¿Cómo se organizaba la sociedad colonial novohispana?', 'Era una sociedad igualitaria', 'Solo había españoles e indígenas sin diferencias internas', 'Mediante un sistema de castas jerárquico basado en el origen étnico, con españoles peninsulares en la cima, seguidos de criollos, mestizos, indígenas, africanos y diversas castas', 'Como una democracia', 'c', 2, 'La sociedad novohispana era profundamente jerárquica. Los peninsulares ocupaban los cargos más altos, los criollos enfrentaban discriminación pese a su riqueza, y las castas (mezclas étnicas) recibían tratos diferenciados que limitaban sus derechos.'),
      (v_semana_id, '¿Cómo influyó el sincretismo cultural en la formación de la identidad mexicana?', 'La fusión de elementos indígenas, españoles y africanos generó nuevas tradiciones, lenguas, religiosidad, gastronomía y artes que conforman la identidad mexicana actual', 'Las culturas se mantuvieron completamente separadas', 'Solo prevaleció la cultura española', 'Solo prevaleció la cultura indígena', 'a', 3, 'El sincretismo es la fusión de elementos culturales distintos. La Virgen de Guadalupe, el Día de Muertos, el mole, el español mexicano y la música mariachi son productos de tres siglos de mestizaje cultural.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué factores motivaron el movimiento de Independencia de México?', 'Solo conflictos religiosos', 'Únicamente decisiones de Miguel Hidalgo', 'Una invasión extranjera directa', 'El descontento de criollos por discriminación, ideas de la Ilustración, ejemplos revolucionarios (EUA, Francia), crisis económica y la invasión napoleónica a España', 'd', 1, 'La Independencia se gestó por causas internas (discriminación a criollos, abusos coloniales) y externas (Ilustración, revoluciones americana y francesa, crisis monárquica española de 1808). El movimiento fue largo y diverso.'),
      (v_semana_id, '¿Qué aporte fundamental hizo Miguel Hidalgo al inicio de la Independencia?', 'Lanzó el Grito de Dolores el 16 de septiembre de 1810, convocando un movimiento popular que incluyó a campesinos, indígenas y criollos', 'Firmó la independencia el primer día', 'Solo fue un orador sin acción militar', 'Diseñó la bandera nacional definitiva', 'a', 2, 'Hidalgo, sacerdote criollo, transformó una conspiración elitista en un movimiento popular masivo. El "Grito" en Dolores Hidalgo movilizó a miles que tomaron Guanajuato, Valladolid y otras ciudades, marcando el inicio de la lucha armada.'),
      (v_semana_id, 'Al consumarse la Independencia en 1821, ¿qué grandes desafíos enfrentó el nuevo país?', 'Era inmediatamente próspero', 'Definir su sistema político (monarquía o república), reconstruir economía devastada, enfrentar luchas internas entre liberales y conservadores, y defender su territorio', 'Ya estaba todo resuelto', 'Solo problemas religiosos', 'b', 3, 'México independiente vivió décadas de inestabilidad: 11 años bajo Iturbide y luego luchas entre federalistas y centralistas, conservadores y liberales. Perdió más de la mitad de su territorio (1848) y enfrentó intervenciones extranjeras.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál fue el principal objetivo de las Leyes de Reforma promovidas por Benito Juárez?', 'Separar la Iglesia del Estado, garantizar libertades civiles, nacionalizar bienes eclesiásticos y modernizar al país', 'Establecer una monarquía', 'Reconquistar territorios perdidos', 'Beneficiar exclusivamente a la Iglesia', 'a', 1, 'Las Leyes de Reforma (1859-1860) establecieron el matrimonio civil, registro civil, libertad de cultos, secularización de cementerios y nacionalización de bienes del clero. Sentaron las bases del Estado laico mexicano.'),
      (v_semana_id, '¿Qué factor desencadenó la Revolución Mexicana de 1910?', 'Una invasión extranjera', 'Solo conflictos religiosos', 'Una catástrofe natural', 'La dictadura prolongada de Porfirio Díaz (35 años), las grandes desigualdades sociales y la represión a Francisco I. Madero al desafiar la reelección', 'd', 2, 'El Porfiriato trajo modernización pero también enorme desigualdad: tierras concentradas en pocas manos, peonaje, represión política. El Plan de San Luis de Madero llamó a las armas el 20 de noviembre de 1910 contra la dictadura.'),
      (v_semana_id, '¿Cuáles fueron los principales legados de la Revolución Mexicana?', 'No tuvo legados duraderos', 'La Constitución de 1917 (con derechos sociales avanzados como reforma agraria, derechos laborales y educación), reconocimiento de demandas populares y un nuevo orden político', 'Solo cambios militares', 'Únicamente derribar a Porfirio Díaz', 'b', 3, 'La Constitución de 1917 fue pionera mundialmente en derechos sociales: artículo 27 (reforma agraria), 123 (derechos laborales), 3° (educación pública gratuita y laica). Definió al México moderno por todo el siglo XX.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué transformaciones importantes vivió México en el siglo XX?', 'Ningún cambio significativo', 'Industrialización, expansión educativa, urbanización, hegemonía de un partido (PRI) por décadas, transición democrática gradual y apertura económica', 'Solo cambios en el ámbito rural', 'Permaneció inalterable', 'b', 1, 'México pasó de ser un país rural y agrario a urbano e industrial. El PRI gobernó de 1929 a 2000. Hubo nacionalización petrolera (1938), expansión educativa, milagro económico (1950s-70s), crisis (80s) y apertura comercial (TLCAN 1994).'),
      (v_semana_id, '¿Qué fue el movimiento estudiantil de 1968?', 'Una celebración deportiva', 'Un evento sin trascendencia política', 'Una protesta exclusivamente económica', 'Un movimiento social que demandó libertades democráticas, fin de la represión política y cambios sociales, reprimido violentamente en la masacre del 2 de octubre en Tlatelolco', 'd', 2, 'El movimiento de 1968, contemporáneo de protestas estudiantiles globales, demandaba apertura democrática y fin de la represión. La matanza del 2 de octubre en Tlatelolco marcó un parteaguas en la conciencia política mexicana.'),
      (v_semana_id, '¿Qué desafíos sociales enfrenta México en el siglo XXI?', 'Solo problemas internacionales', 'Desigualdad económica, inseguridad y violencia, corrupción, migración, cambio climático, brecha digital y consolidación democrática', 'Ya no tiene desafíos importantes', 'Solo desafíos económicos', 'b', 3, 'México enfrenta retos complejos: aproximadamente 40% de la población en pobreza, niveles altos de violencia ligados al narcotráfico, corrupción sistémica, flujos migratorios masivos y necesidad de fortalecer instituciones democráticas.');
  END IF;
END $$;

-- ----------- Ciencias Sociales I (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales I" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué es importante conocer la historia y geografía del propio país?', 'Solo por motivos académicos', 'Para presumir conocimientos', 'Porque permite comprender el presente, valorar la diversidad cultural, entender las raíces de los problemas actuales y participar conscientemente como ciudadano', 'Para memorizar fechas', 'c', 1, 'La historia y geografía no son solo memorización: son herramientas para entender por qué somos como somos, valorar lo que nos une, identificar pendientes históricos y participar informada y críticamente en la vida pública.'),
      (v_semana_id, '¿Cuál es el papel de un ciudadano informado en una democracia?', 'Informarse críticamente, ejercer sus derechos, cumplir obligaciones, participar en asuntos públicos, exigir transparencia y respetar a la diversidad', 'Solo votar cada cierto tiempo', 'Mantenerse al margen de la política', 'Esperar que otros decidan por él', 'a', 2, 'La ciudadanía activa va más allá del voto: implica informarse de fuentes confiables, vigilar el poder, participar en decisiones colectivas, defender derechos propios y de otros, y construir comunidad democrática.'),
      (v_semana_id, '¿Cómo puede un joven contribuir al desarrollo de su comunidad y país?', 'Concentrándose solo en sí mismo', 'Esperando a ser adulto para hacer algo', 'Educándose, respetando leyes y derechos, participando en organizaciones, votando informadamente, defendiendo causas justas y aportando con sus talentos', 'Solo si tiene mucho dinero', 'c', 3, 'Los jóvenes pueden aportar desde ahora: educándose para mejorar oportunidades propias y colectivas, organizándose en causas comunitarias, ejerciendo ciudadanía digital responsable y aplicando sus habilidades al servicio del bien común.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué entendemos por sociedad?', 'Solo un grupo de amigos', 'Únicamente la población de un país', 'Un conjunto de personas que comparten territorio, instituciones, normas, lengua y se interrelacionan estableciendo formas de convivencia y organización', 'Un equipo deportivo', 'c', 1, 'La sociedad es una agrupación humana organizada que comparte cultura, instituciones (familia, escuela, gobierno) y reglas de convivencia. Las sociedades se transforman históricamente y varían entre culturas.'),
      (v_semana_id, '¿Qué son las instituciones sociales y cuál es su función?', 'Solo edificios de gobierno', 'Estructuras estables (familia, escuela, gobierno, iglesia, etc.) que organizan la vida social cumpliendo funciones específicas como educar, proteger o impartir justicia', 'Empresas privadas únicamente', 'Reuniones eventuales', 'b', 2, 'Las instituciones sociales son patrones organizados de normas, roles y relaciones que cumplen funciones esenciales: la familia socializa, la escuela educa, el gobierno regula, la justicia resuelve conflictos.'),
      (v_semana_id, '¿Por qué es importante el respeto a la diversidad social?', 'Solo importa para algunas personas', 'Únicamente por razones legales', 'Porque enriquece la convivencia, garantiza derechos humanos, fortalece la democracia y reconoce que todas las personas tienen igual dignidad', 'No es realmente importante', 'c', 3, 'El respeto a la diversidad (étnica, religiosa, de género, ideológica) es fundamento de los derechos humanos y la democracia. Una sociedad que respeta diferencias previene conflictos, fomenta creatividad y honra la dignidad humana.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué estudia la economía?', 'Únicamente las inversiones bursátiles', 'Cómo las sociedades producen, distribuyen y consumen bienes y servicios para satisfacer necesidades, gestionando recursos limitados', 'Solo el dinero', 'Solo a las empresas grandes', 'b', 1, 'La economía analiza decisiones individuales y colectivas sobre uso de recursos escasos para satisfacer necesidades ilimitadas. Estudia producción, comercio, consumo, trabajo, finanzas y políticas económicas.'),
      (v_semana_id, '¿Cuál es la diferencia entre los sectores económicos?', 'Todos hacen lo mismo', 'Solo se diferencian por el tamaño', 'No hay sectores definidos', 'Primario (agricultura, minería), secundario (industria, manufactura) y terciario (servicios, comercio, turismo)', 'd', 2, 'Los sectores económicos clasifican actividades: el primario extrae recursos naturales, el secundario los transforma en productos y el terciario provee servicios. Una economía desarrollada suele tener fuerte sector terciario.'),
      (v_semana_id, '¿Por qué es importante el trabajo digno como derecho humano?', 'No es realmente un derecho', 'Porque es un capricho legal', 'Porque garantiza salario justo, seguridad social, jornadas razonables, condiciones seguras y respeto, permitiendo desarrollo personal y dignidad', 'Solo para algunos trabajadores', 'c', 3, 'El trabajo digno (concepto de la OIT) implica condiciones que permitan a las personas vivir dignamente: remuneración justa, seguridad, libertad de organización, no discriminación. Es base del desarrollo humano y económico.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza a una economía de mercado?', 'Las decisiones de qué, cómo y cuánto producir las toman principalmente compradores y vendedores a través de la oferta y demanda', 'Solo existe el trueque', 'No hay propiedad privada', 'El Estado controla todas las decisiones', 'a', 1, 'En la economía de mercado los precios y la producción se regulan por la libre interacción entre oferta (productores) y demanda (consumidores). El Estado puede intervenir para corregir fallas o garantizar derechos.'),
      (v_semana_id, '¿Qué es la globalización económica y cuáles son sus efectos?', 'Es la integración creciente de mercados, comercio, inversión y producción a nivel mundial; tiene efectos positivos (acceso a productos, tecnología) y negativos (desigualdad, dependencia)', 'Es solo un concepto teórico', 'Solo es un fenómeno reciente sin importancia', 'Únicamente afecta a los países ricos', 'a', 2, 'La globalización ha intensificado el comercio internacional, los flujos de capital y la transferencia tecnológica. Sus beneficios incluyen mayor variedad y eficiencia; sus retos incluyen desigualdad, vulnerabilidad de economías locales y daño ambiental.'),
      (v_semana_id, '¿Cómo afecta el consumo responsable a la economía y al medio ambiente?', 'Reduce la calidad de vida', 'Solo encarece los productos', 'Promueve producción sostenible, reduce desperdicio, presiona a empresas hacia mejores prácticas y disminuye huella ambiental', 'No tiene impacto real', 'c', 3, 'El consumo responsable (comprar lo necesario, preferir productos sostenibles, reciclar, evitar desperdicio) genera demanda de prácticas éticas, reduce contaminación y permite que las decisiones cotidianas impulsen cambios sistémicos.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la política como actividad humana?', 'La actividad relacionada con el gobierno, distribución del poder, toma de decisiones colectivas y resolución de conflictos en la sociedad', 'Algo ajeno al ciudadano común', 'Solo la actividad de los partidos', 'Únicamente las elecciones', 'a', 1, 'La política abarca todas las actividades de gobierno y participación pública. Definida por Aristóteles como "el arte de gobernar la polis", incluye partidos, elecciones, leyes, políticas públicas y participación ciudadana cotidiana.'),
      (v_semana_id, '¿Cuáles son las principales formas de gobierno en el mundo actual?', 'No hay diferencias entre países', 'Solo democracias', 'Únicamente monarquías', 'Democracias (representativas y participativas), monarquías (constitucionales o absolutas), dictaduras (autoritarias o totalitarias) y regímenes híbridos', 'd', 2, 'Existen diversas formas de gobierno según cómo se distribuye el poder: democracias donde el poder emana del pueblo, monarquías hereditarias, dictaduras donde una persona o grupo concentra el poder sin contrapesos, y regímenes mixtos.'),
      (v_semana_id, '¿Qué caracteriza a una democracia funcional?', 'Solo división de poderes', 'División de poderes, elecciones libres, derechos humanos protegidos, estado de derecho, libertad de expresión, prensa independiente, rendición de cuentas y participación ciudadana', 'Solo elecciones periódicas', 'Solo libertad de expresión', 'b', 3, 'Una democracia plena no se reduce a elecciones: requiere instituciones independientes (poderes ejecutivo, legislativo, judicial), respeto a derechos humanos, libertades civiles, transparencia y mecanismos de participación ciudadana entre comicios.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué son los derechos humanos?', 'Derechos inherentes a toda persona por su sola condición humana, universales, indivisibles, inalienables e interdependientes', 'Únicamente derechos legales', 'Privilegios concedidos por gobiernos', 'Solo aplican a algunas personas', 'a', 1, 'Los derechos humanos no se otorgan ni se quitan: son inherentes a la dignidad humana. La Declaración Universal de 1948 los reconoce como universales (para todos), indivisibles (igual importancia) e interdependientes (se afectan mutuamente).'),
      (v_semana_id, '¿Qué responsabilidades implica ser ciudadano?', 'Solo tener derechos', 'Solo pagar impuestos', 'Esperar que otros actúen', 'Conocer y ejercer derechos, cumplir obligaciones (impuestos, leyes, voto, servicio si aplica), respetar a los demás y participar en asuntos públicos', 'd', 2, 'La ciudadanía es un binomio derechos-responsabilidades. Los derechos no se sostienen sin obligaciones correspondientes: cumplimiento legal, contribución fiscal, respeto a derechos ajenos y participación cívica activa.'),
      (v_semana_id, '¿Qué pueden hacer los ciudadanos cuando se violan derechos humanos?', 'Solo lamentarse pasivamente', 'Solo si son afectados directamente', 'Acudir a comisiones de derechos humanos, organizaciones civiles, instancias judiciales, denunciar públicamente, exigir rendición de cuentas y movilizarse pacíficamente', 'Nada se puede hacer realmente', 'c', 3, 'México cuenta con CNDH y comisiones estatales para denunciar violaciones. Existen ONG, ombudsperson, mecanismos internacionales (CIDH), recursos judiciales y herramientas como manifestación, juicios de amparo y medios para visibilizar abusos.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son las causas principales de los conflictos sociales?', 'Sin causa identificable', 'Solo diferencias personales', 'Únicamente intereses económicos', 'Desigualdad, exclusión, discriminación, intereses contrapuestos, diferencias ideológicas o culturales, escasez de recursos y violación de derechos', 'd', 1, 'Los conflictos sociales surgen de tensiones estructurales: desigualdad de oportunidades, exclusión de grupos, choques de intereses entre actores, diferencias culturales o religiosas, y ruptura del tejido social.'),
      (v_semana_id, '¿Cuál es la mejor forma de resolver conflictos en una sociedad democrática?', 'Mediante la fuerza', 'Diálogo, negociación, mediación, instituciones democráticas, respeto al estado de derecho y vías pacíficas', 'Ignorando los problemas', 'Imponiendo la voluntad de la mayoría sin dialogar', 'b', 2, 'Las sociedades democráticas resuelven conflictos mediante diálogo, negociación entre partes, mediación de terceros neutrales, consultas, mecanismos legales y participación. La violencia genera más violencia y daña el tejido social.'),
      (v_semana_id, '¿Por qué la cultura de paz es fundamental en el siglo XXI?', 'Solo importa en zonas de guerra', 'Genera más conflictos', 'Promueve convivencia respetuosa, previene violencia, valora la diversidad y construye relaciones justas en familia, escuela, comunidad y entre naciones', 'Es un concepto sin aplicación', 'c', 3, 'La UNESCO promueve la cultura de paz como antídoto frente a violencia y guerra. Implica educación en valores, gestión pacífica de conflictos, reconocimiento del otro y construcción cotidiana de relaciones justas a todos los niveles.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los principales problemas globales del siglo XXI?', 'Cambio climático, desigualdad, migraciones forzadas, pobreza, crisis sanitarias, conflictos armados, desinformación, ciberseguridad y crisis democráticas', 'Solo crisis económicas', 'No hay problemas significativos', 'Solo problemas locales', 'a', 1, 'El siglo XXI presenta retos sin precedentes que ningún país resuelve aisladamente: cambio climático, desigualdad creciente entre y dentro de naciones, pandemias, conflictos, migración forzada y degradación democrática.'),
      (v_semana_id, '¿Qué papel juegan los organismos internacionales como la ONU?', 'Coordinan cooperación entre naciones, mantienen paz, promueven derechos humanos, atienden crisis humanitarias, definen agendas globales (ODS) y arbitran conflictos', 'Solo benefician a países ricos', 'Ninguno relevante', 'Solo organizan reuniones inútiles', 'a', 2, 'La ONU y agencias especializadas (OMS, UNICEF, UNESCO, ACNUR) coordinan respuestas a problemas globales. Aunque imperfectos, son indispensables para abordar retos transnacionales como pandemias, refugiados o cambio climático.'),
      (v_semana_id, '¿Cómo enfrenta la humanidad el cambio climático?', 'No se está haciendo nada', 'Solo tecnológicamente', 'Sin esperanza real', 'Mediante acuerdos internacionales (París), transición energética, políticas públicas, cambios en patrones de consumo, innovación tecnológica y movilización social', 'd', 3, 'La respuesta al cambio climático es multifrontal: Acuerdo de París (2015), inversión en energías renovables, eficiencia energética, reforestación, ajustes en agricultura y transporte, regulaciones, e impulso ciudadano.');
  END IF;
END $$;

-- ----------- Ciencias Sociales II (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Ciencias Sociales II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Ciencias Sociales II" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué relación existe entre desarrollo económico y desarrollo humano?', 'El desarrollo económico es solo en países ricos', 'El desarrollo económico es necesario pero insuficiente; el humano amplia las capacidades, oportunidades y libertades de las personas, integrando educación, salud, dignidad y sostenibilidad', 'Son lo mismo', 'No tienen relación', 'b', 1, 'El PIB no basta para medir bienestar. El Índice de Desarrollo Humano (IDH) integra educación, salud y nivel de vida. Países pueden crecer económicamente pero retroceder en desarrollo humano si la riqueza se concentra.'),
      (v_semana_id, '¿Cómo se vincula la justicia social con la sustentabilidad ambiental?', 'Son temas opuestos', 'No hay relación entre ellos', 'No es posible reconciliarlos', 'Están profundamente conectados: los pobres sufren más los impactos ambientales, y la sustentabilidad requiere distribución justa de costos y beneficios entre generaciones presentes y futuras', 'd', 2, 'La justicia ambiental reconoce que comunidades pobres sufren desproporcionalmente la contaminación y el cambio climático. La sustentabilidad real exige que los costos y beneficios ambientales se distribuyan equitativamente.'),
      (v_semana_id, '¿Qué compromiso puede asumir un joven hoy para construir mejor mundo?', 'Confiar en que otros lo harán', 'Educarse críticamente, participar en su comunidad, votar informadamente, defender derechos humanos, consumir responsablemente, dialogar respetuosamente y construir desde pequeñas acciones cotidianas', 'Solo es responsabilidad del gobierno', 'Esperar a ser adulto', 'b', 3, 'Los grandes cambios sociales se construyen con miles de pequeñas acciones cotidianas. Los jóvenes pueden ejercer ciudadanía desde ya: educándose críticamente, participando en comunidad, consumiendo conscientemente y siendo parte del cambio.');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los elementos básicos de la comunicación?', 'Habla, escritura y señas', 'Emisor, receptor, mensaje, canal, código y contexto', 'Solo el emisor y el receptor', 'Idioma, texto y autor', 'b', 1, 'La comunicación es un proceso donde un emisor envía un mensaje a un receptor a través de un canal, usando un código compartido (idioma) y dentro de un contexto que da sentido a lo comunicado.'),
      (v_semana_id, '¿Cuál es la diferencia entre lenguaje verbal y no verbal?', 'No hay diferencia real', 'El verbal usa palabras (orales o escritas); el no verbal usa gestos, postura, expresiones, entonación o imágenes', 'Solo el verbal comunica algo', 'El no verbal solo aplica entre animales', 'b', 2, 'La comunicación humana combina ambos: las palabras transmiten información explícita, mientras gestos, miradas y entonación expresan emociones y matices que complementan o incluso contradicen el mensaje verbal.'),
      (v_semana_id, 'Si alguien dice "estoy bien" con voz triste y mirada baja, ¿qué nos enseña sobre la comunicación?', 'Que el lenguaje no verbal puede contradecir el verbal y que ambos deben analizarse juntos para entender el mensaje real', 'Que es mejor ignorar las expresiones', 'Que las palabras siempre dicen la verdad', 'Que solo importa lo dicho', 'a', 3, 'En este caso el contenido verbal contradice los signos no verbales. Saber leer ambos códigos permite comprender lo que la persona realmente siente y comunicar con mayor empatía.');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza a un texto narrativo?', 'Únicamente describe lugares', 'Solo da instrucciones paso a paso', 'Cuenta hechos reales o ficticios siguiendo una secuencia temporal con personajes, acciones, espacio y tiempo', 'Solo presenta datos científicos', 'c', 1, 'Los textos narrativos cuentan historias con estructura básica: inicio, desarrollo y desenlace. Pueden ser literarios (cuento, novela) o no literarios (crónica, biografía).'),
      (v_semana_id, '¿Cuál es el propósito de un texto expositivo?', 'Informar y explicar un tema de manera clara y objetiva', 'Entretener con historias', 'Expresar emociones personales', 'Convencer al lector de algo', 'a', 2, 'Los textos expositivos (reportes, artículos científicos, libros de texto) buscan transmitir conocimiento de forma organizada y objetiva, sin pretender persuadir al lector.'),
      (v_semana_id, 'Para defender tu opinión sobre un tema en un debate escolar, ¿qué tipo de texto debes elaborar?', 'Argumentativo, presentando una tesis con argumentos y evidencias', 'Instructivo, dando órdenes', 'Narrativo, contando una historia', 'Descriptivo, detallando características', 'a', 3, 'Los textos argumentativos defienden una postura mediante razones lógicas y pruebas. Su estructura típica es introducción con tesis, desarrollo con argumentos y conclusión que reafirma la posición.');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué función gramatical cumple el sustantivo?', 'Modifica al verbo siempre', 'Conecta oraciones', 'Nombra personas, animales, lugares, cosas o ideas', 'Expresa acciones', 'c', 1, 'El sustantivo es la palabra que designa entidades concretas (perro, ciudad) o abstractas (libertad, amor). Es el núcleo del sintagma nominal.'),
      (v_semana_id, '¿Cómo concuerda el adjetivo con el sustantivo en español?', 'Solo en número', 'Únicamente en género', 'No tiene reglas de concordancia', 'En género (masculino/femenino) y número (singular/plural)', 'd', 2, 'En español, el adjetivo debe concordar con el sustantivo en género y número: "casa bonita" (femenino singular), "libros nuevos" (masculino plural).'),
      (v_semana_id, '¿Qué error gramatical hay en "Los niño juegan en el parque grandes"?', 'Solo falta una coma', 'El verbo está mal conjugado', 'Ningún error', 'El sustantivo y el adjetivo no concuerdan: debe ser "Los niños juegan en el parque grande" (corrigiendo número y posición)', 'd', 3, 'Hay dos errores de concordancia: "niño" debe ir en plural ("niños") por el artículo "los", y "grandes" debe ir en singular ("grande") porque modifica a "parque".');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué expresa el verbo en una oración?', 'Una característica del sujeto', 'El nombre de algo', 'Una acción, estado o proceso del sujeto', 'Una conexión entre frases', 'c', 1, 'El verbo es el núcleo del predicado. Indica lo que hace o le sucede al sujeto: "corre", "está cansado", "envejece".'),
      (v_semana_id, '¿Cuáles son los componentes básicos de una oración?', 'Solo verbos', 'Únicamente sustantivos', 'Adjetivos y adverbios', 'Sujeto y predicado', 'd', 2, 'Toda oración requiere al menos sujeto (de quién o qué se habla) y predicado (lo que se dice del sujeto, cuyo núcleo es el verbo). El sujeto puede estar tácito.'),
      (v_semana_id, 'En la oración "Mi hermana estudia matemáticas todas las tardes", ¿cuál es el sujeto?', 'Todas las tardes', 'Matemáticas', 'Estudia matemáticas', 'Mi hermana', 'd', 3, '"Mi hermana" es el sujeto porque es de quien se predica (afirma) la acción "estudia matemáticas todas las tardes". Para identificar el sujeto preguntamos al verbo: ¿Quién estudia?');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué son las palabras agudas?', 'Palabras de una sola sílaba', 'Palabras donde la sílaba tónica es la última', 'Palabras sin acento', 'Palabras con acento en la antepenúltima sílaba', 'b', 1, 'Las palabras agudas tienen acento prosódico en la última sílaba. Llevan tilde si terminan en n, s o vocal: ca-fé, can-ción, com-prar (sin tilde, no termina en n/s/vocal).'),
      (v_semana_id, '¿Cuándo lleva tilde la palabra "tu"?', 'Cuando es pronombre personal (tú estudias) y no cuando es adjetivo posesivo (tu libro)', 'Nunca lleva tilde', 'Solo al inicio de oración', 'Siempre', 'a', 2, 'Es un caso de tilde diacrítica: "tú" (con tilde) es pronombre = "you", mientras "tu" (sin tilde) es posesivo = "your". Distinguir ambas es clave para escribir correctamente.'),
      (v_semana_id, '¿Cuál es la palabra correctamente escrita?', 'Ortografía', 'Ortografia', 'Hortografía', 'Hortografia', 'a', 3, '"Ortografía" se escribe sin "h" inicial y lleva tilde en la "i" porque es palabra esdrújula (acento en antepenúltima sílaba: or-to-gra-FÍ-a... espera, hiato fuerza a tildar la "í").');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la idea principal de un texto?', 'La oración más larga', 'El argumento central que el autor quiere comunicar y sobre el cual giran las ideas secundarias', 'La primera oración siempre', 'El título del texto', 'b', 1, 'La idea principal es el mensaje fundamental del texto. Las ideas secundarias la apoyan, ejemplifican o desarrollan. Puede aparecer al inicio, al final o estar implícita.'),
      (v_semana_id, '¿Qué es inferir mientras se lee?', 'Deducir información que no está explícita en el texto a partir de lo leído y los conocimientos propios', 'Memorizar el texto literal', 'Buscar palabras en el diccionario', 'Leer en voz alta', 'a', 2, 'Inferir es un nivel de comprensión profunda: implica leer "entre líneas" y conectar pistas del texto con conocimiento previo para captar significados implícitos.'),
      (v_semana_id, '¿Por qué el contexto es clave para entender una palabra desconocida?', 'Solo si está en negritas', 'No aporta nada', 'Porque las palabras alrededor (oraciones, párrafo) suelen dar pistas sobre el significado de la palabra nueva', 'Porque siempre aparece su definición', 'c', 3, 'Antes de buscar en diccionario, los buenos lectores deducen el significado por contexto: las palabras vecinas, el tema general o la lógica de la oración suelen dar suficientes pistas.');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la coherencia en un texto?', 'Tener oraciones cortas', 'Usar muchas palabras técnicas', 'La unión lógica entre las ideas, que las hace estar relacionadas y formar un todo significativo', 'La belleza del lenguaje', 'c', 1, 'Un texto coherente tiene unidad temática y sus ideas se conectan lógicamente. Un texto incoherente salta de tema sin transición o presenta contradicciones internas.'),
      (v_semana_id, '¿Qué función cumplen los conectores como "sin embargo", "por lo tanto", "además"?', 'Solo señalar pausas', 'Adornar el texto', 'Expresar relaciones lógicas entre ideas (contraste, causa-efecto, adición)', 'Indicar el final del texto', 'c', 2, 'Los conectores son señalizadores que muestran cómo se relacionan las ideas: "sin embargo" indica contraste, "por lo tanto" causa-efecto, "además" adición. Mejoran la cohesión textual.'),
      (v_semana_id, 'Al escribir un ensayo, ¿qué estructura básica debes seguir?', 'Lista de citas únicamente', 'Solo desarrollo extenso', 'Conclusión, después introducción', 'Introducción que presenta el tema, desarrollo con argumentos y conclusión que cierra', 'd', 3, 'La estructura clásica del ensayo (intro-desarrollo-conclusión) ayuda al lector a seguir el razonamiento. La introducción plantea, el desarrollo argumenta y la conclusión sintetiza o proyecta.');
  END IF;
END $$;

-- ----------- Español I (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español I" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué es importante revisar y corregir un texto antes de entregarlo?', 'Solo por requerimiento académico', 'Permite detectar errores ortográficos, gramaticales y de contenido, y mejora la claridad y credibilidad del mensaje', 'No es necesario revisar', 'Solo si lo pide el maestro', 'b', 1, 'La revisión es parte del proceso de escritura. Permite identificar y corregir errores que dificultarían la comprensión, además de pulir el estilo y verificar que se cumple el propósito comunicativo.'),
      (v_semana_id, '¿Cómo influye el dominio del español en otras áreas académicas y laborales?', 'Solo importa para escritores', 'No tiene impacto real', 'Solo importa en clase de español', 'Es base para comprender textos, expresar ideas claras, redactar reportes, comunicarse efectivamente y desempeñarse en cualquier ámbito profesional', 'd', 2, 'El español como lengua materna es herramienta transversal: leer comprensivamente, escribir con claridad y comunicarse con precisión son habilidades requeridas en todas las disciplinas y en la vida profesional.'),
      (v_semana_id, '¿Qué hábitos ayudan a mejorar la lectura y escritura?', 'Escribir solo cuando es obligado', 'Leer regularmente diversos textos, escribir con frecuencia, consultar fuentes confiables, revisar trabajos y aprender de la retroalimentación', 'Memorizar reglas', 'Solo leer libros escolares', 'b', 3, 'La habilidad lingüística se desarrolla con práctica constante y diversa: leer libros, artículos, noticias; escribir cartas, ensayos, diarios; revisar y aceptar retroalimentación. Es proceso de toda la vida.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué elementos componen un texto narrativo?', 'Solo personajes', 'Únicamente acciones', 'Solo el escenario', 'Narrador, personajes, acciones, espacio, tiempo y trama', 'd', 1, 'Una narración bien construida integra estos elementos: alguien (narrador) cuenta lo que les sucede a alguien (personajes), en algún lugar (espacio) y momento (tiempo), siguiendo una secuencia (trama).'),
      (v_semana_id, '¿Cuál es la diferencia entre narrador en primera persona y narrador omnisciente?', 'No hay diferencia', 'El primero es protagonista o testigo (yo); el omnisciente conoce todo lo que piensan y sienten los personajes desde fuera', 'Solo el omnisciente cuenta historias', 'El primero solo aparece en novelas largas', 'b', 2, 'El narrador en primera persona limita la información a lo que él vive y percibe ("Yo entré a la casa"). El omnisciente sabe todo de todos los personajes y puede entrar en sus pensamientos.'),
      (v_semana_id, '¿Cómo influye el narrador en la percepción del lector?', 'No influye en nada', 'Determina qué información se revela, cómo se interpretan los hechos y qué emociones provoca, dando perspectiva única a la historia', 'Solo importa en cuentos', 'Es indiferente para el lector', 'b', 3, 'La elección del narrador define la perspectiva: en primera persona genera intimidad pero subjetividad; en tercera puede dar objetividad o múltiples puntos de vista. Es una decisión artística clave.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la metáfora como recurso literario?', 'Repetir palabras', 'Una comparación directa entre dos elementos sin usar "como": "tus ojos son luceros"', 'Exagerar una idea', 'Imitar sonidos', 'b', 1, 'La metáfora identifica directamente un elemento con otro por una semejanza. A diferencia del símil ("como luceros"), no usa nexos comparativos. Es base de la poesía y el lenguaje cotidiano.'),
      (v_semana_id, '¿Qué es la personificación?', 'Describir personas reales', 'Usar muchos adjetivos', 'Repetir un personaje', 'Atribuir características humanas a objetos, animales o ideas: "el viento susurra"', 'd', 2, 'La personificación humaniza lo no humano. "La luna observa silenciosa" da vida a un cuerpo celeste. Es recurso frecuente en poesía, fábulas y literatura infantil.'),
      (v_semana_id, 'En "tus palabras son dagas que atraviesan mi corazón", ¿qué recursos literarios identificas?', 'Solo onomatopeya', 'Únicamente personificación', 'Ninguno', 'Metáfora (palabras=dagas) e hipérbole (atraviesan corazón) que intensifican el dolor emocional descrito', 'd', 3, 'La metáfora "palabras=dagas" identifica las palabras hirientes con armas. La hipérbole "atraviesan mi corazón" exagera para intensificar el efecto emocional. Combinados, intensifican el impacto.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuáles son los tres grandes géneros literarios?', 'Largo, mediano y corto', 'Lírico (poesía), narrativo (cuento, novela) y dramático (teatro)', 'Cuento, novela y poema', 'Realista, fantástico y romántico', 'b', 1, 'La clasificación clásica desde Aristóteles: el género lírico expresa sentimientos, el narrativo cuenta historias y el dramático representa acciones para ser puestas en escena.'),
      (v_semana_id, '¿Qué caracteriza al género dramático?', 'Solo trata temas tristes', 'Es siempre en verso', 'No tiene personajes', 'Está escrito para ser representado en escena, basado principalmente en diálogos y acotaciones', 'd', 2, 'El teatro (drama) se diferencia por su intención escénica. Su estructura privilegia los diálogos de personajes y las acotaciones (indicaciones) sobre escenografía, vestuario y movimientos.'),
      (v_semana_id, '¿En qué se diferencia un cuento de una novela?', 'Solo en el tema', 'Únicamente en el lenguaje', 'El cuento es breve, con pocos personajes y trama concentrada; la novela es extensa, con desarrollo amplio de personajes, subtramas y mayor complejidad', 'Son lo mismo', 'c', 3, 'Ambos son narrativos pero difieren en extensión y complejidad. El cuento sugiere una sola situación significativa; la novela permite desarrollar múltiples temas, evolución de personajes y mundos amplios.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la rima en un poema?', 'La coincidencia de sonidos finales en versos, desde la última vocal acentuada', 'Las palabras difíciles', 'La cantidad de versos', 'Solo el ritmo musical', 'a', 1, 'La rima es el efecto sonoro que produce la coincidencia de sonidos al final de los versos. Puede ser consonante (todos los sonidos coinciden) o asonante (solo las vocales).'),
      (v_semana_id, '¿Cuál es la diferencia entre métrica libre y métrica regular?', 'No hay diferencia', 'La regular sigue medidas fijas y rima establecida (sonetos); la libre prescinde de estas normas para seguir un ritmo más flexible y personal', 'Solo importa en canciones', 'La libre no es poesía', 'b', 2, 'La métrica regular usa esquemas fijos (cuartetos, sonetos). La libre, dominante desde el siglo XX, se libera de patrones estrictos pero sigue cuidando ritmo, sonoridad y musicalidad.'),
      (v_semana_id, 'Al analizar un poema, ¿qué elementos debes considerar?', 'Tema, voz lírica, recursos literarios, estructura, métrica, rima, tono y contexto histórico', 'Solo si rima', 'Únicamente el autor', 'Solo la longitud', 'a', 3, 'El análisis poético es multidimensional: identificar el tema y la voz que habla, los recursos usados, la forma (estructura, métrica), el tono emocional y el contexto en que fue escrito enriquece la interpretación.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la diferencia entre mito y leyenda?', 'Las leyendas son inventadas y los mitos verdaderos', 'Son sinónimos', 'El mito explica el origen del mundo, dioses y fenómenos con seres sobrenaturales; la leyenda combina elementos históricos con fantasía y suele ubicarse en un lugar concreto', 'Solo se diferencian en la longitud', 'c', 1, 'Los mitos (como los griegos o aztecas) responden preguntas existenciales mediante dioses y héroes cósmicos. Las leyendas (la Llorona, el Charro Negro) suelen tener anclaje geográfico-temporal aunque incluyan lo sobrenatural.'),
      (v_semana_id, '¿Qué función cumplen las leyendas en una cultura?', 'Solo entretener a niños', 'Reemplazar la historia oficial', 'No tienen función', 'Transmitir valores, explicar fenómenos, fortalecer identidad cultural, advertir sobre conductas y preservar memoria colectiva', 'd', 2, 'Las leyendas cumplen funciones sociales: enseñan moralejas, mantienen vivos lugares y personajes, refuerzan la identidad de un pueblo y transmiten saberes ancestrales de generación en generación.'),
      (v_semana_id, '¿Por qué el mito de Quetzalcóatl es importante en la cultura mexicana?', 'No es relevante', 'Como deidad creadora y civilizadora en culturas mesoamericanas, simboliza dualidad, sabiduría y renovación, y forma parte central del legado cultural prehispánico', 'Solo aparece en libros antiguos', 'Es un mito reciente', 'b', 3, 'Quetzalcóatl (serpiente emplumada) era venerado por toltecas, mexicas y mayas. Representa la unión de cielo y tierra, el conocimiento, las artes y los ciclos de muerte-renacimiento. Es ícono de la cosmovisión mesoamericana.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una reseña crítica?', 'Un comentario sin estructura', 'Una copia del texto original', 'Un texto que presenta y valora una obra (libro, película) describiendo brevemente su contenido y emitiendo juicios fundamentados', 'Solo un resumen extenso', 'c', 1, 'La reseña combina información (qué es la obra, sobre qué trata) con valoración (qué tan bien lo logra, qué destaca, qué falla). Sus juicios deben sustentarse en argumentos, no en simples opiniones.'),
      (v_semana_id, '¿Cuál es la diferencia clave entre resumen y reseña?', 'La reseña no tiene información del texto', 'Son lo mismo', 'El resumen condensa la información manteniendo neutralidad; la reseña además valora y emite opinión crítica', 'Solo el resumen es académico', 'c', 2, 'El resumen busca brevedad y fidelidad al original. La reseña va más allá: presenta la obra y la juzga (calidad literaria, originalidad, alcance, recomendación). Ambas son herramientas distintas con propósitos diferentes.'),
      (v_semana_id, 'Al escribir una reseña sobre un libro que no te gustó, ¿qué debes incluir?', 'Solo decir "no me gustó"', 'Insultos al autor', 'Información básica de la obra, tus argumentos fundamentados sobre por qué no te convenció (estilo, trama, personajes, etc.) y posible recomendación', 'Solo elogios para parecer educado', 'c', 3, 'La reseña crítica honesta permite valoraciones negativas, pero estas deben sustentarse: qué problemas identificas (ritmo lento, personajes planos, errores), no descalificación personal. Esto la diferencia del comentario destructivo.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué características distinguen a un buen orador?', 'Claridad, conocimiento del tema, conexión con la audiencia, lenguaje no verbal apropiado, voz modulada y estructura clara del mensaje', 'Hablar muy rápido', 'Solo memorizar todo', 'Únicamente hablar fuerte', 'a', 1, 'Un buen orador combina contenido sólido con presentación efectiva: domina su tema, organiza ideas, mantiene contacto visual, modula la voz, gestiona los gestos y conecta emocionalmente con el público.'),
      (v_semana_id, '¿Cómo prepararse para una exposición oral?', 'Improvisar en el momento', 'Leer todo de papel', 'Investigar el tema, organizar las ideas, preparar apoyos visuales claros, ensayar varias veces, anticipar preguntas y manejar nervios', 'Solo aprenderse el inicio', 'c', 2, 'La preparación es 90% del éxito: dominio del contenido, estructura clara con introducción-desarrollo-conclusión, materiales visuales que apoyen sin distraer, ensayo en voz alta para detectar errores y manejar tiempos.'),
      (v_semana_id, 'En un debate, ¿cuál es la mejor estrategia para defender tu postura?', 'Argumentar con datos, ejemplos y razonamientos sólidos, escuchar al oponente para responder, mantener respeto y reconocer puntos válidos contrarios cuando aplique', 'Solo descalificar al otro', 'Memorizar respuestas únicas', 'Hablar más fuerte que el oponente', 'a', 3, 'El debate efectivo combina argumentación sólida, escucha activa, respeto al adversario y honestidad intelectual. Reconocer un buen punto del otro fortalece tu credibilidad y permite refutar con mayor precisión.');
  END IF;
END $$;

-- ----------- Español II (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español II" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué papel cumple la literatura en la formación humana?', 'Solo entretener pasajeramente', 'Solo cumplir requisitos escolares', 'Es una pérdida de tiempo', 'Desarrolla pensamiento crítico, empatía, imaginación, conocimiento del lenguaje y comprensión de la condición humana en distintas épocas y culturas', 'd', 1, 'Leer literatura nos pone en otros mundos y mentes, expandiendo nuestra capacidad de entender experiencias ajenas (empatía), pensar en abstracto, manejar el lenguaje con riqueza y enfrentar dilemas humanos universales.'),
      (v_semana_id, '¿Cómo se relacionan los géneros literarios con la realidad social?', 'Reflejan las preocupaciones, valores y conflictos de su época, ofreciendo perspectivas críticas sobre la sociedad que las produce', 'Solo retratan fantasía', 'Solo describen lo individual', 'No tienen relación', 'a', 2, 'Cada época produce literatura que la refleja: el Romanticismo expresó individualismo y libertad post-Ilustración; el Realismo documentó la industrialización; la literatura latinoamericana del siglo XX abordó identidad y dictaduras.'),
      (v_semana_id, '¿Por qué leer y escribir bien sigue siendo crucial en la era digital?', 'En la era de información abundante, leer críticamente y escribir con claridad permite distinguir fuentes confiables, comunicar ideas eficazmente, no caer en desinformación y participar plenamente en sociedad', 'Las imágenes reemplazaron al texto', 'Ya no es necesario', 'Solo importa para algunos trabajos', 'a', 3, 'Paradójicamente, en la era digital la lectoescritura es más crítica que nunca: necesitamos discernir noticias falsas, expresarnos por escrito (mensajes, correos, redes), entender contratos, leer instrucciones y construir argumentos sólidos.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la intertextualidad?', 'Usar palabras extranjeras', 'Tener varios temas', 'Copiar otro texto', 'La relación o referencia que un texto hace a otras obras, ideas o discursos previos, enriqueciendo significados', 'd', 1, 'La intertextualidad ocurre cuando una obra dialoga con otras: una novela que cita a Shakespeare, una canción que evoca un poema, una película que reinterpreta un mito. Enriquece la lectura para quien capta las referencias.'),
      (v_semana_id, '¿Cómo identificar el propósito comunicativo de un texto complejo?', 'Solo por el título', 'Solo leyendo el primer párrafo', 'Analizando contexto, lenguaje, estructura y argumentos: ¿busca informar, persuadir, conmover, entretener o instruir?', 'Adivinando', 'c', 2, 'El propósito guía toda la composición. Un texto científico busca informar (lenguaje preciso, datos), uno publicitario persuadir (emociones, llamados a la acción), uno literario conmover. Identificarlo ayuda a interpretar mejor.'),
      (v_semana_id, 'Al leer una columna de opinión sobre un tema social, ¿qué debes hacer?', 'Identificar la postura del autor, los argumentos que usa, las evidencias que presenta y posibles sesgos para evaluar críticamente sus afirmaciones', 'Solo memorizar las ideas', 'Ignorarla por subjetiva', 'Aceptar todo lo que dice', 'a', 3, 'Los textos argumentativos requieren lectura crítica activa: ¿qué postura defiende? ¿qué evidencia ofrece? ¿qué posibles contraargumentos ignora? ¿hay sesgos ideológicos? Esto evita aceptación pasiva o rechazo automático.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué caracteriza a la literatura clásica universal?', 'Solo es antigua', 'Trasciende su época por abordar temas humanos universales (amor, muerte, justicia, poder) con calidad estética perdurable', 'Es obsoleta', 'Solo se lee en universidades', 'b', 1, 'Los clásicos (Homero, Shakespeare, Cervantes, Dante) siguen leyéndose siglos después porque sus temas y conflictos siguen siendo relevantes, y su calidad artística los convierte en referentes culturales perdurables.'),
      (v_semana_id, '¿Qué es el realismo mágico y qué autor latinoamericano lo popularizó?', 'Un género de pura fantasía', 'Solo poesía romántica', 'Una corriente exclusivamente fantástica', 'Movimiento literario que integra elementos fantásticos en contextos cotidianos como si fueran naturales; Gabriel García Márquez con "Cien años de soledad" lo popularizó mundialmente', 'd', 2, 'El realismo mágico incorpora lo extraordinario sin asombro, reflejando la cosmovisión latinoamericana. García Márquez (Nobel 1982) lo llevó a fama mundial; Carpentier, Asturias, Allende también lo cultivan.'),
      (v_semana_id, '¿Qué aporta la literatura mexicana contemporánea al panorama mundial?', 'Solo lectores nacionales', 'Voces diversas (Castellanos, Paz, Fuentes, Esquivel, Volpi) que exploran identidad, frontera, género, política y la complejidad cultural mexicana', 'Únicamente literatura indigenista', 'No tiene aportes', 'b', 3, 'México ha aportado figuras esenciales: Octavio Paz (Nobel), Carlos Fuentes (cosmopolita), Rosario Castellanos (feminismo), Juan Rulfo (renovador), Laura Esquivel (best-seller mundial). Su literatura dialoga con preocupaciones globales.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una falacia argumentativa?', 'Un razonamiento que parece válido pero contiene errores lógicos que invalidan la conclusión', 'Una opinión personal', 'Un dato verdadero', 'Un argumento sólido', 'a', 1, 'Las falacias son trampas argumentales: ataque personal (ad hominem), apelación a autoridad falsa, generalización apresurada, falsa causa. Identificarlas protege del engaño y fortalece nuestro pensamiento crítico.'),
      (v_semana_id, '¿Qué tipo de falacia es atacar a la persona en lugar de su argumento?', 'Falsa autoridad', 'Ad hominem', 'Generalización', 'Causa falsa', 'b', 2, 'La falacia ad hominem desvía la atención del argumento atacando al que lo sostiene. "No le hagas caso, está enojado" no responde al argumento sino que descalifica al hablante. Es muy frecuente en debates públicos.'),
      (v_semana_id, '¿Cómo construir un argumento sólido?', 'Hablando muy fuerte', 'Solo con opinión personal', 'Repitiendo la conclusión muchas veces', 'Con tesis clara, premisas verdaderas, conexión lógica entre ellas, evidencias confiables y consideración de contraargumentos', 'd', 3, 'Un argumento sólido tiene una conclusión sustentada en premisas verdaderas conectadas lógicamente, respaldadas con evidencia (datos, ejemplos, expertos) y que considera (y refuta) las objeciones contrarias.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la diferencia entre noticia y reportaje?', 'La noticia es breve e informa hechos recientes; el reportaje es más extenso, profundiza con investigación, contexto, entrevistas y análisis', 'Solo se diferencian en el formato', 'El reportaje es ficción', 'Son lo mismo', 'a', 1, 'La noticia responde rápidamente al qué, quién, cuándo, dónde y por qué. El reportaje desarrolla esos aspectos con profundidad: visita escenarios, entrevista actores, contextualiza histórica y socialmente.'),
      (v_semana_id, '¿Qué responsabilidad ética tienen los medios de comunicación?', 'Vender lo más posible', 'Solo entretener', 'Informar verídicamente, contrastar fuentes, dar voz a diversos actores, separar información de opinión, respetar dignidad y servir al interés público', 'Repetir lo que digan los gobiernos', 'c', 2, 'El periodismo profesional sigue principios éticos: veracidad (verificar antes de publicar), pluralidad (incluir múltiples perspectivas), independencia (no someterse a poderes), respeto a la privacidad y compromiso democrático.'),
      (v_semana_id, '¿Cómo identificar noticias falsas (fake news)?', 'Si están en redes sociales son verdaderas', 'Si están en internet son falsas', 'Verificando fuente original, contrastando con otros medios confiables, revisando fecha, identificando sensacionalismo y desconfiando si solo apela a emociones extremas', 'Confiando en lo más compartido', 'c', 3, 'Verificar implica buscar la fuente primaria, ver si medios reconocidos la reportan, revisar la fecha (a veces son notas viejas recicladas), desconfiar de titulares amarillistas o que "confirman" lo que ya creemos.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un texto académico?', 'Texto que solo escriben profesores', 'Cualquier ensayo escolar', 'Cualquier texto largo', 'Producción escrita con propósito de conocimiento, basada en investigación, con lenguaje formal, estructura clara y citas a fuentes verificables', 'd', 1, 'El texto académico (ensayo, monografía, artículo, tesis) busca aportar al conocimiento. Se caracteriza por rigor metodológico, lenguaje formal, argumentación basada en evidencia y citas que permiten verificar las fuentes.'),
      (v_semana_id, '¿Por qué es importante citar las fuentes en un trabajo académico?', 'Por requisito burocrático', 'Para reconocer ideas ajenas, dar credibilidad a tus argumentos, permitir verificar afirmaciones y evitar el plagio (ético y legal)', 'No es importante', 'Solo para alargar el texto', 'b', 2, 'Citar permite distinguir tus ideas de las ajenas, da peso a tus argumentos al apoyarlos en investigaciones previas, demuestra rigor académico y evita el plagio, que es una falta ética grave.'),
      (v_semana_id, '¿Qué es el plagio académico?', 'Citar muchas fuentes', 'Resumir un texto', 'Tomar las ideas o palabras de otro autor presentándolas como propias, sin reconocer su autoría', 'Inspirarse en algo', 'c', 3, 'El plagio es robo intelectual: copiar fragmentos sin citarlos, parafrasear sin atribución, presentar trabajos de otros como propios. Es falta grave que daña tu integridad y puede tener consecuencias académicas serias.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es un texto multimodal?', 'Un texto con muchas páginas', 'Un texto que combina diferentes códigos comunicativos (escrito, visual, auditivo) para construir significado: infografías, videos con subtítulos, presentaciones', 'Solo texto escrito', 'Texto en varios idiomas', 'b', 1, 'En la era digital la comunicación es cada vez más multimodal: una infografía combina texto, imagen y datos; un tutorial integra video, audio y texto. Saber producir y leer estos textos es alfabetización contemporánea.'),
      (v_semana_id, '¿Qué consideraciones éticas debes tener al comunicar en redes sociales?', 'Verificar antes de compartir, respetar privacidad, evitar discursos de odio, ser consciente de que es público y permanente, y considerar el impacto en otros', 'Decir todo lo que pensamos', 'Ninguna, es libre', 'Solo evitar groserías', 'a', 2, 'Las redes amplifican lo que decimos a audiencias enormes. Implica responsabilidad: no replicar mentiras, no exponer datos ajenos, no agredir ni discriminar, recordar que lo publicado puede afectar reputaciones y oportunidades futuras.'),
      (v_semana_id, '¿Cómo afecta el lenguaje de las redes (abreviaturas, emojis, memes) a la lengua española?', 'Solo afecta a jóvenes', 'Cambia el idioma para siempre negativamente', 'La empobrece sin remedio', 'Es un cambio normal: las lenguas evolucionan; coexisten registros formales e informales; lo importante es saber adaptarse a cada contexto comunicativo', 'd', 3, 'Las lenguas siempre evolucionan. El español de redes (LOL, jajaja, emojis) es un registro informal válido entre amigos, pero no reemplaza al español formal académico o profesional. Saber moverse entre registros es señal de competencia lingüística.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuántas lenguas indígenas se hablan oficialmente en México?', '100 lenguas', '5 lenguas', '12 lenguas', '68 lenguas con sus variantes', 'd', 1, 'México reconoce 68 agrupaciones lingüísticas indígenas con cerca de 364 variantes (INALI). Las más habladas son náhuatl, maya, tzeltal, mixteco, zapoteco. Son patrimonio cultural y derechos protegidos constitucionalmente.'),
      (v_semana_id, '¿Por qué es importante preservar las lenguas indígenas?', 'Solo por nostalgia', 'No es importante', 'Cada lengua representa una cosmovisión única, conocimientos ancestrales, identidad de un pueblo y diversidad cultural; perderlas es empobrecer la humanidad', 'Solo se usan en zonas rurales', 'c', 2, 'Las lenguas son tesoros culturales: cada una codifica una forma única de ver el mundo, saberes ancestrales (medicinales, ecológicos), historia colectiva. Su pérdida (lingüicidio) reduce la diversidad humana.'),
      (v_semana_id, '¿Qué son los préstamos lingüísticos?', 'Errores que deben corregirse', 'Palabras tomadas de otras lenguas que se incorporan al español; muestran contactos culturales (chocolate del náhuatl, hamaca del taíno, software del inglés)', 'Palabras prestadas que devuelves', 'Palabras nuevas inventadas', 'b', 3, 'Los préstamos enriquecen las lenguas a través del contacto cultural. El español tiene préstamos del árabe (almohada), náhuatl (aguacate), inglés (fútbol), francés (chofer). Es proceso natural y enriquecedor.');
  END IF;
END $$;

-- ----------- Español III (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Español III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Español III" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se relacionan lengua, cultura e identidad?', 'Profundamente entrelazadas: la lengua materna conforma nuestra forma de pensar y conectarnos con la cultura, mientras la cultura define el uso del lenguaje y la identidad personal y colectiva', 'Solo coinciden a veces', 'Lengua y cultura son temas diferentes', 'No tienen relación', 'a', 1, 'La lengua que hablamos influye en cómo categorizamos la realidad, expresamos emociones y construimos identidad. Por eso aprender un idioma nuevo amplía no solo vocabulario sino formas de pensar y experimentar el mundo.'),
      (v_semana_id, '¿Qué habilidades comunicativas son esenciales para el siglo XXI?', 'Únicamente hablar inglés', 'Solo dominar redes sociales', 'Lectura crítica, escritura clara, expresión oral efectiva, escucha activa, comunicación intercultural y dominio de medios digitales', 'Solo escribir bien', 'c', 2, 'El siglo XXI demanda comunicadores integrales: capaces de leer crítica y diversamente, escribir para públicos variados, hablar con eficacia, escuchar empáticamente, dialogar entre culturas y usar múltiples plataformas digitales.'),
      (v_semana_id, '¿Cómo seguir desarrollando tus habilidades lingüísticas después de la secundaria?', 'Leyendo regularmente, escribiendo con frecuencia, conversando sobre temas diversos, exponiéndote a buena literatura, aprendiendo otra lengua y siendo curioso del lenguaje cotidiano', 'Solo si estudias letras', 'Esperando a la universidad', 'Ya no es necesario', 'a', 3, 'El dominio del lenguaje es proceso de toda la vida. Leer literatura y ensayos diversos, escribir reflexiones, debatir, aprender otro idioma y observar cómo otros usan el lenguaje son hábitos que mantienen y expanden la competencia comunicativa.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which is the appropriate response to "How are you?" in English?', 'I am 15 years old', 'My name is Ana', 'I''m fine, thank you', 'I live in Mexico', 'c', 1, 'When someone asks "How are you?", they want to know how you feel. The standard polite responses are "I''m fine, thank you", "I''m good", or "I''m doing well, thanks".'),
      (v_semana_id, 'How do you correctly introduce yourself in English?', 'My name Ana, I from Mexico', 'My name is Ana and I am from Mexico', 'I name Ana from Mexico', 'Me Ana, Mexico', 'b', 2, 'A complete introduction uses "My name is..." and "I am from..." (note: "to be" + "from" + place). The verb "to be" must always be present in English.'),
      (v_semana_id, 'Which greeting is appropriate for a formal situation, like meeting a school principal?', 'Good morning, nice to meet you', 'Hi dude, how''s it going?', 'Yo, what''s up?', 'Hey buddy!', 'a', 3, 'Formal greetings include "Good morning/afternoon/evening" and "Nice to meet you". Informal expressions like "Yo", "What''s up?", or "Dude" are inappropriate for formal contexts.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What is the correct form of "to be" for the subject "they"?', 'is', 'am', 'be', 'are', 'd', 1, 'The verb "to be" in present tense: I am, you are, he/she/it is, we are, they are. "They" always uses "are".'),
      (v_semana_id, 'Which sentence is grammatically correct?', 'He is my brother', 'She are a teacher', 'They is students', 'I is from Mexico', 'a', 2, 'The verb "to be" must agree with the subject: I am, You are, He/She/It is, We/They are. Only option D follows this rule correctly.'),
      (v_semana_id, 'How do you make a negative sentence with "to be"?', 'Adding "not" after the verb: "I am not tired" (also "I''m not tired")', 'Putting the verb at the end', 'Doubling the verb', 'Adding "no" before the verb: "I no am tired"', 'a', 3, 'To negate "to be", add "not" after the verb: I am not / I''m not, you are not / you aren''t, he is not / he isn''t. Spanish "no" doesn''t apply here.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What is the possessive adjective for "she"?', 'their', 'its', 'his', 'her', 'd', 1, 'Possessive adjectives: my (I), your (you), his (he), her (she), its (it), our (we), their (they). "Her book" means the book belongs to her.'),
      (v_semana_id, 'Which sentence uses pronouns correctly?', 'I am happy and her is sad', 'Me happy and she sad', 'Me am happy and she is sad', 'I am happy and she is sad', 'd', 2, 'Subject pronouns (I, you, he, she, we, they) come before the verb. "Me" is an object pronoun and cannot be a sentence subject in English.'),
      (v_semana_id, 'How do you say "este libro es mío" in English?', 'This book is my', 'This is book mine', 'This book me', 'This book is mine', 'd', 3, 'Possessive pronouns stand alone: mine, yours, his, hers, ours, theirs. "Mine" replaces "my book". Don''t confuse with possessive adjective "my" which always precedes a noun.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which sentence is in the simple present tense?', 'She will eat breakfast tomorrow', 'She eats breakfast every morning', 'She ate breakfast yesterday', 'She is eating breakfast right now', 'b', 1, 'The simple present expresses habits and routines (every morning, every day, usually). Note that third person singular (he/she/it) adds -s to the verb: eats, runs, plays.'),
      (v_semana_id, 'What is the correct form: "He _____ soccer on weekends"?', 'played', 'play', 'plays', 'playing', 'c', 2, 'In simple present, third person singular (he, she, it) adds -s to the verb: he plays, she works, it runs. The base form (play) is for I, you, we, they.'),
      (v_semana_id, 'How do you form a question in simple present with "do/does"?', 'Coffee you like?', 'Do you like coffee? / Does she like coffee?', 'You do like coffee?', 'Like you coffee?', 'b', 3, 'Simple present questions use "do" (I, you, we, they) or "does" (he, she, it) followed by subject and base verb: "Do you like...?", "Does he speak...?". The verb stays in base form.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'How do you correctly say 3:30 PM in English?', 'Thirty three', 'Three half', 'Half past three (in the afternoon)', 'Three with thirty', 'c', 1, 'Time expressions: 3:30 = "half past three" or "three thirty". For exactness: 3:15 = "quarter past three", 3:45 = "quarter to four". "PM" indicates afternoon.'),
      (v_semana_id, 'What number is "fifteen"?', '500', '5', '50', '15', 'd', 2, 'Numbers ending in "-teen" are 13-19: thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen. They''re different from "-ty" numbers (50=fifty, 15=fifteen).'),
      (v_semana_id, 'How do you say "Son las dos en punto" in English?', 'Are two hour', 'Two clock', 'It''s two o''clock', 'It''s two times', 'c', 3, 'Exact times use "o''clock" (only with whole hours): It''s one o''clock, two o''clock, etc. Note "It is" / "It''s" is needed at the start.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'What does "sibling" mean?', 'Parent', 'Cousin', 'Brother or sister', 'Grandparent', 'c', 1, '"Sibling" is a generic term that includes brothers and sisters. It''s useful when you don''t want to specify gender or when talking about both.'),
      (v_semana_id, 'Which sentence describes family correctly?', 'My father he is doctor', 'I have two sister', 'My mother is a teacher and my father is an engineer', 'Family big my', 'c', 2, 'In English use article "a/an" before professions: "She is a teacher", "He is an engineer". Don''t repeat the subject ("my father he"). Plural nouns add -s: "two sisters".'),
      (v_semana_id, 'How do you ask someone about their family in English?', 'How is your family?', 'Where is your family?', 'Family you?', 'Tell me family', 'a', 3, 'Common questions about family: "How is your family?", "Do you have brothers or sisters?", "Where do your parents live?". Maintaining the question structure (auxiliary + subject + verb) is essential.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Which sentence describes a daily routine correctly?', 'I waking up 7 AM', 'Me wake 7', 'I am wake 7 AM', 'I wake up at 7 AM every day', 'd', 1, 'For routines use simple present: "I wake up", "I have breakfast", "I go to school". Frequency expressions like "every day", "always", "usually" reinforce the habitual nature.'),
      (v_semana_id, 'What does "have breakfast" mean?', 'Eat the first meal of the day', 'Take a shower', 'Go to school', 'Sleep all morning', 'a', 2, 'In English we use "have" with meals: have breakfast (desayunar), have lunch (almorzar), have dinner (cenar). It''s an idiomatic expression that doesn''t translate literally as "tener desayuno".'),
      (v_semana_id, 'How do you ask about someone''s daily schedule?', 'When you do?', 'What time do you usually wake up? / What do you do every day?', 'Schedule you?', 'What''s your schedule?', 'b', 3, 'Useful questions: "What time do you wake up/go to school/have lunch?", "What do you usually do on weekends?", "How often do you...?". The "do" structure with base verb is fundamental.');
  END IF;
END $$;

-- ----------- Inglés Básico (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Inglés Básico'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Inglés Básico" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Why is learning English important in the modern world?', 'It''s only useful for travel', 'It''s a global lingua franca for business, science, technology, education and culture, expanding personal and professional opportunities', 'It''s only spoken in the United States', 'It has no real impact', 'b', 1, 'English is the most widely used international language: in commerce, science, technology, internet, academia. Mastering it opens doors in studies, work, travel and access to global information.'),
      (v_semana_id, 'What is the most effective way to keep learning English?', 'Only study textbooks', 'Reading, listening to music, watching movies, practicing conversation, and using language apps consistently', 'Wait for the next school grade', 'Memorize all the rules', 'b', 2, 'Languages are learned by exposure and practice: read books appropriate to your level, listen to music with translations, watch series with subtitles, talk with native speakers (online or in person), and use Duolingo, Anki or similar apps.'),
      (v_semana_id, 'How can you continue practicing English after secondary school?', 'Watch English content, read articles or books, listen to podcasts, find a conversation partner, and seize every opportunity to use the language', 'Wait for a teacher to teach you', 'Stop because it''s no longer needed', 'Only if your career requires it', 'a', 3, 'Mastery requires daily exposure and practice. Surround yourself with English content, write a journal, find friends to practice with, take advantage of free resources online. Constant immersion makes the difference between knowing rules and dominating the language.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es el resultado de 5 + 3 × 2?', '13', '20', '16', '11', 'd', 1, 'Por jerarquía de operaciones, primero se multiplica: 3 × 2 = 6, luego se suma: 5 + 6 = 11. La regla "PEMDAS" o "BODMAS" indica el orden: paréntesis, exponentes, multiplicación/división, suma/resta.'),
      (v_semana_id, '¿Qué número es divisible exactamente entre 4?', '23', '36', '50', '17', 'b', 2, '36 ÷ 4 = 9 sin residuo. Un número es divisible entre 4 si sus dos últimos dígitos forman un número divisible entre 4. En 36, los dos últimos dígitos son 36, que sí es divisible.'),
      (v_semana_id, 'Si compras 3 productos a $25 cada uno y pagas con un billete de $100, ¿cuánto recibes de cambio?', '$25', '$50', '$75', '$15', 'a', 3, 'Total: 3 × $25 = $75. Cambio: $100 - $75 = $25. Este tipo de problema combina multiplicación y resta, habilidades básicas para situaciones cotidianas como compras.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuánto es 1/2 + 1/4?', '1/8', '3/4', '2/6', '1/6', 'b', 1, 'Para sumar fracciones se necesita un denominador común. 1/2 = 2/4, entonces 2/4 + 1/4 = 3/4. Si los denominadores no son iguales, se buscan equivalentes con el mismo denominador.'),
      (v_semana_id, '¿Cómo se escribe 0.75 como fracción simplificada?', '7/10', '3/4', '1/4', '75/100', 'b', 2, '0.75 = 75/100. Simplificando dividiendo numerador y denominador entre 25: 75÷25=3, 100÷25=4, resultado: 3/4. Es una conversión común útil para entender porcentajes y proporciones.'),
      (v_semana_id, 'Si tienes 3/8 de pizza y comes 1/8, ¿cuánta pizza te queda?', '0', '3/16', '4/8', '2/8 = 1/4', 'd', 3, '3/8 - 1/8 = 2/8 = 1/4. Cuando los denominadores son iguales, solo se restan los numeradores. Después se simplifica si es posible: 2/8 ÷ 2/2 = 1/4.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuánto es el 25% de 200?', '50', '100', '25', '40', 'a', 1, '25% es equivalente a 1/4 o 0.25. Entonces: 200 × 0.25 = 50. Otra forma: 25% de 200 = (25 × 200) ÷ 100 = 50. Los porcentajes son fracciones de 100.'),
      (v_semana_id, 'Si una camisa cuesta $400 y tiene 20% de descuento, ¿cuál es el precio final?', '$200', '$420', '$320', '$380', 'c', 2, 'Descuento: 20% de $400 = $80. Precio final: $400 - $80 = $320. Para descuentos, primero calculas el monto del descuento, luego lo restas del precio original.'),
      (v_semana_id, 'En una clase de 30 alumnos, 18 son mujeres. ¿Qué proporción representan?', '90% son mujeres', '60% son mujeres y 40% son hombres', '50% son mujeres', '30% son mujeres', 'b', 3, '18/30 = 0.60 = 60% mujeres. Hombres: 30 - 18 = 12, equivalente al 40%. Las proporciones permiten expresar partes de un todo en porcentaje, fracción o decimal.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es el valor de x en la ecuación x + 5 = 12?', '12', '17', '5', '7', 'd', 1, 'Para despejar x, restamos 5 a ambos lados: x + 5 - 5 = 12 - 5, entonces x = 7. La regla básica es hacer la operación inversa para aislar la variable.'),
      (v_semana_id, 'Resuelve: 3x - 6 = 15', 'x = 7', 'x = 9', 'x = 3', 'x = 5', 'a', 2, 'Primero sumamos 6 a ambos lados: 3x = 21. Luego dividimos entre 3: x = 7. Verificación: 3(7) - 6 = 21 - 6 = 15 ✓. Siempre verifica sustituyendo el resultado.'),
      (v_semana_id, 'Si la edad de Pedro hace 5 años era 12, ¿cuál es su edad ahora?', '17 años', '5 años', '7 años', '12 años', 'a', 3, 'Si llamamos x a su edad actual: x - 5 = 12, entonces x = 17. Los problemas de palabras se resuelven traduciéndolos a ecuaciones y luego despejando la incógnita.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es el área de un rectángulo de 6 m de largo y 4 m de ancho?', '24 m²', '12 m²', '10 m²', '20 m²', 'a', 1, 'Área del rectángulo = base × altura = 6 × 4 = 24 m². El área se mide en unidades cuadradas porque cubre una superficie bidimensional.'),
      (v_semana_id, '¿Qué tipo de triángulo tiene los tres lados iguales?', 'Rectángulo', 'Isósceles', 'Equilátero', 'Escaleno', 'c', 2, 'Triángulo equilátero: tres lados iguales y tres ángulos iguales (60° cada uno). Isósceles: dos lados iguales. Escaleno: tres lados diferentes. Rectángulo: tiene un ángulo de 90°.'),
      (v_semana_id, '¿Cuál es el perímetro de un cuadrado de 5 cm de lado?', '10 cm', '15 cm', '20 cm', '25 cm', 'c', 3, 'Perímetro del cuadrado = 4 × lado = 4 × 5 = 20 cm. El perímetro es la suma de todos los lados; en cuadrado se simplifica multiplicando un lado por 4 al ser todos iguales.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué representa la media o promedio?', 'La suma de todos los valores dividida entre el número total de valores', 'El valor central', 'El valor máximo', 'El valor que más se repite', 'a', 1, 'La media aritmética es el promedio: sumas todos los datos y divides entre cuántos son. Ejemplo: media de [4, 6, 8] = (4+6+8)/3 = 6.'),
      (v_semana_id, 'En el conjunto {2, 4, 4, 6, 8}, ¿cuál es la moda?', '6', '8', '2', '4', 'd', 2, 'La moda es el valor que aparece con mayor frecuencia. En este conjunto, 4 aparece dos veces; los demás solo una. Puede haber más de una moda (bimodal) o ninguna si todos los valores son únicos.'),
      (v_semana_id, '¿Cuál es la mediana del conjunto {3, 5, 7, 9, 11}?', '3', '5', '7', '11', 'c', 3, 'La mediana es el valor central cuando los datos están ordenados. En este conjunto ordenado, el valor central es 7. Si el número de datos es par, la mediana es el promedio de los dos centrales.');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Al lanzar un dado, ¿cuál es la probabilidad de obtener un número par?', '2/3', '1/6', '1/2', '1/3', 'c', 1, 'Hay 6 caras posibles y 3 son pares (2, 4, 6). Probabilidad = casos favorables / casos totales = 3/6 = 1/2 = 50%. La probabilidad va de 0 (imposible) a 1 (certeza).'),
      (v_semana_id, 'En una bolsa hay 5 canicas rojas y 5 azules. ¿Qué probabilidad hay de sacar una roja sin ver?', '1/2', '5/10 que se simplifica a 1/2', '1/10', '5/5', 'b', 2, 'Hay 5 favorables (rojas) sobre 10 totales: 5/10 = 1/2 = 50%. Cuando los casos están equilibrados, la probabilidad refleja esa proporción. La forma simplificada (1/2) es preferible.'),
      (v_semana_id, '¿Por qué la probabilidad de un evento siempre está entre 0 y 1?', 'Es solo una convención', 'Por costumbre matemática', 'No siempre está en ese rango', 'Porque 0 representa imposibilidad y 1 representa certeza absoluta; cualquier evento real está entre estos extremos', 'd', 3, 'Probabilidad 0 = evento imposible (sacar 7 en dado normal). Probabilidad 1 = evento seguro (que el sol salga mañana). Eventos reales tienen probabilidades intermedias. Se expresa también como porcentaje (0% a 100%).');
  END IF;
END $$;

-- ----------- Matemáticas I (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas I'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas I" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Por qué las matemáticas son importantes en la vida cotidiana?', 'No tienen aplicación práctica', 'Solo para resolver problemas escolares', 'Porque permiten razonar lógicamente, manejar dinero, calcular tiempos, interpretar datos, tomar decisiones informadas y son base de ciencia y tecnología', 'Solo si trabajas en ciencias', 'c', 1, 'Las matemáticas están en presupuestos, descuentos, recetas (proporciones), planeación de tiempo, interpretación de gráficas en noticias. Quien las domina toma mejores decisiones financieras y vitales.'),
      (v_semana_id, 'Si quieres calcular cuánto pagar por 4 productos a $35 cada uno con 10% de descuento, ¿qué pasos sigues?', 'Solo sumas todo', 'Multiplicas 4 × $35 = $140, calculas 10% = $14, restas: $140 - $14 = $126', 'Solo multiplicas', 'Lo calculas mentalmente sin pasos', 'b', 2, 'Resolver paso a paso: total bruto, calcular descuento, aplicarlo. Esto integra multiplicación, porcentajes y resta. La estrategia es descomponer problemas complejos en pasos manejables.'),
      (v_semana_id, '¿Cómo seguir mejorando tus habilidades matemáticas?', 'Solo cuando hay examen', 'Esperar a la siguiente clase', 'Solo memorizar fórmulas', 'Practicar regularmente, resolver problemas variados, entender los conceptos (no solo memorizar), aplicarlos a situaciones reales y no temer cometer errores al aprender', 'd', 3, 'Las matemáticas se dominan con práctica entendida (no mecánica), aplicación a problemas reales y persistencia. Los errores son parte del aprendizaje: revelan dónde reforzar conceptos.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una variable en álgebra?', 'Un símbolo (generalmente letras como x o y) que representa un valor desconocido o que puede cambiar', 'Una operación matemática', 'Solo se usa en geometría', 'Un número fijo', 'a', 1, 'Las variables son letras que representan números. En "x + 5 = 10", x es una variable cuyo valor buscamos (x = 5). En fórmulas como área = base × altura, son magnitudes que pueden cambiar.'),
      (v_semana_id, 'Simplifica: 3x + 2x - x', '6x', '4', '4x', '5x', 'c', 2, 'Términos semejantes (con la misma variable y exponente) se pueden combinar: 3x + 2x - x = (3+2-1)x = 4x. Es como sumar peras: 3 peras + 2 peras - 1 pera = 4 peras.'),
      (v_semana_id, 'Si la base de un rectángulo es x y la altura es 5, ¿cómo se expresa su área?', 'x × 5 = 5x', 'x + 5', '5/x', '5 - x', 'a', 3, 'Área = base × altura = x × 5 = 5x. El álgebra permite generalizar fórmulas: con esta expresión puedes calcular el área para cualquier valor de x sustituyéndolo.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, 'Resuelve el sistema: x + y = 10 y x - y = 2', 'x = 5, y = 5', 'x = 8, y = 2', 'x = 4, y = 6', 'x = 6, y = 4', 'd', 1, 'Sumando ambas ecuaciones: 2x = 12, entonces x = 6. Sustituyendo: 6 + y = 10, y = 4. Verificación: 6 - 4 = 2 ✓. Los sistemas se resuelven por suma, sustitución o gráfica.'),
      (v_semana_id, '¿Cuándo un sistema de ecuaciones tiene solución única?', 'Cuando las rectas que representan se cortan en un punto, es decir, no son paralelas ni coincidentes', 'Nunca', 'Solo si las ecuaciones son iguales', 'Siempre', 'a', 2, 'Geométricamente, dos ecuaciones lineales son rectas. Solución única = se cortan en un punto. Sin solución = paralelas (no se cortan). Infinitas soluciones = coinciden (misma recta).'),
      (v_semana_id, 'Un padre y su hijo tienen juntos 60 años. El padre tiene el triple que el hijo. ¿Cuántos años tiene cada uno?', 'Padre 30, hijo 30', 'Padre 40, hijo 20', 'Padre 45, hijo 15', 'Padre 50, hijo 10', 'c', 3, 'Sea x la edad del hijo y 3x la del padre. Sistema: x + 3x = 60, entonces 4x = 60, x = 15. Padre = 45, hijo = 15. Los problemas de palabras se traducen a sistemas y se resuelven algebraicamente.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es una función lineal?', 'Una función con cuadrado', 'Una función de la forma y = mx + b cuya gráfica es una línea recta', 'Una función circular', 'Una función que cambia mucho', 'b', 1, 'Las funciones lineales tienen la forma y = mx + b, donde m es la pendiente (inclinación) y b la ordenada al origen (donde corta el eje y). Su gráfica es siempre una línea recta.'),
      (v_semana_id, 'En la función y = 2x + 3, ¿cuál es la pendiente?', '5', '2/3', '2', '3', 'c', 2, 'En y = mx + b, m es la pendiente. Aquí m = 2. La pendiente indica cuánto sube y por cada unidad que aumenta x. Pendiente positiva = recta creciente; negativa = decreciente.'),
      (v_semana_id, 'Si el costo de producir n camisetas es C = 15n + 200, ¿cuál es el costo de producir 10?', '$200', '$300', '$350', '$1500', 'c', 3, 'Sustituye n = 10: C = 15(10) + 200 = 150 + 200 = 350. Aquí 15 es el costo por unidad y 200 es el costo fijo (alquiler, equipo). Las funciones modelan situaciones reales.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se identifica una función cuadrática?', 'Es siempre una recta', 'No tiene exponentes', 'Solo es lineal', 'Tiene la forma y = ax² + bx + c con a ≠ 0', 'd', 1, 'Las funciones cuadráticas tienen la variable elevada al cuadrado. Su gráfica es una parábola. Si a > 0 abre hacia arriba, si a < 0 abre hacia abajo. Modelan trayectorias parabólicas (proyectiles, áreas).'),
      (v_semana_id, 'Si f(x) = x² - 4, ¿cuál es f(3)?', '1', '5', '9', '-1', 'b', 2, 'Sustituye x = 3: f(3) = 3² - 4 = 9 - 4 = 5. Evaluar funciones es reemplazar la variable por el valor dado y simplificar siguiendo orden de operaciones.'),
      (v_semana_id, '¿Por qué las funciones cuadráticas son útiles en la vida real?', 'Solo en matemáticas teóricas', 'Modelan trayectorias de proyectiles, áreas máximas, ganancias óptimas, formas parabólicas (antenas, faros) y muchos fenómenos físicos', 'No tienen aplicación', 'Solo en arquitectura', 'b', 3, 'Las parábolas aparecen en física (caída libre), economía (curvas de costo/ingreso), tecnología (antenas parabólicas focalizan señales), arquitectura. Calcular máximos y mínimos resuelve problemas de optimización.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la fórmula para calcular el área de un círculo?', 'πd', '4πr²', '2πr', 'πr²', 'd', 1, 'Área del círculo = π × radio² = πr². Donde π ≈ 3.14159. La fórmula 2πr es para el perímetro (circunferencia). Conocer la diferencia es clave para no confundirlas.'),
      (v_semana_id, '¿Qué teorema relaciona los lados de un triángulo rectángulo?', 'Teorema de Euclides', 'Teorema fundamental', 'Teorema de Tales', 'Teorema de Pitágoras: a² + b² = c²', 'd', 2, 'Pitágoras: en triángulo rectángulo, el cuadrado de la hipotenusa (lado más largo, opuesto al ángulo recto) es igual a la suma de los cuadrados de los catetos. Útil para calcular distancias.'),
      (v_semana_id, 'Si los catetos de un triángulo rectángulo miden 3 y 4 cm, ¿cuánto mide la hipotenusa?', '5 cm', '12 cm', '25 cm', '7 cm', 'a', 3, 'Aplicando Pitágoras: c² = 3² + 4² = 9 + 16 = 25, entonces c = √25 = 5 cm. Este triángulo (3-4-5) es el ejemplo clásico de triángulo rectángulo con lados enteros.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es el volumen de un cubo de 4 cm de lado?', '12 cm³', '16 cm³', '64 cm³', '48 cm³', 'c', 1, 'Volumen del cubo = lado³ = 4³ = 64 cm³. El volumen mide espacio tridimensional, por eso se eleva al cubo y las unidades son cúbicas.'),
      (v_semana_id, '¿Cómo se calcula el volumen de un cilindro?', 'V = 2πr', 'V = π × radio² × altura', 'V = base × altura', 'V = lado³', 'b', 2, 'Volumen del cilindro = área de la base (círculo) × altura = πr²h. Es como apilar muchos círculos uno sobre otro. Es importante distinguir radio (r) y diámetro (d = 2r).'),
      (v_semana_id, '¿Por qué los cálculos de volumen son útiles en la vida real?', 'Solo en matemáticas teóricas', 'Únicamente en química', 'No tienen aplicación', 'Permiten calcular capacidad de tanques, llenado de albercas, dosis de medicamentos en líquidos, materiales para construcción, empaque de productos', 'd', 3, 'El volumen aparece en: agua que cabe en un tinaco, concreto para una losa, capacidad de un envase, porciones culinarias. Saber calcularlo permite optimizar recursos y planear con precisión.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tipo de gráfica es mejor para mostrar la evolución de un dato a lo largo del tiempo?', 'Gráfica de barras', 'Gráfica circular (pastel)', 'Gráfica de líneas', 'Histograma', 'c', 1, 'Las gráficas de líneas muestran tendencias y cambios continuos en el tiempo (temperatura por mes, precios por año). Las de barras comparan categorías; las circulares muestran proporciones del total.'),
      (v_semana_id, '¿Cómo se interpreta una gráfica de pastel?', 'Solo muestra crecimiento', 'No es útil', 'Cada parte vale lo mismo siempre', 'Cada sector representa una proporción del total: el círculo completo es el 100%', 'd', 2, 'En una gráfica de pastel, los sectores representan proporciones de un todo. Por ejemplo, si dice "ventas: producto A 50%, B 30%, C 20%", suman 100%. Útiles para mostrar composición.'),
      (v_semana_id, 'Si una encuesta dice que 40% de jóvenes prefiere música pop, ¿cuántos de 200 entrevistados eligieron pop?', '60 personas', '80 personas', '120 personas', '40 personas', 'b', 3, '40% de 200 = 0.40 × 200 = 80 personas. Los porcentajes en encuestas se aplican multiplicando: %/100 × total. Saber interpretarlos permite leer críticamente noticias y estudios.');
  END IF;
END $$;

-- ----------- Matemáticas II (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas II'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas II" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se conectan álgebra, geometría y estadística?', 'El álgebra da herramientas para expresar relaciones; la geometría aplica esas relaciones al espacio; la estadística analiza datos numéricos. Juntas resuelven problemas complejos del mundo real', 'Solo se usan por separado', 'No se relacionan', 'Son temas separados', 'a', 1, 'Las ramas matemáticas se complementan: usar álgebra para calcular áreas (geometría), funciones para describir tendencias (estadística), proyectos como construir un puente requieren las tres.'),
      (v_semana_id, '¿Por qué es importante razonar matemáticamente más allá de memorizar fórmulas?', 'Porque comprender los conceptos permite aplicarlos a situaciones nuevas, mientras la memorización mecánica falla cuando cambia el problema', 'Solo importa memorizar', 'Las matemáticas son solo memorización', 'No tiene importancia', 'a', 2, 'Saber por qué funciona algo (no solo cómo aplicarlo) permite adaptar estrategias. Quien razona matemáticamente puede enfrentar problemas inéditos; quien solo memoriza se bloquea ante variaciones.'),
      (v_semana_id, '¿Qué hábitos te ayudarán a dominar matemáticas a futuro?', 'Solo estudiar antes de exámenes', 'Practicar regularmente, entender conceptos antes de aplicarlos, resolver problemas variados, no temer al error, buscar ayuda cuando algo no quede claro', 'Memorizar todo sin entender', 'Esperar inspiración', 'b', 3, 'Las matemáticas se dominan con práctica entendida y constante. Resolver muchos problemas, explicar tu razonamiento, aceptar errores como parte del aprendizaje y pedir ayuda son hábitos clave.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se resuelve una ecuación cuadrática general ax² + bx + c = 0?', 'No se puede resolver', 'Solo factorizando', 'Usando la fórmula general x = (-b ± √(b²-4ac)) / 2a, factorizando o completando cuadrado', 'Adivinando', 'c', 1, 'Para ecuaciones cuadráticas hay tres métodos principales: factorización (cuando es posible), completar el cuadrado y la fórmula general (siempre funciona). El discriminante (b²-4ac) indica si hay 0, 1 o 2 soluciones reales.'),
      (v_semana_id, 'En x² - 5x + 6 = 0, ¿cuáles son las raíces?', 'x = 2 y x = 3', 'x = -2 y x = -3', 'x = 5 y x = 1', 'x = 1 y x = 6', 'a', 2, 'Factorizando: (x-2)(x-3) = 0, entonces x = 2 o x = 3. Verificación: 2² - 5(2) + 6 = 4-10+6 = 0 ✓ y 3² - 5(3) + 6 = 9-15+6 = 0 ✓. Buscamos dos números que sumen 5 y multipliquen 6.'),
      (v_semana_id, '¿Qué expresa el discriminante b² - 4ac?', 'El número y tipo de soluciones reales: positivo = 2 soluciones, cero = 1 solución, negativo = sin soluciones reales', 'El vértice', 'La pendiente de la parábola', 'Un coeficiente innecesario', 'a', 3, 'El discriminante (Δ = b² - 4ac) anticipa la naturaleza de las raíces sin resolver. Δ > 0: dos raíces reales distintas. Δ = 0: una raíz doble. Δ < 0: dos raíces complejas (no reales).');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tipo de función es f(x) = 2^x?', 'Exponencial', 'Logarítmica', 'Lineal', 'Cuadrática', 'a', 1, 'Las funciones exponenciales tienen la variable en el exponente: f(x) = a^x. Su crecimiento es muy rápido (cada vez x aumenta 1, el valor se duplica si base = 2). Modelan crecimiento poblacional, interés compuesto.'),
      (v_semana_id, '¿Cuál es el dominio de la función f(x) = √x?', 'Solo cero', 'Todos los números reales', 'Solo números negativos', 'Números reales mayores o iguales a cero (x ≥ 0)', 'd', 2, 'No se puede calcular raíz cuadrada de números negativos (en reales). Por eso el dominio de f(x) = √x es x ≥ 0. El dominio es el conjunto de valores válidos de x.'),
      (v_semana_id, '¿Cómo se ve la gráfica de la función f(x) = 1/x?', 'Un círculo', 'Una hipérbola con dos ramas que se aproximan a los ejes pero nunca los tocan', 'Una recta', 'Una parábola', 'b', 3, 'f(x) = 1/x es una función racional. Su gráfica es una hipérbola en cuadrantes I y III. Tiene asíntotas en x=0 (vertical) e y=0 (horizontal): se acerca infinitamente sin tocarlas.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué relación expresa el seno (sen) en un triángulo rectángulo?', 'Cateto opuesto / cateto adyacente', 'Hipotenusa / cateto', 'Cateto adyacente / hipotenusa', 'Cateto opuesto / hipotenusa', 'd', 1, 'sen(θ) = cateto opuesto / hipotenusa. Las razones trigonométricas se memorizan con SOH-CAH-TOA: Sen=Opuesto/Hipotenusa, Cos=Adyacente/Hipotenusa, Tan=Opuesto/Adyacente.'),
      (v_semana_id, '¿Cuánto vale el cos(60°)?', '0', '1/2', '√3/2', '1', 'b', 2, 'Los valores notables: cos(0°)=1, cos(30°)=√3/2, cos(45°)=√2/2, cos(60°)=1/2, cos(90°)=0. Memorizar estos valores facilita resolver problemas trigonométricos.'),
      (v_semana_id, 'Si una rampa forma un ángulo de 30° con el suelo y mide 10 m de largo, ¿qué altura alcanza?', '15 m', '5 m (porque sen(30°) = 1/2, entonces altura = 10 × 0.5 = 5 m)', '10 m', '8.66 m', 'b', 3, 'La rampa es la hipotenusa, la altura es el cateto opuesto al ángulo. sen(30°) = altura / 10. altura = 10 × sen(30°) = 10 × 0.5 = 5 m. La trigonometría resuelve problemas reales.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se calcula la distancia entre dos puntos (x₁,y₁) y (x₂,y₂)?', 'd = y₂ - y₁', 'd = √((x₂-x₁)² + (y₂-y₁)²)', 'd = x₁ + x₂', 'd = x₂ - x₁', 'b', 1, 'La fórmula de distancia entre dos puntos viene del teorema de Pitágoras aplicado a coordenadas. Geométricamente, calcula la longitud de la hipotenusa de un triángulo rectángulo formado por los puntos.'),
      (v_semana_id, '¿Cuál es la pendiente de la recta que pasa por (1,2) y (4,8)?', 'm = 6', 'm = 1', 'm = 2', 'm = 3', 'c', 2, 'Pendiente m = (y₂-y₁)/(x₂-x₁) = (8-2)/(4-1) = 6/3 = 2. La pendiente indica la inclinación de la recta: cuánto sube y por cada unidad que aumenta x.'),
      (v_semana_id, '¿Cuál es la ecuación de la recta que pasa por (0,3) y tiene pendiente 2?', 'y = 2x - 3', 'y = 3x + 2', 'y = 2x + 3', 'y = x + 5', 'c', 3, 'Forma punto-pendiente: y - y₁ = m(x - x₁). Aquí: y - 3 = 2(x - 0), entonces y = 2x + 3. Como pasa por (0,3), b = 3 (intersección con eje y).');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cuál es la probabilidad de obtener dos caras consecutivas al lanzar una moneda dos veces?', '1/4', '1/3', '2/3', '1/2', 'a', 1, 'P(cara) = 1/2 cada lanzamiento. Como son eventos independientes: P(2 caras) = 1/2 × 1/2 = 1/4. Para eventos independientes: P(A y B) = P(A) × P(B).'),
      (v_semana_id, '¿Qué son eventos independientes?', 'Eventos complementarios', 'Eventos que siempre ocurren juntos', 'Eventos imposibles', 'Eventos donde el resultado de uno no afecta al otro (ej: tirar dos dados separados)', 'd', 2, 'En eventos independientes, la probabilidad de uno no cambia por el resultado del otro. Lanzar moneda dos veces son independientes. Sacar canicas sin reemplazo NO son independientes.'),
      (v_semana_id, 'Si la probabilidad de lluvia es 30%, ¿cuál es la de NO lluvia?', '50%', '70%', '100%', '30%', 'b', 3, 'Eventos complementarios: P(A) + P(no A) = 1. Si P(lluvia) = 0.30, P(no lluvia) = 1 - 0.30 = 0.70 = 70%. Los complementos siempre suman 100%.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué tipo de sucesión es 2, 4, 6, 8, 10...?', 'Cuadrática', 'Geométrica', 'Aritmética con diferencia común 2', 'Aleatoria', 'c', 1, 'Sucesión aritmética: cada término se obtiene sumando una constante (diferencia común). Aquí d = 2. Fórmula del n-ésimo término: aₙ = a₁ + (n-1)d.'),
      (v_semana_id, '¿Cuál es el siguiente término en la sucesión 3, 6, 12, 24...?', '48', '30', '50', '36', 'a', 2, 'Sucesión geométrica: cada término se multiplica por una razón. Aquí r = 2 (cada término se duplica). 24 × 2 = 48. Fórmula: aₙ = a₁ × r^(n-1).'),
      (v_semana_id, '¿Para qué sirven las sucesiones en la vida real?', 'Modelan crecimiento poblacional, interés compuesto, depreciación de activos, decaimiento radiactivo, secuencias en informática y muchos fenómenos', 'No tienen aplicación', 'Solo para hacer ejercicios', 'Solo en matemáticas', 'a', 3, 'Las sucesiones aparecen en finanzas (interés compuesto), biología (poblaciones), tecnología (algoritmos), física (decaimiento). Comprender patrones permite predecir y optimizar comportamientos.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué expresa la noción de límite?', 'Una imposibilidad matemática', 'El valor exacto de una función', 'A qué valor se acerca una función cuando la variable se aproxima a un punto específico', 'Solo el máximo', 'c', 1, 'El límite es la base del cálculo: describe el comportamiento de funciones cerca de puntos. Por ejemplo, el límite de 1/x cuando x → 0 no existe (tiende a infinito), pero el de x² cuando x → 2 es 4.'),
      (v_semana_id, '¿Qué representa la derivada de una función en un punto?', 'El valor máximo', 'La distancia recorrida', 'El área bajo la curva', 'La pendiente de la recta tangente a la curva en ese punto, o la tasa de cambio instantánea', 'd', 2, 'La derivada mide qué tan rápido cambia una función. Geométricamente, es la pendiente de la tangente. Físicamente, si la función describe posición, la derivada es velocidad.'),
      (v_semana_id, '¿Para qué sirve el cálculo en la ciencia y tecnología?', 'Solo en universidades', 'No tiene aplicación', 'Solo en matemáticas puras', 'Es esencial para física (movimiento), ingeniería (optimización), economía (costos marginales), biología (crecimiento), tecnología (algoritmos) y prácticamente todas las ciencias modernas', 'd', 3, 'El cálculo (derivadas e integrales) es la herramienta matemática más poderosa para describir cambio y acumulación. Sin él no existirían las telecomunicaciones, la medicina moderna ni la exploración espacial.');
  END IF;
END $$;

-- ----------- Matemáticas III (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Matemáticas III'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Matemáticas III" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo se conectan los temas de matemáticas a lo largo de la secundaria?', 'Son independientes', 'Cada tema construye sobre los anteriores: aritmética → álgebra → ecuaciones → funciones → geometría analítica → cálculo. La progresión te prepara para razonamiento abstracto avanzado', 'Solo se repiten', 'Son temas separados', 'b', 1, 'Las matemáticas son acumulativas: para entender cálculo necesitas funciones, para estas álgebra, para ello aritmética. Cada nivel agrega herramientas más poderosas para resolver problemas más complejos.'),
      (v_semana_id, '¿Qué habilidades desarrolla el estudio de matemáticas?', 'Nada útil', 'Solo cálculo mental', 'Pensamiento lógico, abstracción, resolución de problemas, atención al detalle, perseverancia, modelización de la realidad y comunicación precisa', 'Únicamente memorización', 'c', 2, 'Las matemáticas no solo enseñan números: desarrollan pensamiento lógico, capacidad de descomponer problemas, abstracción, persistencia ante dificultad. Estas habilidades son transferibles a todo ámbito profesional.'),
      (v_semana_id, '¿Cómo prepararte para matemáticas más avanzadas (preparatoria/universidad)?', 'Esperar el siguiente nivel', 'Olvidar todo lo anterior', 'Solo memorizar fórmulas', 'Dominar bases sólidas, practicar regularmente, entender conceptos profundamente (no solo aplicarlos), hacer ejercicios variados, no temer al error y consultar dudas oportunamente', 'd', 3, 'Para tener éxito en niveles superiores: solidifica bases (lo de antes nunca se "supera"), practica con problemas desafiantes, entiende el "por qué", busca diferentes formas de resolver. La consistencia derrota al talento puro.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 1 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 1
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 1;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué significa vivir en la era digital?', 'Una época caracterizada por la integración de tecnologías digitales en todos los aspectos de la vida: trabajo, educación, comunicación, entretenimiento, salud y comercio', 'Solo aplica a jóvenes', 'Tener muchos dispositivos solamente', 'Solo usar redes sociales', 'a', 1, 'La era digital trasciende dispositivos: cambia cómo aprendemos, trabajamos, nos relacionamos, accedemos a salud y servicios. Saberse mover en este entorno digital es alfabetización imprescindible.'),
      (v_semana_id, '¿Qué es la brecha digital?', 'La desigualdad en acceso, uso y aprovechamiento de tecnologías digitales entre personas, regiones o países', 'Un tipo de virus', 'La diferencia entre dispositivos', 'Una falla en internet', 'a', 2, 'La brecha digital tiene múltiples dimensiones: acceso (¿tienes internet?), uso (¿sabes usarlo?) y aprovechamiento (¿lo usas para mejorar tu vida?). Es factor clave de desigualdad social y educativa.'),
      (v_semana_id, '¿Cómo afecta la tecnología digital a las relaciones humanas?', 'Solo positivamente', 'Solo negativamente', 'No las afecta', 'De forma compleja: facilita comunicación a distancia y nuevas formas de conexión, pero puede generar superficialidad, dependencia, aislamiento físico y problemas de salud mental', 'd', 3, 'La tecnología es herramienta neutra; su impacto depende del uso. Permite mantener relaciones a distancia y conocer gente nueva, pero el uso excesivo puede afectar relaciones cercanas, sueño y autoestima.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 2 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 2
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 2;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es internet?', 'Un programa específico', 'Una red global de redes interconectadas que permite la comunicación y transferencia de información entre dispositivos en todo el mundo', 'Solo redes sociales', 'Una sola página web', 'b', 1, 'Internet es la "red de redes": infraestructura física y protocolos que conectan miles de millones de dispositivos. La World Wide Web (WWW) es solo uno de los servicios que funciona sobre internet, junto con email, FTP, etc.'),
      (v_semana_id, '¿Qué es un navegador web?', 'Un buscador como Google', 'Un programa (Chrome, Firefox, Safari, Edge) que permite acceder y visualizar páginas web', 'Una red social', 'Un antivirus', 'b', 2, 'Los navegadores son las "ventanas" al web. Interpretan código HTML/CSS/JavaScript de las páginas para mostrarlas. Diferentes navegadores ofrecen distintas funciones de privacidad, velocidad y compatibilidad.'),
      (v_semana_id, '¿Cómo evaluar si una página web es confiable?', 'Si la URL es corta', 'Verificando autoría, fecha, fuentes citadas, dominio (.gov, .edu suelen ser más confiables), ortografía, ausencia de excesiva publicidad y contraste con otras fuentes', 'Si tiene muchos colores', 'Si está en español', 'b', 3, 'No todas las webs son confiables. Indicadores: ¿quién la firma? ¿cuándo se publicó? ¿cita fuentes verificables? ¿es coherente con otras fuentes serias? La alfabetización informacional es clave hoy.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 3 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 3
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 3;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué son las redes sociales?', 'Solo aplicaciones de juegos', 'Plataformas digitales (Facebook, Instagram, TikTok, X) que permiten a los usuarios crear perfiles, publicar contenido e interactuar con otros', 'Antivirus modernos', 'Servicios de email', 'b', 1, 'Las redes sociales facilitan conexiones e intercambio de información a escala global. Cada plataforma tiene su lógica: Instagram visual, X (Twitter) para texto breve, TikTok para video corto, LinkedIn profesional.'),
      (v_semana_id, '¿Qué es la huella digital?', 'Algo temporal', 'Una herida física', 'Solo lo que publicas', 'El rastro de datos que dejas al usar internet: publicaciones, búsquedas, ubicaciones, compras, interacciones; gran parte permanece accesible incluso después de borrar', 'd', 2, 'Tu huella digital es todo lo que generas en línea, deliberada o automáticamente. Empresas y otros pueden acceder a estos datos; futuros empleadores y universidades pueden revisarlos. Cuídalos como cuidarías tu reputación física.'),
      (v_semana_id, '¿Cómo proteger tu privacidad en redes sociales?', 'No es posible protegerla', 'Borrar todo', 'No usarlas nunca', 'Configurar privacidad de cuentas, no compartir información sensible (dirección, ubicación en tiempo real), pensar antes de publicar, conocer las políticas, usar contraseñas fuertes y autenticación en dos pasos', 'd', 3, 'La privacidad en redes requiere prácticas activas: revisar configuración periódicamente, limitar audiencia de publicaciones, evitar geolocalización constante, no compartir credenciales y desconfiar de mensajes sospechosos.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 4 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 4
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 4;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es el phishing?', 'Un tipo de virus solamente', 'Un deporte acuático', 'Una técnica de engaño donde delincuentes envían mensajes falsos (correos, SMS) imitando empresas legítimas para robar contraseñas, datos bancarios o información personal', 'Un programa de computadora útil', 'c', 1, 'Phishing significa "pescar" credenciales. Los atacantes crean correos o webs que parecen del banco, redes sociales, etc. para que la víctima ingrese datos sensibles. Verificar URL, no hacer clic en enlaces sospechosos y desconfiar de urgencias falsas son defensas clave.'),
      (v_semana_id, '¿Qué es una contraseña segura?', 'Tu nombre y apellido', 'Tu fecha de nacimiento', '"123456" porque es fácil de recordar', 'Una contraseña con al menos 12 caracteres, combinando mayúsculas, minúsculas, números y símbolos, sin información personal evidente, única para cada cuenta', 'd', 2, 'Las contraseñas seguras combinan longitud y complejidad. Un gestor de contraseñas (LastPass, Bitwarden) ayuda a crear y almacenar contraseñas únicas para cada servicio sin tener que memorizarlas todas.'),
      (v_semana_id, '¿Qué hacer si crees que tu cuenta fue hackeada?', 'Esperar a ver qué pasa', 'Compartir más datos', 'Cambiar inmediatamente la contraseña, activar autenticación en dos pasos, revisar accesos recientes, notificar a contactos sobre posibles mensajes falsos enviados, reportar al servicio', 'Borrar todo y crear cuenta nueva', 'c', 3, 'Acción rápida limita daño. Cambiar credenciales, activar 2FA, revisar dispositivos conectados y avisar a contactos previene daños mayores. Servicios como Gmail tienen herramientas para auditar actividad.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 5 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 5
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 5;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la inteligencia artificial (IA)?', 'Un solo algoritmo', 'Solo robots humanoides', 'Sistemas que pueden realizar tareas que normalmente requieren inteligencia humana: reconocer voz, traducir, recomendar contenido, conducir vehículos, generar texto e imágenes', 'Un programa de TV', 'c', 1, 'La IA abarca múltiples tecnologías: aprendizaje automático, redes neuronales, procesamiento de lenguaje natural. Está integrada en buscadores, asistentes (Siri, Alexa), traductores, recomendaciones de Netflix, ChatGPT, etc.'),
      (v_semana_id, '¿Cómo afectará la IA al mundo laboral?', 'Solo eliminará empleos', 'Transformará el mercado laboral: automatizará tareas rutinarias, requerirá nuevas habilidades digitales, creará empleos nuevos en áreas tecnológicas, pero también desplazará algunos roles tradicionales', 'No tendrá impacto', 'Solo creará empleos', 'b', 2, 'La IA es disruptiva: reemplazará tareas repetitivas pero también creará nuevas funciones. La adaptabilidad, creatividad, pensamiento crítico y colaboración son habilidades que la IA difícilmente reemplaza. Educación continua será imprescindible.'),
      (v_semana_id, '¿Qué consideraciones éticas plantea la IA?', 'Solo importa la velocidad', 'Solo son cuestiones técnicas', 'Privacidad de datos, sesgos algorítmicos, decisiones automatizadas sin supervisión humana, uso militar, impacto laboral, generación de contenido falso (deepfakes) y desigualdad de acceso', 'No hay implicaciones éticas', 'c', 3, 'La IA plantea dilemas serios: ¿quién es responsable si un coche autónomo causa daño? ¿cómo evitar que algoritmos hereden sesgos racistas/sexistas? ¿cómo regular deepfakes? La sociedad necesita debatir y normar su desarrollo.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 6 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 6
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 6;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la computación en la nube (cloud computing)?', 'Computación en aviones', 'Provisión de servicios informáticos (almacenamiento, procesamiento, software) a través de internet, sin necesidad de tenerlos en tu dispositivo', 'Un nuevo tipo de virus', 'Solo afecta a empresas', 'b', 1, 'En la nube, los datos y aplicaciones residen en servidores remotos accesibles vía internet. Ejemplos: Google Drive, Dropbox, Netflix, Spotify, Office 365. Permite acceso desde cualquier dispositivo y escalabilidad.'),
      (v_semana_id, '¿Cuáles son ventajas de servicios en la nube?', 'Solo desventajas', 'Únicamente ahorro económico', 'Solo es para empresas grandes', 'Acceso desde cualquier dispositivo, ahorro de espacio local, copias de seguridad automáticas, colaboración en tiempo real, escalabilidad y reducción de costos en hardware', 'd', 2, 'La nube facilita trabajo remoto, colaboración (varios editando el mismo documento), acceso multidispositivo y elimina necesidad de mantener servidores propios. Servicios como Google Workspace son ejemplos cotidianos.'),
      (v_semana_id, '¿Qué precauciones debes tomar al usar servicios en la nube?', 'Verificar políticas de privacidad, usar contraseñas fuertes con 2FA, hacer copias propias de información crítica, conocer dónde se almacenan los datos físicamente y cifrar archivos sensibles antes de subirlos', 'No es necesario tomar precauciones', 'Confiar ciegamente en el proveedor', 'Subir todo sin filtro', 'a', 3, 'Confiar en la nube implica riesgos: brechas de seguridad, cambios en políticas, dependencia del proveedor. Buenas prácticas: backup local de cosas críticas, contraseñas fuertes, leer términos y entender qué hace el servicio con tus datos.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 7 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 7
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 7;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Qué es la creación de contenido digital?', 'Solo grabar videos', 'Únicamente diseñar logos', 'Solo escribir blogs', 'Producción de materiales (texto, imagen, video, audio, multimedia) destinados a difundirse digitalmente para informar, entretener, educar o persuadir', 'd', 1, 'La creación de contenido es habilidad clave del siglo XXI. Incluye blogs, podcasts, videos en YouTube/TikTok, infografías, presentaciones. Cada formato tiene su lenguaje propio y herramientas específicas.'),
      (v_semana_id, '¿Por qué es importante respetar derechos de autor al crear contenido?', 'Para proteger el trabajo de creadores, evitar consecuencias legales (multas, demandas), construir tu credibilidad como creador y promover una cultura de respeto al trabajo intelectual', 'Solo si te demandan', 'Únicamente para grandes empresas', 'No es importante', 'a', 2, 'Usar música, imágenes o textos sin permiso puede tener consecuencias legales. Existen recursos libres (Creative Commons, Pixabay, Pexels) y siempre hay que dar crédito. Respetar autoría es ética y construye tu reputación.'),
      (v_semana_id, '¿Qué habilidades son esenciales para crear contenido digital de calidad?', 'Combinación de creatividad, conocimiento técnico (edición), comprensión de la audiencia, habilidades comunicativas (claridad, narrativa), y ética (verificación, respeto, no plagio)', 'Únicamente equipos costosos', 'Solo conocimientos técnicos', 'Solo creatividad', 'a', 3, 'El contenido de calidad requiere mezcla de habilidades: idea original + ejecución técnica + entender qué quiere la audiencia + comunicar efectivamente + actuar éticamente. El equipo costoso ayuda pero no sustituye estos elementos.');
  END IF;
END $$;

-- ----------- Tecnología y Vida Digital (secundaria) - Semana 8 -----------
DO $$
DECLARE v_semana_id UUID;
BEGIN
  SELECT s.id INTO v_semana_id
  FROM public.semanas s
  JOIN public.meses_contenido mc ON mc.id = s.mes_id
  JOIN public.materias m ON m.id = mc.materia_id
  WHERE m.nombre = 'Tecnología y Vida Digital'
    AND m.nivel = 'secundaria'
    AND s.numero_semana = 8
  LIMIT 1;
  
  IF v_semana_id IS NULL THEN
    RAISE NOTICE 'Semana % de "Tecnología y Vida Digital" (secundaria) no encontrada, saltando', 8;
  ELSE
    DELETE FROM public.quiz_semana WHERE semana_id = v_semana_id;
    INSERT INTO public.quiz_semana (semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion) VALUES
      (v_semana_id, '¿Cómo prepararte para un mundo cada vez más digital?', 'Ignorar la tecnología', 'Solo aprender una herramienta', 'Desarrollar alfabetización digital integral: pensamiento crítico ante información, habilidades técnicas básicas, ciberseguridad, ética digital, creatividad y aprendizaje continuo', 'Esperar instrucciones', 'c', 1, 'La alfabetización digital es transversal: leer críticamente lo que circula online, manejar herramientas básicas, proteger tus datos, comportarte éticamente, crear contenido propio, y mantenerse actualizado ya que la tecnología cambia rápido.'),
      (v_semana_id, '¿Qué responsabilidad tienen los usuarios en la construcción de un internet positivo?', 'Únicamente las empresas tecnológicas', 'Ninguna, solo los gobiernos', 'Compartir información veraz, respetar a otros, denunciar abusos, no propagar discursos de odio, cuidar privacidad propia y ajena, consumir contenido de calidad y producir aportes constructivos', 'Solo ignorar lo malo', 'c', 2, 'Internet refleja a quienes lo usan. Cada acción individual (compartir o no una noticia, denunciar acoso, ser respetuoso) contribuye a moldear el ecosistema digital. Una ciudadanía digital activa es esencial.'),
      (v_semana_id, '¿Cómo balancear el uso de tecnología y bienestar personal?', 'Establecer límites de tiempo (especialmente en pantallas y redes), priorizar interacciones presenciales, ejercicio, sueño, ser consciente del impacto emocional del contenido y desconectarse periódicamente', 'Eliminar toda tecnología', 'Usar todo el tiempo posible', 'No es posible balancearlos', 'a', 3, 'El uso saludable de tecnología requiere autorregulación: dormir sin pantalla cerca, evitar comparaciones tóxicas en redes, mantener actividad física, cultivar relaciones cara a cara, leer libros, salir a la naturaleza. La tecnología es herramienta, no dueña de tu vida.');
  END IF;
END $$;

COMMIT;

-- =============================================================
-- VERIFICACIÓN POST-EJECUCIÓN (opcional)
-- =============================================================
-- SELECT m.nivel, COUNT(DISTINCT m.id) AS materias,
--        COUNT(DISTINCT s.id) AS semanas,
--        COUNT(qs.id) AS preguntas
-- FROM public.materias m
-- JOIN public.meses_contenido mc ON mc.materia_id = m.id
-- JOIN public.semanas s ON s.mes_id = mc.id
-- LEFT JOIN public.quiz_semana qs ON qs.semana_id = s.id
-- WHERE m.nivel IN ('secundaria', 'preparatoria')
-- GROUP BY m.nivel;
--
-- Resultado esperado:
--   preparatoria | 12 | 96 | 288
--   secundaria   | 12 | 96 | 288
