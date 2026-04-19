import { createClient } from '@supabase/supabase-js'

const edvex = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { error: e1 } = await edvex.from('materias').select('nombre_en').limit(1)
const { error: e2 } = await edvex.from('semanas').select('url_en').limit(1)

const materiasOk = !e1 || !e1.message.includes('nombre_en')
const semanasOk  = !e2 || !e2.message.includes('url_en')

if (materiasOk && semanasOk) {
  console.log('COLUMNS_OK')
} else {
  if (!materiasOk) console.log('MISSING:materias')
  if (!semanasOk)  console.log('MISSING:semanas')
}
