import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.storage.createBucket('documentos', {
  public: false,
  fileSizeLimit: 10485760,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
})

if (error) {
  if (error.message?.includes('already exists')) {
    console.log('✓ Bucket "documentos" ya existe')
  } else {
    console.error('✗ Error:', error.message)
    process.exit(1)
  }
} else {
  console.log('✓ Bucket "documentos" creado:', data)
}
