-- ============================================================
-- EDVEX Academy — Columnas para pagos Stripe en tabla alumnos
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS modulos_desbloqueados JSONB NOT NULL DEFAULT '[]';
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS inscripcion_pagada BOOLEAN NOT NULL DEFAULT false;
