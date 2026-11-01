# 🌱 Cozy Life

> *Un poquito cada día hace crecer tu mundo.*

**Cozy Life** es una app web de productividad sin presión. Reúne tareas, calendario, hábitos, estadísticas y notas en un solo lugar, con un tono amable y una capa de gamificación: cada cosa que completas da experiencia (XP) y hace crecer tu jardín.

Muchas apps de productividad se sienten como un jefe exigente, con listas infinitas y números en rojo. Cozy Life propone lo contrario: acompañar tu progreso sin medir tu valor.

🔗 **Demo en vivo:** [cozy-life-productivi-l4nm.bolt.host](https://cozy-life-productivi-l4nm.bolt.host/)

---

## 📸 Capturas

| Mi espacio | Mis tareas |
| --- | --- |
| ![Mi espacio](docs/screenshots/mi-espacio.png) | ![Mis tareas](docs/screenshots/tareas.png) |

| Calendario | Hábitos |
| --- | --- |
| ![Calendario](docs/screenshots/calendario.png) | ![Hábitos](docs/screenshots/habitos.png) |

| Estadísticas | Notas |
| --- | --- |
| ![Estadísticas](docs/screenshots/estadisticas.png) | ![Notas](docs/screenshots/notas.png) |

---

## ✨ Funciones

### 🏡 Mi espacio
- Saludo personalizado según la hora del día y frase motivacional
- Mascota con mensajes de ánimo
- Indicadores del día: tareas pendientes, completadas, que necesitan atención y progreso (%)
- Lista de lo que necesita atención, ordenada por prioridad
- Agenda de hoy en línea de tiempo

### ✅ Mis tareas
- Crear, editar, completar y eliminar tareas
- Buscar por nombre y filtrar por categoría
- Categoría, fecha, prioridad (Alta / Media) y tiempo estimado por tarea
- Contador de pendientes en el menú lateral

### 📅 Calendario
- Vista mensual con navegación entre meses y botón **Hoy**
- Tareas mostradas en su día
- Añadir actividades directamente desde el calendario

### 🌿 Hábitos
- Crear hábitos con frecuencia
- Marcar el hábito del día y llevar la racha
- Seguimiento semanal de lunes a domingo

### 📊 Estadísticas
- Tareas completadas por día de la semana
- Tiempo invertido por categoría (Personal, Estudio, Bienestar)
- **Reflexión semanal:** ventana emergente para escribir qué lograste, qué fue difícil, qué aprendiste y tu prioridad para la siguiente semana

### 📝 Notas
- Notas tipo post-it con categoría, título, contenido y fecha
- Editar y eliminar desde el menú de cada nota (con confirmación)

### 🌸 Gamificación y perfil
- Niveles que empiezan en **Nivel 1 · Pequeño brote**
- Experiencia (XP) por completar tareas y hábitos
- Jardín con 6 etapas: semilla → brote → planta pequeña → planta desarrollada → planta floreciendo → jardín florecido
- Panel de notificaciones con recordatorios de tareas y hábitos
- Avatar de color sólido, elegible entre una paleta de 12 colores

---

## 🛠️ Tecnologías

<!-- Verifica y ajusta esta lista con tu package.json -->
- Construido con **[Bolt](https://bolt.new)** mediante vibe coding
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- Base de datos y autenticación: `[completar: p. ej. Supabase]`
- Tipografías: Playfair Display (títulos) y DM Sans (texto)

---

## 🚀 Cómo correrlo en local

**Requisitos:** [Node.js](https://nodejs.org/) 18 o superior.

```bash
# 1. Clona el repositorio
git clone https://github.com/[tu-usuario]/cozy-life.git
cd cozy-life

# 2. Instala las dependencias
npm install

# 3. Crea tu archivo de variables de entorno (si el proyecto usa base de datos)
cp .env.example .env
# y llena las claves necesarias

# 4. Inicia el servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

> ⚠️ Nunca subas tu archivo `.env` con claves reales a GitHub. Verifica que esté incluido en `.gitignore`.

---

## 🐞 Errores corregidos

Durante el desarrollo probé cada función y corregí los errores con ayuda de IA:

| Error | Solución |
| --- | --- |
| Un hábito marcado en viernes se registraba en lunes | Uso de la fecha local y orden de semana lunes-domingo |
| Los usuarios nuevos empezaban en el nivel 3 | Nivel inicial 1 con 0 XP; el nivel se calcula a partir del XP |
| Botones decorativos (menú del perfil, campana, Añadir reflexión) | Cada botón ahora ejecuta una acción real |
| La barra del jardín se llenaba sin consecuencia | Al llegar al 100% se desbloquea una nueva etapa y la barra se reinicia |
| "Mi espacio" y la ruta de navegación no llevaban al inicio | Enlaces corregidos hacia la página principal |
| Las notas no se podían editar ni eliminar | Menú de opciones en cada nota |

---

## 💡 Lo que aprendí

- La IA construye rápido, pero hay que **probar cada botón**: muchos errores son silenciosos y no aparecen en la consola.
- Un buen reporte de error dice **qué hice, qué esperaba y qué pasó**.
- Pedirle a la IA que explique el código corregido me ayudó a entender cómo funciona mi propia app.

---

## 🗺️ Próximas mejoras

- [ ] Modo oscuro
- [ ] Diseño responsive con navegación inferior en celular
}
---

## 👩‍💻 Autora

**Mariana Carrión**, estudiante de Ingeniería Biomédica


Proyecto creado para el curso de Vibe Coding + IA, 2026.
