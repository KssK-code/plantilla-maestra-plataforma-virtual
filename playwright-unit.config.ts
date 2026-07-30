import { defineConfig } from '@playwright/test'

/**
 * Config APARTE para pruebas unitarias puras (sin navegador, sin servidor y sin
 * base de datos).
 *
 * No reutiliza playwright.config.ts a propósito: aquélla tiene `globalSetup` que
 * siembra fixtures contra un Supabase real y un `webServer` que levanta
 * `pnpm start`. Las pruebas de esta config deben poder correr en cualquier parte
 * — incluido CI sin credenciales — porque verifican un invariante de SEGURIDAD
 * que no debe depender de tener infraestructura a mano.
 *
 *   pnpm test:unit
 */
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results-unit',
})
