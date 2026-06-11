# 🌟 LUMINA — Contexto Completo del Proyecto

## 1. Descripción General

**Lumina** es una aplicación web de gestión interna para **Assotea**, una fundación/asociación que trabaja con familias y pacientes (principalmente niños con necesidades especiales, como autismo). La app sustituye a un antiguo sistema PHP (`c:\xampp\htdocs\Lumina-app`) por una plataforma moderna **React + Node.js + Prisma + MySQL**.

La app gestiona: socios (tutores/padres), pacientes (beneficiarios/hijos), actividades, empleados (RRHH), profesionales externos, inventario, subvenciones, delegaciones (sedes), y un sistema completo de roles y permisos con RBAC.

---

## 2. Arquitectura y Stack Tecnológico

### Frontend (`c:\xampp\htdocs\lumina-app-react`)
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2 | Framework UI |
| React Router DOM | 7.x | Routing SPA |
| Zustand | 5.x | Estado global (auth/sesión) |
| Axios | 1.x | HTTP client para API calls |
| TailwindCSS | 3.4 | Estilos (utility-first) |
| Lucide React | 0.575 | Iconos |
| SweetAlert2 | 11.x | Modales de confirmación/feedback |
| Recharts | 3.x | Gráficos en el Dashboard |

- **Arranque**: `npm start` (react-scripts, puerto `3000`)
- **Build**: `npm run build`

### Backend (`c:\xampp\htdocs\lumina-api`)
| Tecnología | Versión | Uso |
|---|---|---|
| Express | 5.x | Framework HTTP |
| Prisma Client | 5.22 | ORM para MySQL |
| bcryptjs | 3.x | Hashing de contraseñas |
| jsonwebtoken | 9.x | JWT para auth |
| multer | 2.x | Upload de archivos |
| node-cron | 4.x | Tareas programadas |
| nodemailer | 8.x | Envío de emails (avisadorde subvenciones) |

- **Arranque**: `npm run dev` (nodemon, puerto `4001`)
- **Producción**: `npm start`

### Base de Datos
- **Motor**: MySQL (XAMPP, puerto `3306`)
- **Base de datos**: `lumina_v2`
- **Conexión**: `mysql://root@127.0.0.1:3306/lumina_v2`
- **Sin contraseña** para root (entorno local XAMPP)
- **ORM**: Prisma (`npx prisma db push` para sincronizar schema)

### Variables de Entorno (`lumina-api/.env`)
```env
PORT=4001
DATABASE_URL="mysql://root@127.0.0.1:3306/lumina_v2"
JWT_SECRET="lumina-secret-key-2026"
```

---

## 3. Estructura de Carpetas

```
c:\xampp\htdocs\
├── lumina-api/                    # Backend Node.js
│   ├── index.js                   # Entry point (Express server, CORS, routes, cron)
│   ├── .env                       # Variables de entorno
│   ├── prisma/
│   │   └── schema.prisma          # Esquema completo de la BBDD
│   ├── routes/
│   │   ├── auth.js                # POST /login, POST /register
│   │   ├── socios.js              # CRUD socios + /pending + /contacted
│   │   ├── usuarios.js            # CRUD usuarios del sistema
│   │   ├── roles.js               # CRUD roles + permisos + módulos
│   │   ├── profile.js             # GET/PUT perfil del usuario logueado
│   │   ├── dashboard.js           # GET estadísticas para dashboard
│   │   ├── pacientes.js           # CRUD pacientes (hijos de socios)
│   │   ├── documents.js           # Upload/download de documentos
│   │   ├── delegaciones.js        # CRUD delegaciones (sedes)
│   │   ├── subvenciones.js        # CRUD subvenciones
│   │   ├── inventario.js          # CRUD inventario
│   │   ├── actividades.js         # CRUD actividades + enroll/unenroll
│   │   ├── workers.js             # CRUD empleados (RRHH)
│   │   └── external_professionals.js  # CRUD profesionales externos
│   ├── middleware/
│   │   └── authMiddleware.js      # verifyToken (JWT validation)
│   └── uploads/                   # Archivos subidos (docs, fotos)
│
├── lumina-app-react/              # Frontend React
│   ├── public/
│   │   ├── Logo_alt.png           # Logo de la app
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.js                 # Router principal con todas las rutas
│   │   ├── index.js               # Entry point React
│   │   ├── index.css              # Estilos globales + Tailwind
│   │   ├── store/
│   │   │   └── authStore.js       # Zustand store (auth + permissions)
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx     # Sidebar + Header + Outlet
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Pantalla de login
│   │   │   ├── Register.jsx       # Registro público de nuevos socios
│   │   │   ├── Dashboard.jsx      # Panel de control admin/worker
│   │   │   ├── Socios.jsx         # Gestión de Socios (lista + CRUD)
│   │   │   ├── Actividades.jsx    # Actividades (admin/socio view)
│   │   │   ├── AdminListaEspera.jsx # Lista de espera de nuevos socios
│   │   │   ├── ListaEspera.jsx    # Vista del socio pendiente
│   │   │   ├── Usuarios.jsx       # Gestión de usuarios del sistema
│   │   │   ├── RolesPermisos.jsx  # Gestión de roles y permisos
│   │   │   ├── RecursosHumanos.jsx # Empleados (RRHH)
│   │   │   ├── ProfesionalesExternos.jsx # Colaboradores externos
│   │   │   ├── Inventario.jsx     # Gestión de inventario
│   │   │   ├── Subvenciones.jsx   # Subvenciones/grants
│   │   │   ├── Delegaciones.jsx   # Sedes/delegaciones
│   │   │   ├── MisPacientes.jsx   # Vista pacientes del socio
│   │   │   ├── MisDocumentos.jsx  # Documentos del socio
│   │   │   └── Perfil.jsx         # Perfil del usuario
│   │   └── components/
│   │       ├── Button.jsx         # Componente botón base
│   │       ├── Card.jsx           # Componente card base
│   │       ├── Input.jsx          # Componente input base
│   │       ├── ProtectedRoute.jsx # HOC de protección de rutas
│   │       ├── socios/
│   │       │   ├── CreateSocioModal.jsx
│   │       │   ├── SocioDetailModal.jsx
│   │       │   ├── PatientModal.jsx
│   │       │   └── PatientDetailModal.jsx
│   │       ├── actividades/
│   │       │   ├── CreateActivityModal.jsx
│   │       │   ├── ActivityDetailModal.jsx
│   │       │   └── ActivityEnrolledModal.jsx
│   │       ├── usuarios/          # UserModal.jsx, UserProfileModal.jsx
│   │       ├── roles/             # Modales de roles y permisos
│   │       ├── rrhh/              # Modales de RRHH
│   │       ├── profesionales/     # Modales de profesionales
│   │       ├── inventario/        # Modales de inventario
│   │       ├── delegaciones/      # Modales de delegaciones
│   │       └── subvenciones/      # Modales de subvenciones
│   └── tailwind.config.js
```

---

## 4. Modelo de Base de Datos (Prisma Schema)

### Modelos Principales

| Modelo | Descripción | Clave |
|---|---|---|
| **User** | Cuentas de acceso (admin, worker, socio) | `id` (UUID), `role` enum (ADMIN/WORKER/SOCIO), linked to `AppRole` |
| **Socio** | Socios/tutores (padres) | `id` (auto-int), `memberCode` (SOC-00001), `status` (PENDING/ACTIVE/INACTIVE), `contactedAt` |
| **Patient** | Pacientes/beneficiarios (hijos) | `id` (UUID), linked to `Socio`, datos médicos y educativos |
| **Activity** | Actividades/sesiones | `id` (UUID), many-to-many con Socio y Patient |
| **Worker** | Empleados (RRHH) | `id` (UUID), datos laborales, documentos |
| **ExternalProfessional** | Colaboradores externos | `id` (UUID), especialidad, tarifa |
| **InventoryItem** | Items de inventario | `id` (UUID), tipo, estado, asignación sede/domicilio |
| **Delegation** | Sedes/delegaciones | `id` (auto-int), nombre, color |
| **Subvencion** | Subvenciones/grants | `id` (UUID), estado, fecha límite, documento justificación |

### Sistema de Roles y Permisos (RBAC)

| Modelo | Descripción |
|---|---|
| **AppRole** | Roles dinámicos (Administrador, Junta Plus, Junta Directiva, Jefe de Personal, Socio, Postulador) |
| **Module** | Módulos de la app (socios, usuarios, actividades, etc) |
| **Permission** | Tabla pivote: `roleId` × `moduleId` → `canView`, `canCreate`, `canEdit`, `canDelete` |

### Relaciones Clave
- `User` → `Socio` (1:1, via `socioId`) — Un socio tiene una cuenta de usuario para login
- `Socio` → `Patient[]` (1:N) — Un socio puede tener varios pacientes
- `User` → `AppRole` (N:1, via `appRoleId`) — Un usuario tiene un rol de aplicación
- `Activity` ↔ `Socio[]` (N:M) — Socios se inscriben en actividades
- `Activity` ↔ `Patient[]` (N:M) — Pacientes asociados a actividades
- `InventoryItem` → `Delegation` (N:1) — Items asignados a sedes
- `Subvencion` → `Delegation` (N:1) — Subvenciones por delegación

### Enums
```
Role: ADMIN | WORKER | SOCIO
Status: PENDING | ACTIVE | INACTIVE
SubvencionStatus: SOLICITADO | CONCEDIDO | JUSTIFICADO | EN_ORDEN | EN_FECHA
InventoryStatus: DISPONIBLE | EN_USO | MANTENIMIENTO | BAJA
AssignmentType: SEDE | DOMICILIO
```

---

## 5. API Endpoints

Todas las rutas protegidas requieren header `Authorization: Bearer <JWT>`.  
Base URL: `http://127.0.0.1:4001`

### Auth (`/api/auth`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Login con username/password → devuelve JWT + user data con permisos |
| POST | `/register` | Registro público de nuevo socio (status=PENDING) + crea User + Patient |

### Socios (`/api/socios`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista todos los socios NO pendientes con pacientes |
| GET | `/pending` | Lista socios pendientes (lista de espera) |
| POST | `/` | Crear nuevo socio + user account |
| PUT | `/:id` | Actualizar socio (sincroniza datos con User) |
| DELETE | `/:id` | Eliminar socio + user vinculado |
| PATCH | `/:id/status` | Cambiar estado (PENDING→ACTIVE, etc). Promueve/degrada AppRole |
| PATCH | `/:id/contacted` | Marcar como contactado (guarda timestamp) |

### Usuarios (`/api/usuarios`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista usuarios (excluye SOCIO), incluye appRole |
| POST | `/` | Crear usuario con appRoleId |
| PUT | `/:id` | Actualizar usuario |
| DELETE | `/:id` | Eliminar usuario |

### Roles (`/api/roles`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista todos los AppRoles con conteos |
| POST | `/` | Crear nuevo rol |
| PUT | `/:id` | Actualizar rol |
| DELETE | `/:id` | Eliminar rol (no system roles) |
| GET | `/modulos` | Lista todos los módulos registrados |
| GET | `/:id/permisos` | Permisos de un rol por módulo |
| PUT | `/:id/permisos` | Actualizar permisos de un rol |

### Actividades (`/api/actividades`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista todas + flag `isEnrolled` para el socio actual |
| GET | `/:id` | Detalle con socios y pacientes inscritos |
| POST | `/` | Crear actividad |
| PUT | `/:id` | Actualizar actividad |
| DELETE | `/:id` | Eliminar actividad |
| POST | `/:id/enroll` | Inscribir socio (verifica capacidad) |
| POST | `/:id/unenroll` | Desinscribir socio |

### Otros Endpoints
- `/api/pacientes` — CRUD pacientes
- `/api/documents` — Upload/download documentos
- `/api/delegaciones` — CRUD delegaciones
- `/api/subvenciones` — CRUD subvenciones + upload justificaciones
- `/api/inventario` — CRUD inventario
- `/api/workers` — CRUD empleados RRHH
- `/api/external-professionals` — CRUD profesionales externos
- `/api/profile` — GET/PUT perfil del usuario actual (incluye avatar base64)
- `/api/dashboard` — Estadísticas para el panel de control
- `/api/health` — Health check

---

## 6. Autenticación y Autorización

### Flujo de Login
1. El usuario envía `POST /api/auth/login` con `{username, password}`
2. El backend valida credenciales con bcrypt, busca el usuario con su `AppRole` y `Permissions`
3. Construye un JWT con: `{id, username, name, role, appRoleName, permissions, socioId, socioStatus}`
4. El frontend almacena el token en **sessionStorage** vía Zustand (`lumina-auth-storage`)

### Permisos (RBAC)
- El JWT lleva un mapa de `permissions` por módulo: `{ socios: { canView: true, canCreate: true, ... }, ... }`
- El frontend usa el hook `usePermissions()` de `authStore.js`:
  - `isAdmin` (role === 'ADMIN') → bypass total, puede hacer todo
  - `isSocio` (role === 'SOCIO') → muestra menú limitado
  - `canView(moduleSlug)` / `canCreate` / `canEdit` / `canDelete`
- Las rutas están protegidas por `<ProtectedRoute requiredModule="slug">` que verifica permisos

### Roles del Sistema (Enum `Role`)
| Rol | Descripción |
|---|---|
| `ADMIN` | Acceso total. Bypass de todos los permisos |
| `WORKER` | Empleado/trabajador. Acceso según AppRole asignado |
| `SOCIO` | Padre/tutor. Acceso limitado a sus pacientes, documentos y actividades |

### Roles Dinámicos (`AppRole`)
- **Administrador** — Control total (system role)
- **Junta Plus** — Permisos extendidos
- **Junta Directiva** — Acceso a socios e informes
- **Jefe de Personal** — Gestión de personal y usuarios
- **Socio** — Acceso limitado a perfil y servicios
- **Postulador** — Pendiente de aprobación

---

## 7. Flujo de Registro de Socios

1. Un nuevo padre/tutor accede a `/register` (ruta pública)
2. Rellena: nombre, teléfono, email, nombre del paciente, fecha nacimiento, username, password
3. El backend crea: `Socio` (status=PENDING) + `Patient` + `User` (role=SOCIO, appRole=Postulador)
4. Se genera `memberCode` automáticamente (SOC-00001, SOC-00002, …)
5. El socio queda en **Lista de Espera**
6. Un admin ve la solicitud en `/admin-espera` (AdminListaEspera.jsx)
7. El admin puede **contactar** al solicitante (registra `contactedAt` timestamp)
8. El admin puede **aprobar** la solicitud → status pasa a ACTIVE, role se promueve a "Socio"
9. El socio aprobado ahora ve el menú completo: Mis Pacientes, Mis Documentos, Actividades

---

## 8. Vistas por Tipo de Usuario

### Vista Admin/Worker
- **Panel de Control** (Dashboard): Estadísticas, gráficos, accesos rápidos
- **Gestión**: Socios, Inventario, Lista de Espera, Actividades
- **Recursos**: RRHH (empleados), Profesionales Externos
- **Administración**: Subvenciones, Seguros (en desarrollo), Delegaciones
- **Configuración**: Usuarios, Roles y Permisos

### Vista Socio (Activo)
- **Mis Pacientes**: Ver/gestionar a sus hijos
- **Mis Documentos**: Subir/ver documentos requeridos
- **Lista de Actividades**: Ver actividades disponibles, inscribirse/desinscribirse

### Vista Socio (Pendiente)
- **Lista de Espera**: Información sobre su estado
- **Mis Documentos**: Puede ir subiendo documentos mientras espera

---

## 9. Sidebar Dinámico (MainLayout.jsx)

El sidebar se construye dinámicamente según el rol:
- **Socio Pendiente** → Solo "Lista de espera" y "Mis documentos"
- **Socio Activo** → "Mis pacientes", "Mis documentos", "Lista de actividades"
- **Worker/Admin** → Menú completo agrupado en: GESTIÓN, RECURSOS, ADMINISTRACIÓN, CONFIGURACIÓN
  - Cada item se filtra con `canView(module)`. Si no tiene permiso, no aparece
  - El botón "Seguros" es un mock que lanza un alert "Módulo en desarrollo"

---

## 10. Tareas Programadas (Cron Jobs)

Se ejecuta diariamente a las 08:00 (`node-cron`):
- Busca subvenciones cuya `deadlineDate` caiga exactamente en 1 mes
- Si no están justificadas, envía un email de alerta a la delegación correspondiente
- SMTP configurable en `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`); sin configurar, los envíos quedan registrados en el log del servidor

---

## 11. Convenciones de Diseño

- **Estética premium**: Gradientes, glassmorphism, micro-animaciones, sombras sutiles
- **Tailwind CSS**: Utility-first, no hay CSS custom excepto el global `index.css`
- **Iconos**: Lucide React exclusivamente
- **Modales**: Todos los formularios de creación/edición usan modales con backdrop blur
- **Confirmaciones**: SweetAlert2 para todas las acciones destructivas y feedback
- **Nombres en MAYÚSCULAS**: Los nombres de socios y pacientes se muestran con clase `uppercase`
- **Tabla estilo Apple**: Headers con gradiente azul, hover con sombra y micro-desplazamiento
- **Colores del sistema**: Azul primario (`#6E9EFF` / blue-500), gradientes blue→indigo
- **Responsive**: Sidebar colapsable en móvil, tablas con scroll horizontal

---

## 12. Cómo Arrancar el Proyecto

### Requisitos Previos
1. **XAMPP** instalado y ejecutando Apache + MySQL
2. **Node.js** (v18+)
3. Base de datos `lumina_v2` creada en MySQL

### Arranque
```bash
# 1. Arrancar el Backend (puerto 4001)
cd c:\xampp\htdocs\lumina-api
npm run dev

# 2. Arrancar el Frontend (puerto 3000)
cd c:\xampp\htdocs\lumina-app-react
npm start

# 3. (Si es la primera vez) Sincronizar schema
cd c:\xampp\htdocs\lumina-api
npx prisma db push
```

### Credenciales por defecto
- **Admin**: username=`admin`, contraseña variada (revisar en BBDD)
- Los socios se registran vía `/register`

---

## 13. Notas Técnicas de Referencia

1. **API en frontend:** en producción las llamadas van a **`/api/...`** (mismo dominio). En local, CRA usa **`proxy`** en `package.json` hacia `http://localhost:4001`. Opcional: `REACT_APP_API_URL` en `MisPacientes.jsx`.
2. **El token JWT** se guarda en sessionStorage (se pierde al cerrar pestaña)
3. **Prisma** se usa sin migraciones formales; se usa `npx prisma db push` para sincronizar
4. **Archivos subidos:** `lumina-api/uploads/` (servidos en `/uploads/...`); legacy opcional `htdocs/uploads/`
5. **El sistema de Roles** tiene dos capas:
   - El enum `Role` (ADMIN/WORKER/SOCIO) es el rol base del sistema
   - El `AppRole` es el rol dinámico con permisos granulares por módulo
6. **El sidebar** filtra los items visibles dinámicamente según los permisos del JWT
7. **Los Socios con AppRole no definido** ven el menú específico de socio (sin sidebar admin)
8. **Las actividades** tienen vista dual: Admin ve CRUD completo + lista de inscritos; Socio ve cards simplificadas + puede inscribirse
9. **La lista de espera** tiene funcionalidad de tracking de contacto (`contactedAt`) con confirmación vía SweetAlert
10. **No hay tests automatizados** actualmente
11. **Despliegue producción:** ver `lumina-api/docs/DEPLOY-PRODUCTION.md` (Plesk **gassotea.org**, usuario `smunozassotea`, Node 16+)

---

## 14. Despliegue en Plesk (gassotea.org)

Sustituir todo en `httpdocs/lumina-api`: `npm run deploy:bundle` → subir sin `node_modules` → en servidor `npm install`, `prisma generate`, `prisma db push`, `node seed-demo-data.js` → reiniciar Node. Detalle: `lumina-api/docs/DEPLOY-PRODUCTION.md`.

---

## 15. Errores Comunes y Troubleshooting

Si al intentar arrancar el proyecto o desarrollar surge algún fallo, estos son los más típicos que hemos encontrado durante la construcción y cómo solucionarlos rápidadamente:

### ❌ Error: La app no conecta a la base de datos (`PrismaClientKnownRequestError: P1001` o `ECONNREFUSED`)
- **Qué pasa**: El backend de Node no logra comunicarse con MySQL por el puerto 3306.
- **Solución**: Abrir el Panel de Control de **XAMPP** y darle a "Start" en el módulo de **MySQL** (y Apache si fuera necesario para ficheros antiguos, aunque el backend nuevo no lo requiere estrictamente).

### ❌ Error: Puerto ocupado al hacer `npm start` o `npm run dev` (`EADDRINUSE`)
- **Qué pasa**: Intenta levantar React en el puerto `3000` o la API en el `4001` pero ya hay un proceso antiguo corriendo de fondo que no se cerró bien.
- **Solución**:
  - Matar el terminal activo cerrado abruptamente.
  - En Windows abrir el "Administrador de Tareas" y cerrar los procesos subyacentes de `node.exe`.
  - O en React, al darle a `npm start`, a veces te pregunta *"¿Quieres arrancar en otro puerto? (Y/N)"*, presionar "Y" para levantar en el `3001`.

### ❌ Error Prisma: `Unknown argument` o `Table ... does not exist`
- **Qué pasa**: Has editado el archivo `schema.prisma` añadiendo un campo nuevo (por ejemplo `contactedAt`) o una tabla, pero la BBDD en MySQL sigue teniendo la estructura antigua.
- **Solución**: Asegurarte de que MySQL está encendido en XAMPP, entrar en `lumina-api` en el terminal y ejecutar: `npx prisma db push`. Esto forzará que Prisma modifique la BBDD al segundo y todo vuelva a compilar.

### ❌ Error: Expulsarte de la sesión o página en blanco de golpe
- **Qué pasa**: El Token JWT almacenado tiene configurado un tiempo de espiración (`expiresIn: '24h'`) y acaba de volverse inválido, o el esquema del payload en zustand se corrompió tras modificar el authStore.
- **Solución**: Volver a iniciar sesión manualmente o borrar los datos del `sessionStorage` desde la pestaña Application / Inspector de elementos del navegador, ya que Zustand usa persistencia en sesión.

### ❌ Error: `Blocked by CORS policy` (Frontend consola)
- **Qué pasa**: Estás intentando llamar desde `http://localhost:3000` o la IP de tu red local hacia la API y Node la bloquea.
- **Solución**: En local, usar proxy CRA o API en `4001`. En producción, rutas `/api/...` y `CORS_ORIGIN` en `.env` si el front está en otro dominio.
