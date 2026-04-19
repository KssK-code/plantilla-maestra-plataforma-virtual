const https = require('https');

const SVCKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZndjbnJvc2hnaXJiZHF1ZmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3MTgyMCwiZXhwIjoyMDkwNjQ3ODIwfQ.Fo4YhCH6a5rin7fdc5SlFrPn8Xx_KSoX94o14Kfw3Vw";
const HOST = "xxfwcnroshgirbdquffh.supabase.co";

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: HOST,
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SVCKEY, 'Authorization': `Bearer ${SVCKEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.substring(0, 300) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// FIX 1: Direct YouTube URLs for each demo semana
const VIDEO_UPDATES = [
  { id: 'cc000001-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=Xl2FtcsoRuI' },
  { id: 'cc000002-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=WMO3RskPSzQ' },
  { id: 'cc000003-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=ukLnPbIffxE' },
  { id: 'cc000004-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=iDbdXTMnOmE' },
  { id: 'cc000005-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=75d_29QWELk' },
  { id: 'cc000006-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=LFjxDOa9ERE' },
  { id: 'cc000007-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=67Ik9RFXfqY' },
  { id: 'cc000008-0000-4000-a000-000000000001', url: 'https://www.youtube.com/watch?v=MLpWrANjFbI' },
];

// FIX 2: 3 quiz questions per semana (quiz_semana has opcion_a/b/c only)
const QUIZZES = [
  {
    semana_id: 'cc000001-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Cual es la principal ventaja del bachillerato virtual?',
        a: 'No hay examenes', b: 'Flexibilidad de horarios y acceso 24/7', c: 'Es mas facil que el presencial',
        r: 'b', e: 'La principal ventaja es estudiar a tu ritmo, en tus horarios, desde cualquier lugar.' },
      { p: 'Para tener exito en el bachillerato virtual necesitas principalmente:',
        a: 'Mucho dinero', b: 'Disciplina y constancia', c: 'Estudiar 8 horas diarias',
        r: 'b', e: 'La disciplina y constancia son mas importantes que la inteligencia.' },
      { p: 'Cuantas horas diarias se recomiendan para el bachillerato virtual?',
        a: '4 a 6 horas', b: '1 a 2 horas', c: '8 horas',
        r: 'b', e: 'Con 1-2 horas diarias bien aprovechadas puedes avanzar a buen ritmo.' },
    ]
  },
  {
    semana_id: 'cc000002-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Que estilo de aprendizaje aprende mejor con diagramas y mapas mentales?',
        a: 'Auditivo', b: 'Kinestesico', c: 'Visual',
        r: 'c', e: 'El estilo visual aprende mejor con imagenes, diagramas y mapas conceptuales.' },
      { p: 'Cuantos estilos de aprendizaje describe el modelo VARK?',
        a: 'Dos', b: 'Cuatro', c: 'Seis',
        r: 'b', e: 'VARK describe 4 estilos: Visual, Auditivo, Lectura/Escritura y Kinestsico.' },
      { p: 'Si aprendes mejor haciendo ejercicios practicos, tu estilo es:',
        a: 'Auditivo', b: 'Kinestesico', c: 'Visual',
        r: 'b', e: 'El estilo kinestesico aprende mejor haciendo, con practica y ejemplos concretos.' },
    ]
  },
  {
    semana_id: 'cc000003-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Que tecnica usa bloques de 25 minutos de estudio con 5 de descanso?',
        a: 'Tecnica Feynman', b: 'Tecnica Pomodoro', c: 'Metodo Cornell',
        r: 'b', e: 'La tecnica Pomodoro: 25 min de estudio concentrado + 5 min de descanso.' },
      { p: 'El Active Recall consiste en:',
        a: 'Releer el material muchas veces', b: 'Cerrar el libro e intentar recordar sin ver', c: 'Subrayar las ideas importantes',
        r: 'b', e: 'Active Recall: cerrar el material e intentar recordar. Es la tecnica mas efectiva.' },
      { p: 'La tecnica Feynman consiste en:',
        a: 'Estudiar 4 horas seguidas', b: 'Crear tarjetas de memoria', c: 'Explicar el tema como si se lo ensenaras a un nino',
        r: 'c', e: 'Si no puedes explicarlo simple, es senal de que no lo entiendes bien.' },
    ]
  },
  {
    semana_id: 'cc000004-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'En la Matriz de Eisenhower, tareas IMPORTANTES pero NO URGENTES se deben:',
        a: 'Eliminar', b: 'Hacer inmediatamente', c: 'Planificar para despues',
        r: 'c', e: 'Las tareas importantes pero no urgentes se planifican, como estudiar.' },
      { p: 'La Regla de los 5 minutos sirve para:',
        a: 'Estudiar solo 5 minutos al dia', b: 'Vencer la procrastinacion comprometiendote a solo 5 minutos', c: 'Descansar 5 minutos cada hora',
        r: 'b', e: 'Una vez que empiezas 5 minutos, generalmente continuas estudiando.' },
      { p: 'Cuando se recomienda planificar la semana de estudio?',
        a: 'El lunes por la manana', b: 'El domingo con 15 minutos', c: 'Cuando tengas tiempo libre',
        r: 'b', e: 'Planificar 15 min el domingo te ayuda a organizar y cumplir metas cada semana.' },
    ]
  },
  {
    semana_id: 'cc000005-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Cual es la diferencia entre motivacion y disciplina?',
        a: 'Son lo mismo', b: 'La motivacion te hace empezar, la disciplina te hace continuar', c: 'La disciplina es menos importante',
        r: 'b', e: 'La motivacion es temporal. La disciplina, construida con habitos, te hace seguir.' },
      { p: 'La mentalidad de crecimiento de Carol Dweck significa:',
        a: 'Creer que la inteligencia es fija', b: 'Creer que puedes mejorar con esfuerzo y practica', c: 'Solo los genios aprenden cosas dificiles',
        r: 'b', e: 'Con mentalidad de crecimiento crees que tus habilidades se desarrollan con practica.' },
      { p: 'Un habito de estudio se forma aproximadamente despues de:',
        a: '3 dias de practica', b: '21 a 30 dias de repeticion consistente', c: '6 meses de practica',
        r: 'b', e: 'Despues de 21-30 dias de repeticion consistente la accion empieza a ser automatica.' },
    ]
  },
  {
    semana_id: 'cc000006-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Que herramienta usa flashcards con repeticion espaciada para memorizar?',
        a: 'Canva', b: 'Trello', c: 'Anki',
        r: 'c', e: 'Anki usa repeticion espaciada, excelente para memorizar conceptos a largo plazo.' },
      { p: 'Para que sirve la app Forest?',
        a: 'Para crear presentaciones', b: 'Para bloquear el celular mientras estudias', c: 'Para organizar tareas en Kanban',
        r: 'b', e: 'Forest planta un arbol virtual que crece mientras no tocas el celular.' },
      { p: 'Cual herramienta es mejor para mapas mentales digitales?',
        a: 'Google Docs', b: 'Gmail', c: 'MindMeister',
        r: 'c', e: 'MindMeister es una herramienta especializada en mapas mentales digitales.' },
    ]
  },
  {
    semana_id: 'cc000007-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Que significa la S en las metas SMART?',
        a: 'Sencilla', b: 'Especifica (Specific)', c: 'Segura',
        r: 'b', e: 'SMART: Specific (Especifica), Measurable, Achievable, Relevant, Time-bound.' },
      { p: 'Cual es un ejemplo de meta SMART correcta?',
        a: 'Quiero terminar la prepa', b: 'Voy a estudiar mas', c: 'Completare mi bachillerato con 7.0 de promedio para diciembre',
        r: 'c', e: 'Una meta SMART es especifica, medible, alcanzable, relevante y con plazo definido.' },
      { p: 'Con bachillerato completo, cuanto mas se gana en promedio en Mexico?',
        a: '10% mas', b: '35% mas', c: '5% mas',
        r: 'b', e: 'Con bachillerato completo se gana en promedio 35% mas que sin el.' },
    ]
  },
  {
    semana_id: 'cc000008-0000-4000-a000-000000000001',
    preguntas: [
      { p: 'Cuales son las tecnicas de estudio mas efectivas vistas en el curso?',
        a: 'Subrayado, copia, lectura y resumen', b: 'Active Recall, Pomodoro, Feynman y mapas mentales', c: 'YouTube, Google, Wikipedia y ChatGPT',
        r: 'b', e: 'Active Recall, Pomodoro, Feynman y mapas mentales tienen respaldo cientifico.' },
      { p: 'La herramienta visual mas util para organizar el tiempo de estudio es:',
        a: 'La Regla de los 2 minutos', b: 'La Tecnica Pomodoro', c: 'La Matriz de Eisenhower',
        r: 'c', e: 'La Matriz de Eisenhower clasifica tareas por urgencia e importancia.' },
      { p: 'Al terminar esta tutoria, cual es el siguiente paso recomendado?',
        a: 'Esperar instrucciones', b: 'Crear tu proyecto academico con metas SMART y horario de estudio', c: 'Estudiar 10 horas al dia desde manana',
        r: 'b', e: 'Tener un plan claro con metas SMART multiplica tus posibilidades de exito.' },
    ]
  },
];

async function run() {
  // FIX 1: Update video URLs
  console.log('=== FIX 1: Actualizando video_urls ===');
  for (const { id, url } of VIDEO_UPDATES) {
    const r = await api('PATCH', `semanas?id=eq.${id}`, { video_url: url });
    const ok = r.status >= 200 && r.status < 300;
    console.log(`Semana ${id.substring(0, 10)}...: status=${r.status} ${ok ? 'OK' : 'ERR:' + r.body}`);
  }

  // FIX 2: Insert quiz questions
  console.log('\n=== FIX 2: Insertando quiz_semana (3 preguntas x 8 semanas) ===');
  let total = 0;
  for (const { semana_id, preguntas } of QUIZZES) {
    let okCount = 0;
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      const qid = require('crypto').randomUUID();
      const r = await api('POST', 'quiz_semana', {
        id: qid,
        semana_id,
        pregunta: p.p,
        opcion_a: p.a,
        opcion_b: p.b,
        opcion_c: p.c,
        respuesta_correcta: p.r,
        explicacion: p.e,
        orden: i + 1,
      });
      if (r.status >= 200 && r.status < 300) { okCount++; total++; }
      else console.log(`  ERR p${i + 1}: status=${r.status} ${r.body.substring(0, 100)}`);
    }
    console.log(`Semana ${semana_id.substring(0, 10)}: ${okCount}/3 OK`);
  }
  console.log(`\nTotal quiz insertadas: ${total}/24`);
}

run().catch(console.error);
