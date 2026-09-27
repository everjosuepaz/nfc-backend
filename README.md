# Backend de Souvenirs NFC

## 1. Configurar Supabase
1. Crea un proyecto en supabase.com.
2. Ve a **SQL Editor** y pega/ejecuta todo `schema.sql`. Esto crea las tablas `souvenirs` y `photos`, las políticas RLS y el bucket de Storage `souvenir-photos`.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → será tu `SUPABASE_URL`
   - `service_role` key (no la `anon` key) → será tu `SUPABASE_SERVICE_ROLE_KEY`

## 2. Configurar el proyecto local
```bash
npm install
cp .env.example .env
# Edita .env y pega tus valores reales de Supabase
```

## 3. Correr en local
```bash
npm run dev
# Servidor en http://localhost:3000
```

## 4. Probar los endpoints

**Simular el primer escaneo de un chip:**
```bash
curl http://localhost:3000/v/PARIS-00001
# -> { "status": "pending", ... }
```

**Activar el souvenir con fotos (usa fotos reales de tu computadora):**
```bash
curl -X POST http://localhost:3000/api/souvenirs/activate \
  -F "souvenir_id=PARIS-00001" \
  -F "title=Nuestra Luna de Miel" \
  -F "travel_date=2026-06-14" \
  -F "description=Siete días en París" \
  -F "photos=@/ruta/a/foto1.jpg" \
  -F "photos=@/ruta/a/foto2.jpg"
```

**Volver a consultar (ya debería estar 'active' con las fotos):**
```bash
curl http://localhost:3000/v/PARIS-00001
```

## 5. Desplegar
Funciona sin cambios en **Render** o **Vercel** (como función serverless con un pequeño wrapper, o como Web Service normal en Render). Solo configura las mismas variables de entorno (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BUCKET_NAME`) en el panel del proveedor — nunca las subas al repositorio.

## Siguiente paso sugerido
Conectar el HTML de la galería (el que ya tienes) para que:
- Llame a `GET /v/:souvenir_id` al cargar la página y decida si mostrar el formulario o la galería.
- El formulario de carga envíe un `POST` a `/api/souvenirs/activate` como `multipart/form-data`.
