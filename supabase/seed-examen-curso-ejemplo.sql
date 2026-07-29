-- Seed de EJEMPLO del Examen Final de Curso — 8 preguntas, 2 temas (4 y 4).
--
-- Sirve para probar la feature de punta a punta sin depender del banco de
-- contenido. Para contenido real, usa los seeds del repo banco-cursos-ingreso.
--
-- NOTA: el módulo Cursos y Diplomados no trae un seed de curso demo en SQL (el
-- curso demo lo crea la suite e2e por nombre, ver e2e/README-QA.md), así que
-- este archivo es AUTOCONTENIDO: crea su propio curso de ejemplo con un UUID
-- fijo y le cuelga las 8 preguntas.
--
-- Idempotente: re-ejecutarlo actualiza, no duplica.
--
--   psql "postgresql://postgres:<PASS>@db.<REF>.supabase.co:5432/postgres" \
--        -v ON_ERROR_STOP=1 -f supabase/seed-examen-curso-ejemplo.sql

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.curso_examen_preguntas') IS NULL THEN
    RAISE EXCEPTION 'Falta public.curso_examen_preguntas. Corre antes supabase/migrations/20260728120000_examen_final_cursos.sql.';
  END IF;
END
$preflight$;

-- ── Curso de ejemplo ──
INSERT INTO public.cursos (id, nombre, descripcion, tipo, estado, orden) VALUES
  ('00000000-e2e0-4a00-8000-000000000001',
   'Curso demo — Examen final (QA)',
   'Curso de ejemplo para probar la feature de examen final. 8 preguntas en 2 temas.',
   'curso', 'publicado', 999)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW();

-- ── 8 preguntas: 4 de "Pensamiento matemático" y 4 de "Comprensión lectora" ──
INSERT INTO public.curso_examen_preguntas
  (id, curso_id, orden, tema, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion) VALUES

  ('00000000-e2e0-4a00-8001-000000000001', '00000000-e2e0-4a00-8000-000000000001', 1,
   'Pensamiento matemático',
   'Una camisa cuesta 480 pesos. En una promoción se le aplica un descuento del 25%. ¿Cuánto se paga?',
   '455 pesos', '360 pesos', '120 pesos', '400 pesos', 'b',
   'El 25% de 480 es 120, así que se pagan 480 − 120 = 360 pesos. También sale directo multiplicando por el factor 0.75. El distractor de 120 pesos es el descuento, no el precio final; el de 455 sale de restar 25 pesos en vez del 25%.'),

  ('00000000-e2e0-4a00-8001-000000000002', '00000000-e2e0-4a00-8000-000000000001', 2,
   'Pensamiento matemático',
   'Si 6 albañiles levantan una barda en 12 días, ¿en cuántos días la levantan 9 albañiles trabajando al mismo ritmo?',
   '18 días', '9 días', '8 días', '6 días', 'c',
   'Es proporción inversa: más trabajadores, menos días. El trabajo total es 6 × 12 = 72 días-albañil, así que 72 ÷ 9 = 8 días. El distractor de 18 días viene de aplicar regla de tres directa, que es el error clásico: basta razonar que más gente no puede tardar más.'),

  ('00000000-e2e0-4a00-8001-000000000003', '00000000-e2e0-4a00-8000-000000000001', 3,
   'Pensamiento matemático',
   'Resuelve respetando la jerarquía de operaciones: −8 + 3 × (−4) − (−6) ÷ 2',
   '−17', '−23', '−7', '13', 'a',
   'Primero multiplicación y división: 3 × (−4) = −12 y (−6) ÷ 2 = −3. Queda −8 + (−12) − (−3) = −8 − 12 + 3 = −17. El distractor de −23 sale de restar el −3 en vez de sumarlo, que es el tropiezo más común con el signo doble.'),

  ('00000000-e2e0-4a00-8001-000000000004', '00000000-e2e0-4a00-8000-000000000001', 4,
   'Pensamiento matemático',
   'Un terreno rectangular mide 20 m de largo y 12 m de ancho. ¿Cuál es su perímetro?',
   '240 m', '32 m', '64 m', '120 m', 'c',
   'El perímetro suma los cuatro lados: 2 × (20 + 12) = 64 m. El distractor de 240 m es el área en metros cuadrados, no el perímetro, y es el error que más se repite cuando se lee rápido; el de 32 m es medio perímetro.'),

  ('00000000-e2e0-4a00-8001-000000000005', '00000000-e2e0-4a00-8000-000000000001', 5,
   'Comprensión lectora',
   'Lee el texto y responde.

"En varios municipios las bibliotecas públicas ampliaron lo que ofrecen. Además de prestar libros, algunas prestan instrumentos musicales y herramientas, y otras abrieron talleres de reparación los sábados. El catálogo de libros sigue siendo el corazón del servicio, pero estas actividades atrajeron a vecinos que antes nunca cruzaban la puerta."

¿Cuál es la idea principal del texto?',
   'Las bibliotecas dejaron de prestar libros para prestar herramientas.',
   'Los talleres de reparación son la actividad más popular del país.',
   'Varias bibliotecas ampliaron sus servicios y con ello atrajeron público nuevo.',
   'Las bibliotecas públicas de México están en riesgo de cerrar.',
   'c',
   'La idea principal cubre todo el texto: la ampliación de servicios y su efecto, que es atraer vecinos nuevos. La opción de que dejaron de prestar libros contradice al texto, que dice que el catálogo sigue siendo el corazón del servicio; y la de los talleres como lo más popular inventa un ranking que el texto nunca hace.'),

  ('00000000-e2e0-4a00-8001-000000000006', '00000000-e2e0-4a00-8000-000000000001', 6,
   'Comprensión lectora',
   'Lee el texto y responde.

"En varios municipios las bibliotecas públicas ampliaron lo que ofrecen. Además de prestar libros, algunas prestan instrumentos musicales y herramientas, y otras abrieron talleres de reparación los sábados. El catálogo de libros sigue siendo el corazón del servicio, pero estas actividades atrajeron a vecinos que antes nunca cruzaban la puerta."

Según el texto, ¿qué sigue siendo el servicio central de estas bibliotecas?',
   'El catálogo de libros.',
   'Los talleres de reparación.',
   'El préstamo de herramientas.',
   'El préstamo de instrumentos musicales.',
   'a',
   'El texto lo dice literalmente: "El catálogo de libros sigue siendo el corazón del servicio". Las otras tres opciones sí aparecen en el pasaje, pero como servicios añadidos, no como el central. Es el tipo de reactivo que se contesta localizando el dato, no razonando.'),

  ('00000000-e2e0-4a00-8001-000000000007', '00000000-e2e0-4a00-8000-000000000001', 7,
   'Comprensión lectora',
   'En la oración "El equipo entrenó bajo la lluvia; sin embargo, no faltó nadie", ¿qué relación expresa el conector "sin embargo"?',
   'Causa', 'Contraste', 'Consecuencia', 'Adición', 'b',
   'Sin embargo anuncia contraste: lo esperable sería que con lluvia faltara gente, y ocurrió lo opuesto. El distractor de consecuencia es el más tentador porque la segunda parte parece un resultado, pero un conector de consecuencia (por lo tanto, así que) diría que nadie faltó A CAUSA de la lluvia, que es justo lo contrario.'),

  ('00000000-e2e0-4a00-8001-000000000008', '00000000-e2e0-4a00-8000-000000000001', 8,
   'Comprensión lectora',
   'Elige la oración escrita correctamente.',
   'No sé si mí respuesta fue la mejor, pero volveré a revisarla.',
   'Dime si tú quieres que te expliquen el tema; todavía hay tiempo.',
   'Él dijo que ésta guía es la mejor, aunque él precio resulte alto.',
   'El profesor preguntó cuanto tiempo faltaba para cerrar la sesión.',
   'b',
   'La correcta acentúa el pronombre tónico tú y no pone tilde donde no va. En la primera, sé (del verbo saber) necesita tilde y mi posesivo no la lleva; en la tercera, ésta va sin tilde por ser determinante y el precio lleva artículo, no pronombre; en la cuarta, cuánto es interrogativo indirecto y sí se acentúa.')

ON CONFLICT (id) DO UPDATE SET
  curso_id = EXCLUDED.curso_id,
  orden = EXCLUDED.orden,
  tema = EXCLUDED.tema,
  enunciado = EXCLUDED.enunciado,
  opcion_a = EXCLUDED.opcion_a,
  opcion_b = EXCLUDED.opcion_b,
  opcion_c = EXCLUDED.opcion_c,
  opcion_d = EXCLUDED.opcion_d,
  respuesta_correcta = EXCLUDED.respuesta_correcta,
  explicacion = EXCLUDED.explicacion;

COMMIT;
