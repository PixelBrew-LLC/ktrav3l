# KTravel - Sistema de Reservas de Citas

Sistema completo de gestión de citas/reservas con backend en Go y frontend en Next.js.

## 🚀 Características

### Para Clientes
- ✅ Crear reservas sin registro
- ✅ Selección de fecha y hora disponible
- ✅ Subida de comprobante de pago (imagen o PDF)
- ✅ Consulta de estado con código UUID corto
- ✅ Notificaciones por email (confirmación, aprobación, rechazo)
- ✅ Formato de teléfono automático (###-###-####)

### Para Administradores
- ✅ Panel de administración con autenticación
- ✅ Dashboard con estadísticas
- ✅ Vista de calendario con estados visuales
- ✅ Tabla de citas con filtros y ordenamiento
- ✅ Aprobar, rechazar, mover o completar citas
- ✅ Contacto directo: WhatsApp, Email, Teléfono
- ✅ Gestión de tipos de cita (crear, ocultar/mostrar)
- ✅ Reglas de disponibilidad por día y horario
- ✅ Ver comprobantes de pago

## 📋 Requisitos

- Go 1.24+
- PostgreSQL
- Node.js 18+
- pnpm

## 🔧 Configuración

### Backend (Go)

1. Navega al directorio del backend:
```bash
cd ktrav3l_backend
```

2. Configura las variables de entorno en `.env`:
```env
# SERVER
PORT=3000

# DATABASE
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=ktrav3l_db
DB_PORT=5432

# JWT
JWT_SECRET=tu_secret_jwt_seguro

# FILE STORAGE
UPLOADS_PATH=./uploads

# EMAIL SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=tu-email@gmail.com
SMTP_FROM_NAME=KTravel

# FRONTEND URL
FRONTEND_URL=http://localhost:3001
```

**Nota importante para Gmail:**
- Ve a https://myaccount.google.com/apppasswords
- Genera una "App Password" para la aplicación
- Usa esa contraseña en `SMTP_PASSWORD` (no tu contraseña normal)

3. Instala dependencias:
```bash
go mod tidy
```

4. Crea la base de datos en PostgreSQL:
```sql
CREATE DATABASE ktrav3l_db;
```

5. Ejecuta el backend (creará las tablas automáticamente):
```bash
go run cmd/api/main.go
```

O usa el Makefile:
```bash
cd ..
make run
```

6. Inserta tipos de cita iniciales (en PostgreSQL):
```sql
INSERT INTO appointment_types (name, visible, created_at, updated_at) VALUES 
('Residencia de Italia', true, NOW(), NOW()),
('Visado de España', true, NOW(), NOW()),
('Pasaporte', true, NOW(), NOW());
```

7. Crea un usuario administrador:
```bash
# Desde PostgreSQL o usa el endpoint /sign-up
curl -X POST http://localhost:3000/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ktravel.com","password":"tu_password_seguro"}'
```

### Frontend (Next.js)

1. Navega al directorio del frontend:
```bash
cd ktrav3l_frontend
```

2. Instala dependencias:
```bash
pnpm install
```

3. Configura el archivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Ejecuta el frontend:
```bash
pnpm dev
```

El frontend estará disponible en `http://localhost:3001`

## 📁 Estructura del Proyecto

```
ktrav3l/
├── ktrav3l_backend/          # Backend en Go
│   ├── cmd/api/              # Punto de entrada
│   ├── config/               # Configuración
│   ├── controllers/          # Controladores
│   ├── initializers/         # Inicializadores (DB, ENV)
│   ├── middleware/           # Middleware de autenticación
│   ├── models/               # Modelos de datos
│   ├── services/             # Servicios (Email)
│   ├── utils/                # Utilidades
│   └── uploads/              # Archivos subidos
│
└── ktrav3l_frontend/         # Frontend en Next.js
    ├── app/                  # Páginas
    │   ├── page.tsx          # Página principal (reservas)
    │   ├── status/           # Consulta de estado
    │   └── admin/            # Panel de administración
    │       ├── login/        # Login
    │       ├── dashboard/    # Dashboard
    │       ├── calendar/     # Calendario
    │       ├── appointments/ # Tabla de citas
    │       ├── appointment-types/  # Tipos de cita
    │       └── availability/ # Reglas de disponibilidad
    ├── components/ui/        # Componentes de shadcn/ui
    └── lib/                  # Utilidades (API client)
```

## 🎨 Rutas de la Aplicación

### Públicas
- `/` - Página de reservas
- `/status` - Consultar estado de reserva

### Admin (requiere autenticación)
- `/admin/login` - Login de administrador
- `/admin/dashboard` - Panel principal
- `/admin/calendar` - Vista de calendario
- `/admin/appointments` - Tabla de todas las citas
- `/admin/appointment-types` - Gestión de tipos de cita
- `/admin/availability` - Reglas de disponibilidad

## 🔌 API Endpoints

### Públicos
- `GET /ping` - Health check
- `POST /sign-up` - Registro de usuario
- `POST /sign-in` - Inicio de sesión
- `POST /appointments` - Crear cita
- `GET /appointments/short/:shortID` - Consultar cita por código
- `GET /appointments/receipt/:shortID` - Ver comprobante
- `GET /appointments/available-hours?date=YYYY-MM-DD` - Horas disponibles
- `GET /appointments/types` - Tipos de cita visibles

### Admin (requiere token JWT)
- `GET /admin/appointments` - Listar todas las citas
- `GET /admin/appointments/:id` - Detalle de cita
- `POST /admin/appointments/:id/approve` - Aprobar cita
- `POST /admin/appointments/:id/reject` - Rechazar cita (requiere reason)
- `POST /admin/appointments/:id/done` - Marcar como completada
- `PATCH /admin/appointments/:id/move` - Mover cita (requiere newDate, newHour)
- `GET /admin/calendar?month=YYYY-MM` - Datos del calendario
- `GET /admin/appointment-types` - Todos los tipos
- `POST /admin/appointment-types` - Crear tipo
- `PATCH /admin/appointment-types/:id/visibility` - Cambiar visibilidad
- `GET /admin/availability-rules` - Listar reglas
- `POST /admin/availability-rules` - Crear regla
- `DELETE /admin/availability-rules/:id` - Eliminar regla

## 💡 Uso

### Como Cliente

1. Ve a la página principal
2. Selecciona fecha y hora disponible
3. Completa tus datos
4. Sube el comprobante de pago
5. Recibirás un código de reserva por email
6. Consulta el estado con tu código en cualquier momento

### Como Administrador

1. Inicia sesión en `/admin/login`
2. Desde el dashboard, puedes:
   - Ver estadísticas generales
   - Navegar al calendario para ver citas por fecha
   - Usar la tabla para gestionar todas las citas
   - Contactar clientes por WhatsApp, Email o Teléfono
   - Aprobar, rechazar o mover citas
   - Gestionar tipos de cita
   - Configurar horarios bloqueados

#### Contacto con Clientes

- **WhatsApp**: Abre chat directo con mensaje predefinido
- **Email**: Abre cliente de email con dirección del cliente
- **Teléfono**: Inicia llamada directa (formato +1 (###) ###-####)

#### Estados de Citas

- **Pending (Pendiente)**: Recién creada, esperando aprobación
- **Approved (Aprobada)**: Confirmada, cliente notificado
- **Rejected (Rechazada)**: No aprobada, horario liberado
- **Done (Completada)**: Cita finalizada, no se puede modificar

## 🎨 Paleta de Colores

El proyecto usa el tema **Blue** de shadcn/ui:

- Primary: Blue (#2563eb)
- Estados:
  - Pending: Yellow (#eab308)
  - Approved: Green (#10b981)
  - Rejected: Red (#ef4444)
  - Done: Blue (#3b82f6)

## 📝 Notas Importantes

1. Los domingos están deshabilitados por defecto para reservas
2. El horario de operación es de 9:00 AM a 5:00 PM
3. Cada cita dura 1 hora
4. Los comprobantes se guardan en `./uploads` (crear este directorio)
5. Los emails son HTML responsivos con el branding de KTravel
6. Las citas rechazadas liberan el horario para nuevas reservas
7. Las citas completadas (Done) no se pueden modificar

## 🔒 Seguridad

- JWT para autenticación de admin
- CORS configurado
- Validación de tipos de archivo (JPG, PNG, PDF)
- Sanitización de inputs
- Protección de rutas en frontend

## 🐛 Solución de Problemas

### El backend no inicia
- Verifica que PostgreSQL esté corriendo
- Confirma las credenciales en `.env`
- Revisa que el puerto 3000 esté libre

### No llegan los emails
- Verifica tu App Password de Gmail
- Confirma que SMTP_USER y SMTP_PASSWORD sean correctos
- Revisa la consola para errores de SMTP

### El frontend no se conecta al backend
- Verifica que NEXT_PUBLIC_API_URL sea correcto
- Confirma que el backend esté corriendo
- Revisa la consola del navegador para errores CORS

## 🚀 Producción

### Backend
1. Configura variables de entorno de producción
2. Usa un servicio de PostgreSQL en la nube
3. Configura CORS para tu dominio
4. Usa HTTPS
5. Configura un servicio de almacenamiento para uploads (AWS S3, etc.)

### Frontend
1. Build de producción: `pnpm build`
2. Deploy en Vercel/Netlify
3. Configura NEXT_PUBLIC_API_URL con tu API de producción

## 📄 Licencia

Desarrollado para KTravel por Pixel Brew LLC.

---
