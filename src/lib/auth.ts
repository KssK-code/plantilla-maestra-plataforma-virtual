/**
 * IVS Virtual — Helpers de autenticación
 * Funciones reutilizables para sign-up, sign-in, sign-out y obtener el usuario.
 */

import { createClient } from '@/lib/supabase/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SignUpData {
  nombre:           string
  apellidoPaterno:  string
  apellidoMaterno:  string
  email:            string
  password:         string
  telefono:         string
  nivel:            'secundaria' | 'preparatoria'
  modalidad:        '6_meses' | '3_meses'
  esSindicalizado:  boolean
  sindicato?:       string | null
}

export interface PerfilCompleto {
  id:         string
  email:      string
  nombre:     string
  apellidos:  string
  telefono:   string
  foto_url:   string | null
  rol:        string
  alumno?: {
    matricula:           string
    nivel:               string
    modalidad:           string
    es_sindicalizado:    boolean
    sindicato:           string | null
    inscripcion_pagada:  boolean
    meses_desbloqueados: number
    activo:              boolean
  } | null
}

// ─── signUp ───────────────────────────────────────────────────────────────────

export async function signUp(data: SignUpData): Promise<{ error: string | null }> {
  const supabase = createClient()
  const apellidos = `${data.apellidoPaterno.trim()} ${data.apellidoMaterno.trim()}`.trim()

  const { error: authError } = await supabase.auth.signUp({
    email:    data.email.trim(),
    password: data.password,
    options: {
      data: {
        nombre:    data.nombre.trim(),
        apellidos,
        rol:       'alumno',
      },
    },
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      return { error: 'Ya existe una cuenta con ese correo.' }
    }
    return { error: authError.message }
  }

  // Completar perfil en DB
  const res = await fetch('/api/auth/register-complete', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      nombre:           data.nombre.trim(),
      apellidos,
      telefono:         data.telefono.trim(),
      nivel:            data.nivel,
      modalidad:        data.modalidad,
      es_sindicalizado: data.esSindicalizado,
      sindicato:        data.esSindicalizado ? (data.sindicato ?? null) : null,
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: json.error ?? 'Error al crear el perfil.' }
  }

  return { error: null }
}

// ─── signIn ───────────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string,
): Promise<{ role: string | null; error: string | null }> {
  const supabase = createClient()

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    return { role: null, error: 'Correo o contraseña incorrectos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, error: 'No se pudo obtener la sesión.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  return { role: usuario?.rol ?? 'alumno', error: null }
}

// ─── signOut ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

// ─── getUser ──────────────────────────────────────────────────────────────────

export async function getUser(): Promise<PerfilCompleto | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('usuarios')
    .select(`
      id, email, nombre, apellidos, telefono, foto_url, rol,
      alumno:alumnos (
        matricula, nivel, modalidad, es_sindicalizado, sindicato,
        inscripcion_pagada, meses_desbloqueados, activo
      )
    `)
    .eq('id', user.id)
    .single()

  if (!perfil) return null

  return {
    ...perfil,
    alumno: Array.isArray(perfil.alumno) ? (perfil.alumno[0] ?? null) : (perfil.alumno ?? null),
  } as PerfilCompleto
}
