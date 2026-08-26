# INSTRUCCIONES PARA DESPLEGAR PLATAFORMA A NUEVO CLIENTE

## Datos que necesito del cliente:

1. **Nombre de la escuela:** (ejemplo: "Bachillerato Virtual Monterrey")
2. **Email de contacto:** (ejemplo: contacto@escuela.com)
3. **Teléfono:** (opcional)
4. **Logo:** SVG o **PNG con transparencia** (canal alfa), mín. 200x80px.
   No aceptar JPG ni PNG con fondo blanco plano: al pasar por `/_next/image` se
   degrada y aparece como un recuadro blanco sobre los fondos oscuros.
5. **Isotipo para el favicon:** SVG o PNG con transparencia, cuadrado.
   Si no lo mandan, la pestaña se queda con el hexágono genérico MEV.
6. **Colores de marca:** (color primario y secundario en hexadecimal, o enviar el logo y yo elijo colores que combinen)
7. **Tagline:** (frase corta, ejemplo: "Tu futuro comienza aquí") o usar el default
8. **Dominio:** (ejemplo: bachilleratovirtual.mx) si ya lo tiene, o usar el de Vercel
9. **Planes y precios:** ¿Mismos planes que la plantilla (24, 6, 3 meses) con otros precios? ¿O planes diferentes?
10. **Datos del administrador:** nombre completo y email del admin de la escuela

## Pasos para desplegar:

### Paso 1: Clonar repositorio
- En GitHub, crear nuevo repositorio privado para el cliente
- Clonar la plantilla maestra: git clone [url-plantilla] [nombre-cliente]
- Subir al nuevo repositorio del cliente

### Paso 2: Crear Supabase del cliente
- Ir a supabase.com → New Project
- Nombre: [nombre-escuela]
- Región: South America (São Paulo)
- Guardar: Project URL, anon key, service_role key, database password

### Paso 3: Ejecutar schema de base de datos
- En Supabase SQL Editor del cliente, ejecutar `scripts/schema.sql` (schema canónico completo: tablas, RLS, funciones, triggers)
- Ejecutar los 6 archivos SEED de contenido académico
- Ejecutar los 2 archivos UPDATE-VIDEOS
- Ejecutar `scripts/seed-crear-evaluaciones.sql` (crea 1 evaluación por materia activa — Bug 21)
- Ejecutar `scripts/seed-evaluaciones-y-quiz.sql` (250 preguntas evaluaciones de materia, match por nombre)
- Ejecutar `scripts/seed-quiz-semanal-universal.sql` (576 preguntas quiz semanal: 12 mat prepa × 8 sem × 3 preg + 12 mat sec × 8 sem × 3 preg, distribución 6/6/6/6 a/b/c/d)

### Paso 4: Crear usuario admin
- En Supabase → Authentication → Add User → Create new user
- Email y password del admin del cliente
- Copiar el UUID
- En SQL Editor (rol en minúsculas — el CHECK de usuarios.rol solo acepta 'alumno' | 'admin' | 'secretario'):
  INSERT INTO usuarios (id, email, nombre, rol) VALUES ('UUID', 'email', 'nombre', 'admin') ON CONFLICT (id) DO UPDATE SET rol = 'admin';
- Las cuentas de staff adicionales (admin o secretario) se crean después desde la app en /admin/usuarios

### Paso 5: Crear planes de estudio
- En SQL Editor:
INSERT INTO planes_estudio (nombre, duracion_meses, precio_mensual, activo) VALUES
('Plan 24 meses - Completo', 24, [PRECIO], true),
('Plan 6 meses - Acelerado', 6, [PRECIO], true),
('Plan 3 meses - Intensivo', 3, [PRECIO], true);

### Paso 6: Personalizar la plataforma
- Modificar src/lib/config.ts con los datos del cliente:
  - nombre
  - slug
  - logoUrl (subir logo a Supabase Storage o usar URL externa)
  - colorPrimario
  - colorSecundario
  - contactoEmail
  - contactoTelefono
  - `colores.themeColor` — color de la barra del navegador en móvil. Por
    defecto sigue al fondo claro; si el cliente tiene landing/app oscura,
    ponerle su fondo oscuro.

- Reemplazar los assets de marca (ver `public/README.md`):
  - [ ] `public/logo.png` — logo del cliente (SVG/PNG con transparencia)
  - [ ] `public/favicon.svg` — **reemplazar el favicon con el logo del cliente
        (pedir SVG/PNG con transparencia)**. El que trae la plantilla es un
        hexágono genérico marcado como PLACEHOLDER dentro del propio SVG.

### Paso 7: Configurar variables de entorno
- Crear .env.local con las credenciales de Supabase del cliente

### Paso 8: Crear proyecto en Vercel
- Importar el repositorio del cliente en Vercel
- Agregar las 3 variables de entorno (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
- Framework: Next.js
- Deploy

### Paso 9: Configurar dominio (opcional)
- En Vercel → Settings → Domains → agregar dominio del cliente
- Configurar DNS del dominio apuntando a Vercel

### Paso 10: Configurar emails (recomendado)
- Crear cuenta en resend.com
- Verificar dominio del cliente
- En Supabase → Authentication → Settings → SMTP:
  - Host: smtp.resend.com
  - Port: 465
  - User: resend
  - Password: API key de Resend

### Paso 11: Prueba final
- Login como admin ✓
- Crear alumno de prueba ✓
- Desbloquear mes ✓
- Login como alumno ✓
- Ver contenido ✓
- Presentar examen ✓
- Ver calificaciones ✓
- Descargar constancia ✓
- Probar en móvil ✓

### Paso 12: Entrega al cliente (último paso)

Con el dominio definitivo ya conectado:

```bash
cp scripts/entrega/entrega.local.ejemplo.json entrega.local.json
# …llenar con los datos del cliente…
pnpm entrega
```

Produce `entrega/<NOMBRE>_Entrega_Oficial.pdf` y `entrega/ENTREGA-WHATSAPP.txt`,
con la marca y la paleta del cliente, y adaptados a las modalidades que contrató.
El mensaje también se imprime en la terminal listo para copiar y pegar.

Después:
- Enviar el PDF y el mensaje al cliente
- Capacitar al admin en: crear alumnos, registrar pagos, ver reportes

Ver `scripts/entrega/README.md`. El comando **aborta si el dominio todavía es
provisional** — un documento oficial no se emite con una URL temporal.

## Tiempo estimado por cliente: 1-2 horas
