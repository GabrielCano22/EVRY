# EVRY — Web App

Frontend Next.js 15 (App Router) + Tailwind. Mobile-first, dark mode por defecto, registro de sets en un pulgar.

## Stack

- **Next.js 15** + React 19 + TypeScript
- **Tailwind CSS** — design system propio
- **Zustand** — auth store ligero
- **Recharts** — gráficas de progreso
- **Zod** — validación

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App en `http://localhost:3000`. Backend debe correr en `http://localhost:4000`.

## Catálogo completo de ejercicios

El selector consume el catálogo enriquecido del backend: 1.324 ejercicios con
nombre, grupo muscular, equipo, miniatura, GIF e instrucciones. Los medios se
sirven desde el backend local en `/media/exercises`, por lo que el frontend no
depende de imágenes remotas ni mantiene una segunda copia de los archivos.

La atribución de los medios se muestra en el detalle del ejercicio. Consulta
`EVRY-Backend/NOTICE-MEDIA.md` para los términos de Gym visual antes de
redistribuir la aplicación.

## Estructura

```
app/
├── (auth)/           login, register
├── (app)/            rutas protegidas
│   ├── dashboard/
│   ├── workout/      lista + detalle (logger)
│   ├── cycle/        tracking de ciclo (solo si trackCycle)
│   ├── progress/     resumen + gráficas 1RM
│   └── profile/      perfil, metas, opciones de ciclo
├── layout.tsx
└── page.tsx          landing
components/
├── ui/               Button, Input, Card, Stepper
├── ExercisePicker
├── RestTimer
├── CyclePhaseBadge
├── ReadinessCheckin
└── ExerciseChart
lib/
├── api.ts            fetch wrapper con refresh automático
├── auth-store.ts     zustand
├── types.ts
└── utils.ts
```

## Diferenciadores UX

1. **Logger 1-thumb:** stepper grande para peso/reps/RPE, cero teclado.
2. **Sugerencia adaptativa visible:** muestra acción (PROGRESS/HOLD/DELOAD) y razones, no caja negra.
3. **Tab "Ciclo" condicional:** solo aparece si la usuaria activa `trackCycle`.
4. **Readiness check-in en dashboard:** 4 sliders, 10 segundos, modula recomendaciones.
5. **Filtros inclusivos:** ejercicios tagueados `accessibility_seated`, `joint_friendly`, `pregnancy_safe`, `equipment_free`.

## Variables de entorno

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```
