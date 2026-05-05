-- ============================================================
-- seed-preguntas-evaluaciones-universal.sql
-- ============================================================
-- Versión: 1.0
-- Fecha: 2026-05-04
-- Total preguntas: 265 (25 materias × ~10-25 preguntas)
-- Origen: dump EDUXA (cliente #12, contenido validado en producción)
-- ============================================================
-- IDEMPOTENTE: solo elimina preguntas con patrón Bug C detectado
-- (opcion_a idéntica en todas las preguntas de la misma evaluación,
-- COUNT(DISTINCT opcion_a) < 3). Preserva preguntas customizadas.
-- Seguro re-ejecutar en cualquier cliente nuevo.
-- ============================================================

BEGIN;

-- 1. Eliminar preguntas placeholder con patrón Bug C
--    (opcion_a idéntica en ≥3 preguntas de la misma evaluación)
DELETE FROM preguntas
WHERE evaluacion_id IN (
  SELECT evaluacion_id FROM preguntas
  GROUP BY evaluacion_id
  HAVING COUNT(DISTINCT opcion_a) < 3
    AND COUNT(*) >= 3
);

-- 2. Insertar preguntas reales matcheando por título evaluación + nombre materia
--    Total: 265 preguntas en 25 evaluaciones

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la unidad estructural y funcional de todos los seres vivos?', 'El órgano', 'El tejido', 'El sistema', 'La célula', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué proceso realizan las plantas para producir su propio alimento?', 'Fermentación', 'Digestión', 'Respiración', 'Fotosíntesis', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál de los siguientes NO es un macronutriente indispensable para el organismo?', 'Carbohidratos', 'Lípidos', 'Vitamina C', 'Proteínas', 'c', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué órgano del cuerpo humano bombea la sangre hacia todo el organismo?', 'El hígado', 'El riñón', 'El pulmón', 'El corazón', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo se llama el proceso por el cual los organismos obtienen energía de los alimentos?', 'Respiración celular', 'Osmosis', 'Transpiración', 'Fotosíntesis', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función principal del sistema esquelético?', 'Transportar oxígeno', 'Producir hormonas', 'Sostener y proteger el cuerpo', 'Regular la temperatura', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué molécula transporta el oxígeno en la sangre?', 'Insulina', 'Hemoglobina', 'Glucosa', 'Adrenalina', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué tipo de reproducción produce organismos genéticamente idénticos al progenitor?', 'Asexual', 'Alternada', 'Sexual', 'Mixta', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la relación entre productores, consumidores y descomponedores en un ecosistema?', 'Forman una cadena alimentaria', 'Son organismos independientes', 'Compiten por el mismo nicho', 'Se reproducen conjuntamente', 'a', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Una planta colocada en la oscuridad pierde su color verde. ¿Qué proceso se ve afectado?', 'La reproducción', 'La absorción de agua', 'La respiración celular', 'La fotosíntesis', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales I' AND e.titulo = 'Examen Final — Ciencias Naturales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué explica la selección natural según Darwin?', 'La extinción planeada de especies débiles', 'El proceso por el que organismos con características ventajosas sobreviven y se reproducen más', 'La mutación aleatoria de genes', 'La reproducción artificial de organismos', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del ADN en los seres vivos?', 'Producir energía directamente', 'Regular la temperatura corporal', 'Almacenar y transmitir información genética', 'Transportar oxígeno', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué tipo de energía aprovechan los paneles solares para generar electricidad?', 'Energía nuclear', 'Energía cinética', 'Energía química', 'Energía luminosa', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo afecta el efecto invernadero al clima terrestre?', 'Reduce la humedad ambiental', 'No tiene efecto medible', 'Eleva la temperatura global', 'Enfría la atmósfera', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué partículas subatómicas forman el núcleo de un átomo?', 'Electrones y protones', 'Protones y neutrones', 'Solo protones', 'Neutrones y electrones', 'b', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre una mezcla homogénea y una heterogénea?', 'En la heterogénea siempre hay agua', 'En la homogénea los componentes son del mismo color', 'En la heterogénea los componentes no se pueden separar', 'En la homogénea los componentes no se distinguen a simple vista', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué ocurre durante una reacción química exotérmica?', 'Se libera energía hacia el entorno', 'Se consume siempre oxígeno', 'No hay cambio de energía', 'Se absorbe energía del entorno', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la biodiversidad y por qué es importante?', 'La variedad de especies, genes y ecosistemas que sostienen los equilibrios naturales', 'El número de animales en extinción', 'La cantidad total de plantas en un ecosistema', 'La velocidad de reproducción de los seres vivos', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un alumno añade vinagre a bicarbonato de sodio y observa burbujas. ¿Qué tipo de cambio ocurre?', 'Nuclear, porque hay liberación de partículas', 'Biológico, porque intervienen seres vivos', 'Químico, porque se forman nuevas sustancias', 'Físico, porque cambia la forma', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo contribuye la biotecnología al campo de la medicina?', 'Fabricando robots quirúrgicos únicamente', 'Desarrollando vacunas, antibióticos y terapias génicas', 'Reemplazando a los médicos completamente', 'Eliminando enfermedades solo mediante cirugía', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Naturales II' AND e.titulo = 'Examen Final — Ciencias Naturales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué estudia la geografía humana?', 'Las características físicas del relieve', 'Los fenómenos meteorológicos', 'La formación de los océanos', 'La distribución de las poblaciones y sus actividades en el espacio', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál fue el principal motor económico de las civilizaciones mesoamericanas?', 'La minería de oro', 'La crianza de ganado', 'El comercio marítimo', 'La agricultura, especialmente el maíz', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una democracia representativa?', 'Un sistema donde los ciudadanos eligen representantes para gobernar', 'Un régimen sin partidos políticos', 'Un gobierno dirigido por militares', 'Un sistema donde todos los ciudadanos votan cada decisión', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué se entiende por derechos humanos fundamentales?', 'Beneficios exclusivos para ciudadanos', 'Normativas internacionales opcionales', 'Privilegios otorgados por el gobierno', 'Derechos inherentes a toda persona por su condición humana', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué provocó principalmente el surgimiento del movimiento de Independencia de México?', 'Un desastre natural devastador', 'Una invasión extranjera planificada', 'El descontento de criollos y mestizos ante las injusticias del régimen colonial', 'La caída del precio del petróleo', 'c', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del Poder Legislativo en México?', 'Ejecutar las leyes', 'Dirigir las fuerzas armadas', 'Administrar la justicia', 'Crear y aprobar las leyes', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo influye la globalización en las culturas locales?', 'Aísla a las culturas del mundo', 'Solo produce beneficios económicos', 'Puede generar tanto enriquecimiento cultural como pérdida de identidad', 'Las culturas locales desaparecen automáticamente', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un mapa temático?', 'Un mapa que representa información específica como clima, población o recursos', 'Un mapa solo para uso militar', 'Un mapa que muestra únicamente fronteras políticas', 'Un mapa físico del relieve terrestre', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si la desigualdad económica aumenta en un país, ¿qué consecuencias sociales se pueden esperar?', 'Más participación ciudadana', 'Posible aumento de conflictos, migración y pobreza extrema', 'Mayor cohesión social', 'Reducción automática del crimen', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante preservar el patrimonio cultural de un pueblo?', 'Porque genera ingresos turísticos exclusivamente', 'Porque fortalece la identidad, la memoria histórica y la cohesión social', 'Porque lo exige la ley internacional', 'Porque impide el cambio social', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales I' AND e.titulo = 'Examen Final — Ciencias Sociales I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el PIB (Producto Interno Bruto)?', 'El presupuesto del gobierno federal', 'El número de empresas en un país', 'Los ingresos totales de las exportaciones', 'El valor total de bienes y servicios producidos en un país durante un año', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál fue la consecuencia más inmediata de la Revolución Industrial?', 'La reducción de la población urbana', 'La desaparición de la agricultura', 'La abolición del comercio internacional', 'El surgimiento de la clase obrera y la producción en serie', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la segregación racial?', 'La separación voluntaria de grupos culturales', 'La separación legal o social forzada de personas por su raza', 'Un fenómeno exclusivo del siglo XX', 'Una política de integración cultural', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son los Objetivos de Desarrollo Sostenible (ODS) de la ONU?', 'Metas globales para erradicar la pobreza, proteger el planeta y garantizar bienestar para 2030', 'Normas comerciales entre empresas', 'Metas económicas solo para países ricos', 'Acuerdos militares internacionales', 'a', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué papel juegan los medios de comunicación en una sociedad democrática?', 'Actuar como cuarto poder fiscalizando al gobierno e informando a la ciudadanía', 'Solo entretener a la población', 'Ninguno significativo', 'Reemplazar al sistema judicial', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué distingue a una economía de mercado de una economía planificada?', 'En la de mercado las decisiones las toman compradores y vendedores; en la planificada, el Estado', 'El nivel de pobreza', 'El tipo de gobierno que las rige', 'La moneda que utilizan', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el impacto de las migraciones en los países de destino?', 'Pueden aportar mano de obra, diversidad cultural e innovación, aunque también generan desafíos', 'Solo representan una carga económica', 'Siempre provocan conflictos graves', 'No tienen ningún impacto significativo', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué se considera que la Segunda Guerra Mundial transformó el orden mundial?', 'Porque solo afectó a Europa', 'Porque eliminó todos los imperios coloniales', 'Porque redefinió fronteras, dio origen a la ONU y estableció el orden bipolar de la Guerra Fría', 'Porque unificó Europa bajo un solo gobierno', 'c', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si un gobierno recorta servicios públicos con políticas de austeridad, ¿qué sectores se ven más afectados?', 'Los más vulnerables con menor acceso a recursos privados', 'Los más ricos', 'Los turistas extranjeros', 'Los empleados gubernamentales únicamente', 'a', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo se relacionan la educación y el desarrollo económico de un país?', 'La educación reduce el PIB a corto plazo', 'Una mayor educación tiende a aumentar la productividad, la innovación y la movilidad social', 'La educación solo beneficia a individuos, no a países', 'No tienen relación directa', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Ciencias Sociales II' AND e.titulo = 'Examen Final — Ciencias Sociales II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la idea principal de un texto?', 'El título del texto', 'El argumento central que el autor quiere comunicar', 'La primera oración de cada párrafo', 'Un detalle que apoya el tema', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre un texto informativo y uno argumentativo?', 'El informativo es siempre más largo', 'El informativo presenta datos objetivos; el argumentativo busca convencer al lector de una postura', 'El informativo usa ilustraciones y el argumentativo no', 'El argumentativo no tiene estructura definida', 'b', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la inferencia en la lectura?', 'Identificar el vocabulario desconocido', 'Deducir información que no está explícita en el texto a partir de lo leído', 'Resumir el texto con otras palabras', 'Copiar literalmente lo que dice el texto', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué estrategia permite identificar el significado de palabras desconocidas por el contexto?', 'Lectura en voz alta', 'Lectura veloz', 'Subrayado literal', 'Inferencia contextual', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función de los conectores discursivos como "sin embargo" o "por lo tanto"?', 'Indicar relaciones lógicas entre ideas como contraste o consecuencia', 'Decorar el texto', 'Señalar el final del texto', 'Introducir ejemplos únicamente', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué nivel de lectura implica evaluar críticamente la intención del autor?', 'Lectura crítica', 'Lectura literal', 'Lectura veloz', 'Lectura inferencial', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo se diferencia un resumen de una paráfrasis?', 'La paráfrasis solo aplica a textos poéticos', 'El resumen reduce el texto manteniendo las ideas principales; la paráfrasis lo reescribe sin necesariamente acortarlo', 'El resumen siempre usa las palabras del autor sin cambiarlas', 'No tienen diferencia', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el propósito comunicativo de un texto?', 'La intención del autor: informar, persuadir, entretener o instruir', 'El formato tipográfico utilizado', 'La extensión del documento', 'El número de párrafos', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Al leer un artículo de opinión sobre cambio climático, ¿qué implica una lectura crítica?', 'Ignorar las opiniones y quedarse con los datos', 'Creerlo todo porque está publicado', 'Identificar los argumentos, evidencias y posibles sesgos del autor', 'Solo buscar datos estadísticos', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante identificar el tipo de texto antes de leerlo?', 'Porque el tipo de texto determina la estructura, el lenguaje y la estrategia de lectura más adecuada', 'Solo para realizar tareas académicas', 'Para memorizar el vocabulario específico del área', 'Para decidir si vale la pena leerlo', 'a', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comprensión lectora I' AND e.titulo = 'Examen Final — Comprensión lectora I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la brecha digital?', 'Un protocolo de comunicación obsoleto', 'La desigualdad en el acceso y uso de las tecnologías de información entre personas o regiones', 'Un tipo de virus informático', 'La diferencia de velocidad entre internet y redes móviles', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la principal característica de la comunicación asincrónica?', 'Los mensajes no requieren que el receptor esté disponible en el mismo momento', 'Requiere conexión permanente a internet', 'Solo funciona con video', 'Los participantes se comunican en tiempo real', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el "phishing"?', 'Una técnica de programación avanzada', 'Un protocolo de seguridad web', 'Un tipo de antivirus', 'Una estafa digital que busca obtener información personal mediante engaños', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la importancia de la netiqueta en entornos digitales?', 'Limitar el tiempo de uso de internet', 'Filtrar contenido inapropiado automáticamente', 'Regular el acceso a redes sociales', 'Establecer normas de comportamiento respetuoso y apropiado en espacios virtuales', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué son las fake news y cómo pueden identificarse?', 'Artículos de opinión publicados en redes', 'Noticias antiguas que se republican', 'Noticias extranjeras mal traducidas', 'Información falsa o engañosa difundida como si fuera real; se identifican verificando fuentes', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué implica la huella digital de una persona?', 'El registro físico de sus movimientos', 'Un documento de identidad electrónico', 'El rastro de datos que deja al navegar por internet y usar aplicaciones digitales', 'Una contraseña cifrada para proteger su identidad', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre derecho de autor y dominio público?', 'No hay diferencia legal entre ambos', 'El derecho de autor protege la obra; el dominio público permite usar libremente obras cuya protección expiró', 'El dominio público solo aplica a música', 'El derecho de autor es nacional y el dominio público es internacional', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la identidad digital y por qué gestionarla es importante?', 'La representación de una persona en el entorno digital, que afecta su reputación y privacidad', 'Un certificado de seguridad informática', 'Un tipo de contraseña cifrada', 'El nombre de usuario en redes sociales', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Recibes un correo de tu banco pidiéndote ingresar tu contraseña en un enlace. ¿Cuál es la acción correcta?', 'Responder el correo con tus datos', 'Ignorarlo completamente sin reportarlo', 'No hacer clic, contactar directamente al banco y reportar el intento de phishing', 'Ingresar inmediatamente para proteger tu cuenta', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es relevante el pensamiento crítico al consumir información en redes sociales?', 'Porque los medios tradicionales siempre son más confiables', 'Porque las redes sociales siempre publican información falsa', 'Porque está prohibido compartir noticias sin verificar', 'Porque los algoritmos priorizan contenido viral sobre veraz, y sin criterio se difunde desinformación', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Comunicación digital' AND e.titulo = 'Examen Final — Comunicación digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el resultado de resolver la ecuación 3x - 7 = 11?', 'x = 6', 'x = 2', 'x = 8', 'x = 4', 'a', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un número primo?', 'Un número siempre positivo mayor que 10', 'Un número que termina en 0', 'Un número divisible por 2', 'Un número divisible solo por 1 y por sí mismo', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el área de un triángulo con base 8 cm y altura 5 cm?', '20 cm²', '80 cm²', '40 cm²', '13 cm²', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué propiedad matemática expresa a(b + c) = ab + ac?', 'Conmutativa', 'Asociativa', 'Transitiva', 'Distributiva', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo se expresa 0.75 como fracción en su mínima expresión?', '15/20', '75/100', '7/10', '3/4', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el Mínimo Común Múltiplo (MCM) de 4 y 6?', '6', '12', '24', '8', 'b', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un rectángulo tiene perímetro de 30 cm y su largo es 10 cm. ¿Cuál es su ancho?', '5 cm', '10 cm', '20 cm', '15 cm', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es 2³ + √25?', '15', '8', '10', '13', 'd', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es el 15% de 200?', '15', '300', '30', '3', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'En una encuesta, 45 de 150 estudiantes prefieren matemáticas. ¿Qué porcentaje representa?', '45%', '30%', '25%', '33%', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático I' AND e.titulo = 'Examen Final — Conocimiento matemático I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la pendiente de la recta que pasa por los puntos (1,3) y (3,7)?', '4', '2', '3', '1', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué indica el discriminante b² - 4ac en la fórmula cuadrática?', 'La naturaleza de las raíces de la ecuación cuadrática', 'El coeficiente principal', 'El vértice de la parábola', 'El eje de simetría', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es log₁₀(1000)?', '10', '100', '2', '3', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la suma de los ángulos internos de un pentágono?', '720°', '360°', '180°', '540°', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una función lineal?', 'Una función con raíz cuadrada', 'Una función con exponente cuadrático', 'Una función cuya gráfica es una línea recta con la forma f(x)=mx+b', 'Una función periódica', 'c', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si f(x) = 2x² - 3x + 1, ¿cuánto es f(2)?', '3.5', '5', '4', '3', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el volumen de un cilindro con radio 3 cm y altura 7 cm?', '63π cm³', '42π cm³', '21π cm³', '66π cm³', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una progresión aritmética?', 'Una secuencia donde la diferencia entre términos consecutivos es constante', 'Una serie de números primos', 'Una secuencia de términos negativos', 'Una secuencia donde cada término se multiplica por una constante', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'En un triángulo rectángulo con catetos de 6 y 8 cm, ¿cuánto mide la hipotenusa?', '12 cm', '14 cm', '10 cm', '8 cm', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Para qué sirve la estadística descriptiva?', 'Para calcular probabilidades exactas', 'Para predecir eventos futuros', 'Para demostrar teoremas matemáticos', 'Para organizar, resumir y describir conjuntos de datos', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Conocimiento matemático II' AND e.titulo = 'Examen Final — Conocimiento matemático II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son los elementos básicos del proceso de comunicación?', 'Idioma, código y contexto', 'Texto, título y autor', 'Habla, escritura y señas', 'Emisor, mensaje y receptor', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el sustantivo en gramática?', 'Una palabra que describe acciones', 'Una palabra que conecta oraciones', 'Una palabra que nombra personas, animales, lugares o cosas', 'Una palabra que modifica al verbo', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del adjetivo en una oración?', 'Reemplazar al sustantivo', 'Conectar dos frases distintas', 'Modificar o describir al sustantivo', 'Indicar la acción principal', 'c', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la sinonimia?', 'El estudio del origen de las palabras', 'La repetición de sonidos en un texto', 'La relación entre palabras de significado opuesto', 'La relación entre palabras de igual o similar significado', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre la comunicación oral y la escrita?', 'La oral es más precisa que la escrita', 'Solo la escrita tiene gramática', 'La oral usa palabras y la escrita no', 'La oral es efímera y contextual; la escrita es permanente y más formal', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un párrafo de introducción?', 'El párrafo que presenta el tema y orienta al lector sobre el contenido', 'El párrafo más largo del texto', 'El último párrafo del texto', 'Un párrafo con solo ejemplos', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la coherencia textual?', 'La propiedad que hace que las ideas de un texto estén lógicamente relacionadas', 'Usar muchas palabras distintas', 'Tener buena ortografía únicamente', 'Usar párrafos cortos siempre', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué tipo de texto es una receta de cocina?', 'Instructivo', 'Descriptivo', 'Argumentativo', 'Narrativo', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el orden correcto para redactar un texto expositivo?', 'Introducción, conclusión, desarrollo', 'Desarrollo, conclusión, introducción', 'Conclusión, desarrollo, introducción', 'Introducción, desarrollo y conclusión', 'd', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante revisar la ortografía al escribir un texto?', 'Porque la gramática es más importante que el contenido', 'Solo para obtener buena calificación', 'Solo para textos de carácter formal', 'Los errores ortográficos dificultan la comprensión y afectan la credibilidad del texto', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español I' AND e.titulo = 'Examen Final — Español I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son las principales características del texto narrativo?', 'Una estructura sin introducción ni conclusión', 'Uso de tecnicismos y datos', 'Solo el uso de diálogos entre personajes', 'La presencia de personajes, narrador, tiempo, espacio y una secuencia de hechos', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el narrador omnisciente?', 'El lector del texto que interpreta la historia', 'El narrador que solo cuenta lo que observa directamente', 'El narrador que conoce los pensamientos y acciones de todos los personajes', 'El personaje principal de la historia', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la metáfora como figura retórica?', 'La personificación de objetos inanimados', 'La comparación directa entre dos elementos sin usar "como"', 'La repetición de palabras o frases', 'El uso exagerado de adjetivos', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la estructura de un ensayo académico?', 'Solo introducción y conclusión', 'Narración, clímax y desenlace', 'Pregunta, hipótesis y experimento', 'Planteamiento del tema, desarrollo argumentado y conclusión', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la ironía como recurso literario?', 'Describir algo con muchos detalles', 'Imitar el lenguaje de otra persona o estilo', 'Exagerar una característica para causar efecto', 'Decir lo contrario de lo que se piensa con intención crítica o humorística', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué distingue a la crónica periodística de la noticia?', 'Solo el formato visual que usan', 'Solo la extensión del texto', 'La crónica narra los hechos con subjetividad del autor; la noticia busca ser objetiva', 'El tema específico que cada una trata', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del diálogo en un texto narrativo?', 'Introducir datos estadísticos', 'Resumir el argumento de la obra', 'Revelar la personalidad de los personajes y hacer avanzar la trama', 'Alargar innecesariamente la historia', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la cohesión textual y cómo se logra?', 'La unión fluida de las ideas mediante pronombres, sinónimos y conectores', 'Usar siempre el mismo tiempo verbal', 'Tener solo oraciones cortas y simples', 'La belleza literaria del texto', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Al analizar un poema, ¿qué es la rima consonante?', 'El ritmo regular de los versos sin rima', 'La coincidencia de vocales y consonantes desde la última vocal acentuada en dos o más versos', 'La repetición de palabras completas en distintos versos', 'La repetición solo de vocales al final del verso', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si debes argumentar por escrito tu postura sobre el uso de teléfonos en el aula, ¿qué elementos son esenciales?', 'Solo datos estadísticos del tema', 'Tesis, argumentos con evidencias y conclusión bien estructurada', 'Narración de una experiencia personal únicamente', 'Solo tu opinión personal sin más', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español II' AND e.titulo = 'Examen Final — Español II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la intertextualidad en la literatura?', 'Cambiar el final de una obra clásica', 'La referencia explícita o implícita de un texto a otra obra o texto', 'Usar palabras de otros idiomas', 'Copiar párrafos de otros autores', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del narrador en primera persona?', 'El narrador es un personaje dentro de la historia que cuenta su propia experiencia', 'Contar la historia desde afuera con omnisciencia', 'Anticipar el desenlace al lector', 'Describir el entorno sin participar en los hechos', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué caracteriza al teatro como género literario?', 'Está diseñado para ser representado en escena mediante diálogos y acotaciones', 'Su estructura siempre es en verso', 'Solo trata temas históricos o mitológicos', 'No tiene personajes definidos', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el realismo como movimiento literario?', 'Un movimiento que usa elementos fantásticos', 'Una corriente que idealiza la realidad', 'Una corriente exclusivamente poética', 'Una corriente que busca representar la realidad cotidiana con fidelidad y objetividad', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre lengua y habla?', 'La lengua es el sistema compartido por una comunidad; el habla es el uso individual de ese sistema', 'El habla es más formal que la lengua', 'La lengua solo existe en la escritura formal', 'Son términos completamente equivalentes', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un arcaísmo en el lenguaje?', 'Una palabra tomada de otro idioma', 'Una palabra de reciente creación tecnológica', 'Una palabra o expresión que ha caído en desuso en el lenguaje cotidiano actual', 'Un término técnico de una disciplina', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el propósito de la crítica literaria?', 'Reescribir la obra con mejoras estilísticas', 'Analizar, interpretar y valorar una obra literaria considerando su contexto y recursos', 'Resumir la trama de una obra', 'Solo dar una opinión personal sin fundamento', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el flujo de conciencia como técnica narrativa?', 'Un monólogo teatral con estructura definida', 'Un estilo de escritura completamente objetivo', 'Una técnica que reproduce el flujo desordenado de pensamientos y emociones del personaje', 'Una descripción detallada del entorno físico', 'c', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Al escribir un informe de lectura, ¿qué diferencia existe entre la síntesis y el análisis?', 'El análisis solo aplica a textos científicos', 'La síntesis resume el contenido; el análisis interpreta sus elementos, técnicas e implicaciones', 'La síntesis es siempre más larga que el análisis', 'No hay diferencia relevante entre ambos', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué el contexto histórico es importante para interpretar una obra literaria?', 'Porque el contexto histórico influye en los temas, el lenguaje y los conflictos que el autor aborda', 'Para conocer únicamente la biografía del autor', 'No tiene relevancia para la interpretación', 'Solo es importante para las obras antiguas', 'a', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Español III' AND e.titulo = 'Examen Final — Español III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son los tres pilares de un estilo de vida saludable?', 'Ejercicio intenso, suplementos y sueño prolongado', 'Alimentación balanceada, actividad física regular y descanso adecuado', 'Estudio, trabajo y descanso', 'Dieta, medicamentos y reposo absoluto', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el Índice de Masa Corporal (IMC)?', 'La cantidad total de músculo en el cuerpo', 'La velocidad metabólica de una persona', 'La medida de la grasa corporal total', 'Un indicador que relaciona el peso y la talla para evaluar el estado nutricional', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre macronutrientes y micronutrientes?', 'Los macronutrientes aportan energía; los micronutrientes se necesitan en pequeñas cantidades para funciones específicas', 'Los macronutrientes son vitaminas y los micronutrientes son proteínas', 'No hay diferencia real entre ambos', 'Los macronutrientes solo se encuentran en carnes', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante la actividad física regular?', 'Mejora la salud cardiovascular, el estado de ánimo, el sueño y reduce el riesgo de enfermedades crónicas', 'Solo para deportistas profesionales', 'Para aumentar el apetito', 'Solo para perder peso rápidamente', 'a', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el estrés crónico y cómo afecta la salud?', 'Un tipo de ejercicio intensivo', 'Un trastorno solo psicológico sin efectos físicos', 'Una respuesta prolongada al estrés que puede causar problemas cardiovasculares, insomnio y debilitamiento inmune', 'Un estado de alta energía beneficioso', 'c', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuántas horas de sueño se recomiendan para un adolescente?', '8 a 10 horas', '12 a 14 horas', '5 a 6 horas', '4 a 5 horas', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la salud mental?', 'La capacidad de memorizar información con precisión', 'La ausencia total de enfermedades físicas', 'El estado de bienestar emocional, psicológico y social que permite afrontar el estrés y contribuir a la sociedad', 'Solo el tratamiento de enfermedades mentales graves', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el impacto del consumo excesivo de azúcar en la salud?', 'Puede provocar obesidad, diabetes tipo 2, caries y problemas cardiovasculares', 'Mejora el rendimiento físico a corto plazo', 'Ninguno si se hace ejercicio regularmente', 'Solo afecta negativamente a los dientes', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un estudiante duerme 5 horas, estudia 8 horas y no hace ejercicio. ¿Qué cambio prioritario se le recomienda?', 'Solo cambiar la alimentación diaria', 'Reducir el tiempo de estudio', 'Incorporar actividad física y aumentar el descanso para mejorar el rendimiento y la salud', 'Estudiar más horas al día', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué las enfermedades no transmisibles son consideradas problemas de salud pública?', 'Porque no tienen ningún tratamiento médico', 'Porque se contagian fácilmente entre personas', 'Porque solo afectan a personas mayores', 'Porque afectan a millones de personas, son prevenibles con hábitos saludables y generan grandes costos sociales', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Estilo de vida saludable' AND e.titulo = 'Examen Final — Estilo de vida saludable'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el origen histórico de las universidades en el mundo occidental?', 'Las universidades fueron creadas en el siglo XX', 'Las universidades surgieron en Asia en el siglo V', 'Las universidades surgieron durante la Revolución Industrial', 'Las primeras universidades surgieron en Europa medieval durante los siglos XI y XII', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la identidad universitaria?', 'El logotipo de la institución educativa', 'El uniforme obligatorio de los estudiantes', 'Las reglas del reglamento escolar', 'El conjunto de valores, tradiciones, misión y pertenencia que comparten los miembros de una institución', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál fue la función original de las universidades medievales?', 'Preservar y transmitir el conocimiento filosófico, teológico y jurídico', 'Formar soldados y líderes militares', 'Desarrollar tecnologías industriales', 'Organizar el comercio internacional', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué son los valores institucionales en el contexto universitario?', 'Los principios que guían el comportamiento y las decisiones de todos los miembros de la comunidad', 'Las calificaciones mínimas requeridas para aprobar', 'Las normas de vestimenta del plantel', 'Los premios académicos anuales', 'a', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué importancia tiene la educación superior para el desarrollo de un país?', 'Solo beneficia a quienes estudian individualmente', 'Genera profesionales capaces de impulsar la investigación, la economía y el bienestar social', 'No tiene impacto directo en el desarrollo', 'Aumenta el desempleo a largo plazo', 'b', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el reglamento escolar y por qué existe?', 'Un manual de materias obligatorias', 'Una lista de actividades extracurriculares permitidas', 'Una lista de calificaciones mínimas', 'Un conjunto de normas que regulan la convivencia, derechos y responsabilidades dentro de la institución', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cómo contribuye la tutoría universitaria al éxito académico?', 'Reemplaza al docente titular en sus funciones', 'No tiene ningún impacto real', 'Proporciona orientación, acompañamiento y apoyo para superar dificultades académicas y de adaptación', 'Solo sirve para alumnos con problemas graves', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la autonomía universitaria?', 'La ausencia de evaluaciones obligatorias', 'La libertad total de horarios para los estudiantes', 'La independencia financiera de los alumnos', 'El derecho de la institución a gobernarse, organizar sus estudios y presupuesto sin interferencia externa', 'd', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante conocer la historia de tu institución educativa?', 'Para memorizar datos en exámenes únicamente', 'Solo por curiosidad personal', 'Porque permite comprender los valores, logros y retos que forjaron la identidad institucional', 'Para cumplir un requisito burocrático de ingreso', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un estudiante tiene dificultades para adaptarse al ritmo universitario. ¿Qué recurso institucional debe consultar?', 'Estudiar más horas sin descanso', 'Abandonar la materia inmediatamente', 'El servicio de tutoría y orientación académica de la institución', 'Pedir ayuda solo a un compañero', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Historia e identidad universitaria' AND e.titulo = 'Examen Final — Historia e identidad universitaria'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which greeting is appropriate for a formal situation?', 'Hey, what''s up?', 'Good morning, how do you do?', 'Yo, what''s going on?', 'Hiya, how are ya?', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the correct form of "to be" for the subject "They"?', 'are', 'am', 'was', 'is', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you say "¿Cuántos años tienes?" in English?', 'How old is he?', 'How many years you have?', 'What is your age, please?', 'How old are you?', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which sentence is in the Simple Present tense?', 'She ate lunch yesterday.', 'She eats lunch every day.', 'She will eat lunch tomorrow.', 'She is eating lunch right now.', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What does the word "beautiful" mean in Spanish?', 'Feo/a', 'Hermoso/a', 'Pequeño/a', 'Grande', 'b', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you correctly introduce yourself in English?', 'My name is Ana and I am from Mexico.', 'My name is Ana and I from Mexico.', 'I name Ana and from Mexico.', 'My name Ana, I am from Mexico.', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which of the following words is a color?', 'Run', 'Table', 'Blue', 'Slowly', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the plural of "child"?', 'Childre', 'Childes', 'Childs', 'Children', 'd', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'If someone asks "Where are you from?" what is the correct response?', 'I am from Mexico.', 'I is from Mexico.', 'I from Mexico.', 'I am from to Mexico.', 'a', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'A student wants to ask for permission in class. Which phrase is correct?', 'Me go bathroom please.', 'I want go to bathroom.', 'May I go to the bathroom, please?', 'Can go I bathroom now?', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés Básico' AND e.titulo = 'Examen Final — Inglés Básico'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the correct past tense of the verb "go"?', 'Goed', 'Went', 'Goes', 'Gone', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you form a question in the Simple Past with "did"?', 'She go to school yesterday?', 'Did she go to school?', 'She did go to school?', 'Did she goes to school?', 'b', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which sentence correctly uses the Present Continuous?', 'She read a book now.', 'She is reading a book right now.', 'She reading a book.', 'She reads a book now.', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What does "I used to play soccer" mean in Spanish?', 'Yo juego fútbol', 'Yo jugué fútbol ayer', 'Yo solía jugar fútbol', 'Yo jugaré fútbol', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which preposition correctly completes: "The meeting is ___ Monday"?', 'at', 'by', 'in', 'on', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you say "tengo hambre" in English?', 'I have hunger.', 'I am hungry.', 'I am hunger.', 'I have hungry.', 'b', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which sentence is grammatically correct?', 'She isn''t like coffee.', 'She don''t like coffee.', 'She doesn''t like coffee.', 'She not like coffee.', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the comparative form of the adjective "good"?', 'Betterer', 'Gooder', 'More good', 'Better', 'd', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'A student writes: "Yesterday I go to the market." What is the error?', '"Yesterday" is incorrect', '"go" should be "went"', '"the" should be "a"', '"market" is incorrect', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which connecting word shows contrast?', 'Therefore', 'Furthermore', 'However', 'Additionally', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 1' AND e.titulo = 'Examen Final — Inglés nivel 1'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which sentence correctly uses the Present Perfect?', 'I have went to Paris.', 'I have go to Paris.', 'I was to Paris last year.', 'I have been to Paris.', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the main difference between "will" and "going to" for future?', 'Going to is only used for past actions', 'They mean exactly the same', 'Will is always more formal', 'Will expresses spontaneous decisions; going to expresses planned intentions', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you form a Type 1 Conditional sentence?', 'If + past + would', 'If + present simple + will/can + base verb', 'If + will + infinitive', 'If + had + past participle', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which of the following is a modal verb?', 'Beautiful', 'Must', 'Speak', 'Quickly', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What does the passive voice express?', 'That the sentence is negative', 'That the action is in the future', 'That the subject performs the action', 'That the subject receives the action', 'd', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'How do you correctly rewrite "The teacher explains the lesson" in passive voice?', 'The lesson explains the teacher.', 'The teacher is explained the lesson.', 'The lesson was explain by the teacher.', 'The lesson is explained by the teacher.', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'What is the function of a relative clause with "who" or "which"?', 'To give additional information about a noun', 'To express time references', 'To show contrast between ideas', 'To introduce a conditional statement', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Which phrasal verb means "to continue"?', 'Carry on', 'Give up', 'Get up', 'Take off', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'A student wants to write: "If I study hard, I will pass." Is this correct?', 'No, should use "would" instead of "will"', 'No, should use "had studied"', 'Yes, it is a correct Type 1 conditional', 'Yes, but only in spoken English', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Why is reading authentic English texts important for language learning?', 'It completely replaces all other forms of study', 'Only grammar exercises matter for fluency', 'It is not useful for language development', 'It exposes learners to natural grammar patterns, vocabulary, and cultural context', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Inglés nivel 2' AND e.titulo = 'Examen Final — Inglés nivel 2'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son las funciones del lenguaje según Roman Jakobson?', 'Informar, narrar y describir', 'Oral, escrita y gestual', 'Referencial, emotiva, conativa, fática, metalingüística y poética', 'Hablar, escribir y escuchar', 'c', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la variación lingüística?', 'El cambio de idioma al viajar', 'El vocabulario técnico de cada profesión', 'Los errores gramaticales más frecuentes', 'Las diferencias en el uso de una misma lengua según región, grupo social, edad u otras variables', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre lengua oral y lengua escrita?', 'La oral es espontánea y efímera; la escrita es planificada y permanente', 'La escrita es exclusiva de grupos académicos', 'La oral no tiene ninguna gramática', 'No presentan diferencias relevantes', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el registro formal en el lenguaje?', 'El uso de palabras técnicas de un área', 'El idioma oficial reconocido de un país', 'El estilo lingüístico cuidado y apropiado para contextos académicos, profesionales o solemnes', 'Hablar en voz alta y clara', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la función del sujeto en una oración?', 'Señalar el tiempo de la acción', 'Indicar de quién o qué se habla; el elemento sobre el que recae la predicación', 'Conectar dos oraciones distintas', 'Expresar la finalidad de la acción verbal', 'b', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el morfema en el estudio de la lengua?', 'La unidad mínima de sonido', 'La unidad mínima con significado gramatical o léxico', 'Una oración completa simple', 'Un párrafo con unidad temática', 'b', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son las características del lenguaje científico?', 'Abundancia de adjetivos subjetivos', 'Precisión, objetividad, uso de tecnicismos y estructura lógica', 'Uso de metáforas y rima poética', 'Lenguaje coloquial e informal', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la denotación de una palabra?', 'Solo el significado poético de la palabra', 'El significado emocional o subjetivo asociado', 'El significado literal, objetivo y primario de la palabra', 'El significado que cambia según el contexto', 'c', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un alumno usa "tú" al escribirle a su jefe en un correo formal. ¿Qué error comete?', 'Un error ortográfico', 'Un error de registro: usa un trato informal en un contexto que requiere formalidad', 'Un error de coherencia textual', 'Un error gramatical de conjugación', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante adaptar el lenguaje al contexto y al interlocutor?', 'Para hablar más rápido y eficientemente', 'Solo en contextos académicos formales', 'Para demostrar superioridad intelectual', 'Porque el lenguaje apropiado asegura la comprensión, el respeto y la efectividad comunicativa', 'd', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Lengua y comunicación I' AND e.titulo = 'Examen Final — Lengua y comunicación I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el resultado de resolver: 2(x + 3) = 14?', 'x = 3', 'x = 8', 'x = 7', 'x = 4', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una función matemática?', 'Un tipo de ecuación siempre cuadrática', 'Un conjunto de números enteros', 'Una tabla de valores aleatorios', 'Una relación donde a cada elemento del dominio le corresponde exactamente un elemento del rango', 'd', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál de las siguientes es una propiedad de los números reales?', 'Entre dos números reales siempre existe otro número real', 'Todo número real es positivo', 'Los números reales son finitos', 'Los números reales no incluyen decimales', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es la raíz cuadrada de 144?', '16', '14', '11', '12', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el máximo común divisor (MCD) de dos números?', 'El mayor número que divide exactamente a ambos', 'El número más grande de los dos', 'La suma de ambos números', 'El producto de ambos números', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si la probabilidad de sacar un 6 en un dado es 1/6, ¿cuántas veces se espera obtenerlo en 120 lanzamientos?', '30', '12', '6', '20', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la forma general de una ecuación lineal?', 'ax² + bx + c = 0', 'y = mx²', 'ax + b = 0', 'x/y = c', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un número irracional?', 'Un número que no puede expresarse como fracción de enteros', 'Un número siempre negativo', 'Un número con parte decimal finita', 'Un número mayor que 1 000 000', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Una tienda descuenta 20% a un artículo de $850 pesos. ¿Cuánto se paga?', '$720', '$630', '$680', '$700', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre media, mediana y moda?', 'La media es el valor más frecuente', 'Son lo mismo en cualquier conjunto de datos', 'La media es el promedio, la mediana el valor central y la moda el valor más frecuente', 'Solo la media se usa en estadística descriptiva', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas I' AND e.titulo = 'Examen Final — Matemáticas I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una función cuadrática y cómo se reconoce?', 'Una función con dos variables independientes', 'Una función solo con valores positivos', 'Una función de la forma f(x)=ax²+bx+c cuya gráfica es una parábola', 'Una función que tiene logaritmo', 'c', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el vértice de la parábola f(x) = x² - 4x + 3?', '(2, 1)', '(2, -1)', '(4, 3)', '(0, 3)', 'b', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué representa la "b" en la ecuación y = mx + b?', 'El punto máximo de la función', 'La intersección de la recta con el eje y', 'La pendiente de la recta', 'La variable independiente', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es sen(30°)?', '√2/2', '√3/2', '1/2', '1', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el valor de cos(90°)?', '1', '-1', '0', '√2/2', 'c', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué teorema relaciona los lados de un triángulo rectángulo?', 'Teorema de Thales', 'Teorema de Tales', 'Teorema de Euclides', 'Teorema de Pitágoras', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'En una función exponencial f(x) = 2^x, ¿qué sucede cuando x tiende a infinito?', 'f(x) se mantiene constante', 'f(x) tiende a -1', 'f(x) tiende a infinito', 'f(x) tiende a 0', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el logaritmo natural de e?', '2', '1', 'e', '0', 'b', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si se tiene un triángulo con ángulos 30°, 60° y 90°, ¿cómo se clasifica?', 'Escaleno obtuso', 'Equilátero', 'Isósceles acutángulo', 'Triángulo rectángulo especial', 'd', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la utilidad de calcular áreas bajo una curva?', 'Es exclusivo de ingeniería aeroespacial', 'Solo se usa en geometría básica', 'Permite calcular trabajo, distancias, volúmenes, probabilidades y modelar fenómenos físicos', 'No tiene aplicaciones fuera de matemáticas puras', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas II' AND e.titulo = 'Examen Final — Matemáticas II'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el límite de una función en el cálculo?', 'La derivada de la función en ese punto', 'El valor al que se aproxima f(x) cuando x se acerca a un punto específico', 'El valor máximo de la función', 'El punto donde la función no está definida', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué expresa la derivada de una función?', 'El área bajo la curva', 'La distancia entre dos puntos de la gráfica', 'La tasa de cambio instantánea de la función en un punto', 'El valor promedio de la función', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la derivada de f(x) = x³?', 'x²', 'x⁴', '3x²', '3x', 'c', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es una integral definida?', 'La pendiente en un punto de la curva', 'El valor máximo de la función', 'El área bajo la curva de una función entre dos límites determinados', 'La antiderivada de una función indefinida', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuánto es la derivada de f(x) = 5 (constante)?', '0', 'x', '1', '5', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la regla de la cadena en derivación?', 'Una técnica para derivar funciones compuestas: [f(g(x))] = f(g(x))·g(x)', 'Una propiedad de las series numéricas', 'Una fórmula para calcular integrales', 'Una propiedad de los logaritmos', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el significado geométrico de la derivada en un punto?', 'La pendiente de la recta tangente a la curva en ese punto', 'La longitud del arco de curva', 'El radio de curvatura en ese punto', 'El área del triángulo formado', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué indica que f(x) > 0 en un intervalo?', 'La función es creciente en ese intervalo', 'La función es constante en ese intervalo', 'La función tiene un mínimo en ese punto', 'La función decrece en ese intervalo', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si f(x) = 4x - 6, ¿en qué punto la función f(x) = 2x² - 6x tiene un mínimo?', 'x = 4', 'x = 6', 'x = 2', 'x = 1.5', 'd', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué el cálculo integral es fundamental en física?', 'Permite calcular trabajo, energía, áreas de superficies y modelar fenómenos físicos continuos', 'Es exclusivo de termodinámica avanzada', 'Solo se usa para cálculos de velocidad', 'No se utiliza en física aplicada', 'a', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Matemáticas III' AND e.titulo = 'Examen Final — Matemáticas III'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el pensamiento computacional?', 'La habilidad de usar computadoras', 'Un conjunto de habilidades para resolver problemas mediante descomposición, abstracción y algoritmos', 'Un lenguaje de programación específico', 'El diseño de hardware y circuitos', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un algoritmo?', 'Una secuencia ordenada de pasos para resolver un problema o realizar una tarea', 'Un protocolo de red', 'Un programa de computadora completo', 'Un tipo de base de datos', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre una variable y una constante en programación?', 'Una constante puede cambiar y una variable no', 'Son lo mismo en la práctica', 'Las variables solo almacenan números', 'Una variable puede cambiar su valor durante la ejecución; una constante siempre mantiene el mismo valor', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un condicional (if-else) en programación?', 'Una variable de tipo booleano', 'Un tipo de función matemática', 'Una estructura que ejecuta código diferente según si una condición es verdadera o falsa', 'Un ciclo que repite instrucciones', 'c', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Para qué sirve un ciclo "for" o "while" en programación?', 'Para repetir un bloque de código un número determinado de veces o mientras se cumpla una condición', 'Para declarar nuevas variables', 'Para definir nuevas funciones', 'Para importar librerías externas', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la depuración (debugging) en programación?', 'El proceso de identificar y corregir errores en un programa', 'Documentar el código existente', 'Optimizar el código para mayor velocidad', 'Escribir nuevo código desde cero', 'a', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la ventaja del pensamiento modular en programación?', 'Aumenta el tamaño del programa final', 'Permite dividir un problema complejo en partes manejables y reutilizables', 'Solo funciona en lenguajes orientados a objetos', 'Dificulta la colaboración entre programadores', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el pseudocódigo?', 'Una representación informal de los pasos de un algoritmo usando lenguaje natural con estructura lógica', 'Un tipo de comentario en el código', 'Un diagrama de flujo gráfico', 'Un lenguaje de programación específico', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un programa debe mostrar "Hola" 5 veces pero solo lo hace 4. ¿Qué tipo de error tiene?', 'Error de sintaxis en el código', 'Error lógico en la condición del ciclo', 'Error de red o conexión', 'Error de compilación del programa', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es útil aprender fundamentos de programación aunque no se sea programador?', 'Es obligatorio para graduarse en todas las carreras', 'Desarrolla el pensamiento lógico, la resolución de problemas y comprensión de cómo funciona la tecnología', 'No es útil fuera de la informática', 'Solo sirve para hacer páginas web', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Pensamiento digital y programación básica' AND e.titulo = 'Examen Final — Pensamiento digital y programación básica'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué diferencia existe entre sexo biológico y género?', 'Solo el sexo tiene implicaciones sociales', 'El género es biológico y el sexo es cultural', 'El sexo biológico se refiere a características anatómicas; el género es una construcción social y cultural', 'Son sinónimos completamente equivalentes', 'c', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué son los estereotipos de género?', 'Diagnósticos médicos sobre la identidad', 'Leyes que regulan el comportamiento social', 'Ideas preconcebidas y generalizadas sobre cómo deben comportarse las personas según su género', 'Roles libremente elegidos por cada persona', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la perspectiva de género?', 'Un enfoque analítico que visibiliza las desigualdades entre géneros y busca relaciones más equitativas', 'Una opinión personal sobre las mujeres', 'Un movimiento político exclusivo de mujeres', 'Una materia diseñada solo para mujeres', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuáles son los derechos sexuales y reproductivos?', 'Obligaciones establecidas por la religión', 'Derechos humanos que garantizan decidir libremente sobre la propia sexualidad, reproducción y salud sexual', 'Solo el derecho a tener hijos', 'Normas legales de cada país sin aplicación universal', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la violencia de género?', 'Un conflicto entre personas del mismo sexo', 'Una situación exclusiva de parejas casadas', 'Cualquier forma de violencia dirigida contra una persona por razón de su género de forma desproporcionada', 'Un término legal sin implicaciones sociales reales', 'c', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la importancia de la educación sexual integral?', 'Reemplaza completamente la educación en el hogar', 'Promueve el libertinaje entre jóvenes', 'Proporciona información científica, valores y habilidades para tomar decisiones libres, informadas y responsables', 'Es solo para adolescentes con problemas', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la identidad de género?', 'Una opción de vida completamente reversible', 'Un estado de confusión temporal en adolescentes', 'La vivencia interna e individual del género que puede o no corresponder con el sexo asignado al nacer', 'El sexo biológico de una persona', 'c', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el machismo y cuáles son sus consecuencias?', 'Un sistema de valores positivos para la sociedad', 'Solo afecta a las mujeres directamente', 'Una forma de disciplina familiar aceptable', 'Un sistema de creencias que establece la superioridad masculina, generando discriminación, violencia y desigualdad', 'd', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Una persona recibe menos salario que sus colegas con el mismo puesto únicamente por ser mujer. ¿Qué tipo de discriminación es?', 'Resultado de una negociación salarial normal', 'Discriminación de género en el ámbito laboral', 'Discriminación por edad', 'Preferencia empresarial legítima', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es importante el consentimiento en las relaciones interpersonales?', 'Para evitar únicamente conflictos menores', 'Porque garantiza que todas las interacciones sean libres, voluntarias y respetuosas de la autonomía de cada persona', 'Solo en relaciones formales o legales', 'Solo es relevante desde el punto de vista legal', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Sexualidad y género' AND e.titulo = 'Examen Final — Sexualidad y género'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la inteligencia artificial (IA)?', 'Un robot humanoide autónomo', 'Un lenguaje de programación avanzado', 'Un sistema operativo de última generación', 'La capacidad de las máquinas para realizar tareas que normalmente requieren inteligencia humana', 'd', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el Internet de las Cosas (IoT)?', 'Una red social para expertos en tecnología', 'Una plataforma de comercio electrónico', 'La interconexión de objetos físicos con sensores y software que les permite recopilar e intercambiar datos', 'Un tipo de virus informático moderno', 'c', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre almacenamiento local y en la nube?', 'El almacenamiento local guarda datos en el dispositivo; la nube los almacena en servidores remotos accesibles por internet', 'El almacenamiento local siempre es ilimitado', 'La nube es siempre gratuita e ilimitada', 'No hay diferencia entre ambos', 'a', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el ciberacoso y cómo puede prevenirse?', 'Un error de configuración del sistema', 'El acoso intencional y repetido mediante dispositivos digitales; se previene con educación, denuncia y bloqueo', 'Una forma de juego competitivo en línea', 'Un virus que ataca redes sociales', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es un sistema operativo?', 'El software que gestiona los recursos del hardware y proporciona servicios a las aplicaciones', 'Un programa exclusivo para navegar internet', 'Un tipo de procesador de alto rendimiento', 'Una aplicación de mensajería instantánea', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el impacto de las redes sociales en la salud mental de los jóvenes?', 'No tienen ningún impacto demostrado', 'Pueden generar tanto conexión social como ansiedad, baja autoestima y adicción sin autorregulación', 'Solo producen efectos negativos inevitables', 'Solo producen efectos positivos', 'b', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el cifrado de datos y por qué es importante?', 'Un proceso que convierte datos en un formato ilegible para proteger la privacidad e integridad de la información', 'Un método de almacenamiento eficiente', 'Un tipo de compresión de archivos', 'Una tecnología de impresión digital', 'a', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la brecha tecnológica y qué consecuencias genera?', 'Una falla en la red eléctrica', 'La desigualdad en el acceso y uso de tecnologías entre personas o regiones, ampliando brechas sociales', 'La diferencia de velocidad de internet entre zonas', 'Un tipo de software desactualizado', 'b', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Recibes solicitud de un desconocido que ofrece premios a cambio de datos personales. ¿Qué haces?', 'Aceptas si el premio parece valioso', 'Compartes solo nombre y correo', 'Preguntas a un amigo antes de decidir', 'Rechazas, no compartes datos y reportas el perfil como posible estafa', 'd', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué es relevante entender cómo funcionan los algoritmos de las redes sociales?', 'No es relevante para usuarios comunes', 'Porque influyen en qué información vemos, conformando percepciones y opiniones sin que seamos conscientes', 'Solo importa para quienes programan las plataformas', 'Para aumentar el número de seguidores', 'b', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tecnología y Vida Digital' AND e.titulo = 'Examen Final — Tecnología y Vida Digital'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el propósito principal de la tutoría de ingreso en la universidad?', 'Reemplazar las clases formales del programa', 'Apoyar al estudiante en su adaptación al entorno universitario orientando en aspectos académicos y personales', 'Asignar calificaciones adicionales automáticamente', 'Seleccionar a los mejores estudiantes del grupo', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el aprendizaje autónomo?', 'Estudiar sin ningún apoyo externo', 'La capacidad de gestionar el propio proceso de aprendizaje: establecer metas, planificar y evaluar el progreso', 'Asistir a todas las clases sin faltar nunca', 'Solo leer libros en casa sin guía', 'b', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué estrategia de estudio implica el método Cornell?', 'Leer y subrayar todo el texto', 'Escuchar audios del tema repetidamente', 'Dividir las notas en sección de apuntes, preguntas clave y resumen para facilitar la revisión activa', 'Solo hacer mapas mentales del tema', 'c', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la gestión del tiempo en el contexto académico?', 'Evitar toda actividad extracurricular', 'Trabajar más horas al día sin descanso', 'Reducir el tiempo dedicado al estudio', 'La planificación y distribución eficiente de las actividades para cumplir responsabilidades académicas y personales', 'd', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre objetivos a corto y largo plazo en el aprendizaje?', 'Los de corto plazo son logros inmediatos; los de largo plazo definen metas futuras que guían el proceso educativo', 'Los de corto plazo requieren siempre más tiempo', 'No hay diferencia relevante en la práctica', 'Los de largo plazo son menos importantes', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué son las habilidades socioemocionales y por qué importan en la universidad?', 'Solo importan en la vida laboral posterior', 'Se aprenden automáticamente con la edad', 'Habilidades deportivas exclusivamente', 'Competencias como empatía, autocontrol y comunicación asertiva que favorecen el bienestar y las relaciones positivas', 'd', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la procrastinación y cómo afecta el rendimiento académico?', 'Estudiar con mucha anticipación', 'Posponer tareas importantes generando acumulación de trabajo, estrés y bajo rendimiento', 'Un método de organización del tiempo', 'Una técnica de memorización eficiente', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la importancia de asistir a asesorías y tutorías institucionales?', 'Son obligatorias sin ninguna excepción', 'Permiten aclarar dudas, recibir retroalimentación personalizada y fortalecer el aprendizaje con apoyo especializado', 'Son exclusivamente para alumnos con bajo rendimiento', 'No tienen valor adicional al estudio individual', 'b', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un estudiante universitario nuevo no puede llevar el ritmo de las materias. ¿Qué recomiendas?', 'Estudiar toda la noche constantemente', 'Abandonar una materia inmediatamente', 'Pedir a un compañero que haga sus tareas', 'Buscar apoyo en tutoría, organizar su tiempo y hablar con sus profesores sobre sus dificultades', 'd', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué la autoevaluación es una herramienta valiosa en el aprendizaje universitario?', 'Permite identificar fortalezas y áreas de mejora, ajustando estrategias de estudio para un aprendizaje más efectivo', 'Solo la realizan los profesores al final del curso', 'No es útil ya que solo importan las calificaciones finales', 'Es solo para preparar exámenes finales', 'a', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de ingreso I' AND e.titulo = 'Examen Final — Tutoría de ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la principal ventaja del bachillerato virtual?', 'Es más fácil que el presencial', 'Tiene flexibilidad de horarios y acceso 24/7', 'No tiene exámenes', 'No requiere estudiar', 'b', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la principal ventaja del bachillerato virtual respecto al presencial?', 'Solo se estudia los fines de semana', 'No requiere ningún esfuerzo ni disciplina personal', 'Permite organizar el tiempo de estudio según las necesidades de cada estudiante', 'Los profesores están disponibles en tiempo real las 24 horas', 'c', 1
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Verdadero o Falso? Una persona con estilo de aprendizaje auditivo aprende mejor con diagramas y mapas mentales.', 'Verdadero', 'Falso', '—', '—', 'b', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Según el modelo VARK, ¿cuáles son los cuatro estilos de aprendizaje principales?', 'Visual, Auditivo, Lecto-escritor y Kinestésico', 'Lento, rápido, mixto y selectivo', 'Teórico, práctico, social e individual', 'Básico, intermedio, avanzado y experto', 'a', 2
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿En qué consiste la técnica de estudio Pomodoro?', 'Leer el texto completo subrayando todo el contenido', 'Hacer resúmenes con diferentes colores por tema', 'Copiar el texto del libro palabra por palabra en un cuaderno', 'Estudiar en bloques de aproximadamente 25 minutos con descansos breves para mantener la concentración', 'd', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'La técnica Pomodoro consiste en estudiar bloques de:', '10 minutos con 2 de descanso', '25 minutos con 5 de descanso', '45 minutos con 15 de descanso', '60 minutos con 10 de descanso', 'b', 3
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es el ''Active Recall'' (Recuerdo activo)?', 'Releer el material muchas veces', 'Cerrar el material e intentar recordar sin ver', 'Subrayar las ideas importantes', 'Copiar textualmente los apuntes', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿En qué consiste el Active Recall como técnica de estudio?', 'Releer los apuntes repetidamente hasta memorizarlos', 'Intentar recordar la información sin mirarla para fortalecer la memoria a largo plazo', 'Escuchar música relacionada con el tema mientras estudias', 'Copiar textualmente los apuntes en limpio varias veces', 'b', 4
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Verdadero o Falso? Subrayar todo el texto es una técnica de estudio muy efectiva.', 'Verdadero', 'Falso', '—', '—', 'b', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Para qué sirve la Matriz de Eisenhower en la gestión del tiempo?', 'Para clasificar las tareas según su urgencia e importancia y priorizar eficientemente', 'Para elaborar un horario de clases semanal fijo', 'Para calcular el promedio de calificaciones del semestre', 'Para medir la velocidad de lectura del estudiante', 'a', 5
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre motivación intrínseca y extrínseca?', 'La intrínseca viene de premios externos y la extrínseca de factores internos', 'Son términos completamente sinónimos en psicología educativa', 'La intrínseca surge del interés y satisfacción personal; la extrínseca viene de recompensas externas como el título o la aprobación', 'La extrínseca siempre es más duradera y confiable que la intrínseca', 'c', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'En la Matriz de Eisenhower, una tarea IMPORTANTE pero NO URGENTE se debe:', 'Hacer inmediatamente', 'Planificar para después', 'Eliminar', 'Delegar a alguien más', 'b', 6
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Por qué la disciplina es más valiosa que la motivación en la educación a distancia?', 'Porque la motivación nunca sirve de nada en el aprendizaje virtual', 'Porque la disciplina se puede desarrollar en solo un día de práctica', 'Porque ambas son exactamente iguales y no hay diferencia real entre ellas', 'Porque la motivación varía con el estado de ánimo, mientras la disciplina permite cumplir compromisos aunque no haya ganas', 'd', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es la diferencia entre motivación y disciplina?', 'Son lo mismo', 'La motivación te hace empezar, la disciplina te hace continuar', 'La disciplina es para el trabajo, la motivación para el estudio', 'La motivación es más importante que la disciplina', 'b', 7
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál de las siguientes herramientas digitales es útil para organizar y tomar apuntes de estudio?', 'Photoshop', 'Google Docs o Notion', 'AutoCAD', 'Adobe Premiere', 'b', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Verdadero o Falso? Un hábito generalmente se forma después de 21-30 días de repetición consistente.', 'Verdadero', 'Falso', '—', '—', 'a', 8
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué significa que una meta académica sea SMART?', 'Que sea ambiciosa sin importar si es actualmente alcanzable', 'Que la definan los profesores en lugar del propio alumno', 'Que sea Específica, Medible, Alcanzable, Relevante y con Tiempo definido', 'Que involucre exclusivamente actividades académicas sin vida personal', 'c', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué es la ''mentalidad de crecimiento'' de Carol Dweck?', 'Creer que la inteligencia es fija y no cambia', 'Creer que puedes mejorar tus habilidades con esfuerzo y práctica', 'Pensar que solo los genios tienen éxito', 'Crecer físicamente durante la adolescencia', 'b', 9
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Qué herramienta usa tarjetas de memoria (flashcards) con repetición espaciada?', 'Google Docs', 'Canva', 'Anki', 'Trello', 'c', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Un estudiante nuevo en el bachillerato virtual se siente abrumado en su primera semana. ¿Qué actitud es más recomendable?', 'Aplicar técnicas de organización del tiempo, identificar su estilo de aprendizaje y comunicarse con su tutor', 'Esperar a que la situación mejore sola sin hacer cambios', 'Estudiar todo el día sin descansos hasta ponerse completamente al día', 'Abandonar inmediatamente y buscar otra modalidad educativa', 'a', 10
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Verdadero o Falso? La técnica Feynman consiste en explicar un tema como si se lo enseñaras a un niño.', 'Verdadero', 'Falso', '—', '—', 'a', 11
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Una meta SMART debe ser específica, medible, alcanzable, relevante y:', 'Total', 'Técnica', 'Con plazo definido (Time-bound)', 'Teórica', 'c', 12
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Cuál es el principal enemigo de la concentración al estudiar en línea?', 'Los libros', 'Las distracciones digitales (celular, redes sociales)', 'La falta de libros físicos', 'El horario de clases', 'b', 13
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, '¿Verdadero o Falso? En la educación virtual, la responsabilidad del aprendizaje es 100% del alumno.', 'Verdadero', 'Falso', '—', '—', 'a', 14
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

INSERT INTO preguntas (evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT e.id, 'Si un día no tienes ganas de estudiar, ¿qué es lo mejor que puedes hacer?', 'No estudiar y esperar a que regrese la motivación', 'Comprometerte a solo 5 minutos y empezar', 'Estudiar 4 horas para compensar', 'Dejar la materia para el mes siguiente', 'b', 15
FROM evaluaciones e JOIN materias m ON m.id = e.materia_id
WHERE m.nombre = 'Tutoría de Ingreso I' AND e.titulo = 'Examen Final — Tutoría de Ingreso I'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación post-seed
SELECT
  m.nombre AS materia,
  e.titulo AS evaluacion,
  COUNT(p.id) AS preguntas
FROM evaluaciones e
JOIN materias m ON m.id = e.materia_id
LEFT JOIN preguntas p ON p.evaluacion_id = e.id
GROUP BY m.nombre, e.titulo
ORDER BY m.nombre;
