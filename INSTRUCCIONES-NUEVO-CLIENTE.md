# INSTRUCCIONES PARA DESPLEGAR PLATAFORMA A NUEVO CLIENTE

## Datos que necesito del cliente:

1. **Nombre de la escuela:** (ejemplo: "Bachillerato Virtual Monterrey")
2. **Email de contacto:** (ejemplo: contacto@escuela.com)
3. **Teléfono:** (opcional)
4. **Logo:** (archivo PNG o URL del logo)
5. **Colores de marca:** (color primario y secundario en hexadecimal, o enviar el logo y yo elijo colores que combinen)
6. **Tagline:** (frase corta, ejemplo: "Tu futuro comienza aquí") o usar el default
7. **Dominio:** (ejemplo: bachilleratovirtual.mx) si ya lo tiene, o usar el de Vercel
8. **Planes y precios:** ¿Mismos planes que la plantilla (24, 6, 3 meses) con otros precios? ¿O planes diferentes?
9. **Datos del administrador:** nombre completo y email del admin de la escuela

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
- En Supabase SQL Editor del cliente, ejecutar SUPABASE-SCHEMA.sql
- Ejecutar los 6 archivos SEED de contenido académico
- Ejecutar los 2 archivos UPDATE-VIDEOS

### Paso 4: Crear usuario admin
- En Supabase → Authentication → Add User → Create new user
- Email y password del admin del cliente
- Copiar el UUID
- En SQL Editor: INSERT INTO usuarios (id, email, nombre_completo, rol, activo) VALUES ('UUID', 'email', 'nombre', 'ADMIN', true);

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

### Paso 12: Entrega al cliente
- Enviar URL de la plataforma
- Enviar credenciales del admin
- Capacitar al admin en: crear alumnos, registrar pagos, ver reportes

## Tiempo estimado por cliente: 1-2 horas
