-- Seguimiento Control Escolar: marcar si ya se contactó al alumno (inscripción pendiente).
ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS contactado_whatsapp BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.alumnos.contactado_whatsapp IS 'true si Control Escolar ya contactó por WhatsApp al alumno pendiente de pago.';
