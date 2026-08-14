/**
 * Mensajes motivacionales seleccionados de forma estable por día.
 *
 * Mantener esta lógica fuera de la página permite que el dashboard y otros
 * puntos de entrada muestren el mismo mensaje durante el día, sin depender
 * de la hora, del orden de las peticiones o de un render aleatorio.
 */

export const FRASES_GENERALES = [
  'El dolor que sientes hoy es la fuerza que sentirás mañana.',
  'No se trata de perfección; se trata de ser mejor que ayer.',
  'Tu cuerpo puede aguantar casi cualquier cosa. A tu mente le toca decidir.',
  'La disciplina pesa gramos. El arrepentimiento pesa toneladas.',
  'Pequeños pasos cada día construyen grandes cambios.',
  'Escucha a tu cuerpo. Respeta tu biología. Entrena con cabeza.',
  'Una hora hoy. Un cuerpo nuevo en seis meses.',
  'No compitas con nadie más que con quien fuiste ayer.',
  'La constancia vence al talento cuando el talento no es constante.',
  'Cada serie cuenta. Cada repetición suma.',
  'Entrena con ciencia, no solo con esfuerzo.',
  'El descanso también es entrenamiento.',
  'Los récords se rompen un kilo a la vez.',
  'Fuerte por dentro, fuerte por fuera.',
];

/** Mensajes dirigidos a mujeres, con concordancia y tono inclusivo. */
export const FRASES_MUJERES = [
  'Eres fuerte, capaz y constante: cada entrenamiento lo demuestra.',
  'Entrena como la atleta que estás construyendo, a tu propio ritmo.',
  'Tu fuerza no necesita permiso: ocupa tu espacio y disfruta el proceso.',
  'Poderosa no significa incansable; también es sabio escuchar tu cuerpo.',
  'Tu mejor versión no tiene prisa: tiene un plan y confía en el proceso.',
  'Hoy eres una mujer más fuerte que la que empezó este camino.',
  'Tu constancia habla más alto que cualquier comparación.',
  'Entrenar también es regalarte tiempo para ti.',
];

/** Mensajes adicionales que solo se muestran cuando se sigue el ciclo. */
export const FRASES_CICLO = [
  'Escucha tu cuerpo: adaptar la intensidad también es progresar.',
  'Tu ciclo no limita tu fuerza; te enseña a entrenar con inteligencia.',
  'Descansar cuando lo necesitas es parte de alcanzar tu mejor versión.',
  'Cada fase tiene algo que enseñarte; entrena con paciencia y confianza.',
];

function diaDelAnio(fecha: Date): number {
  const inicio = new Date(fecha.getFullYear(), 0, 1);
  inicio.setHours(0, 0, 0, 0);
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  return Math.floor((dia.getTime() - inicio.getTime()) / 86_400_000);
}

/**
 * Devuelve un mensaje estable para la fecha indicada.
 *
 * Las colecciones masculina/general y femenina no se mezclan: de esta forma
 * una mujer nunca recibe por casualidad la misma frase genérica que un hombre
 * en el mismo día. El tercer argumento existe para pruebas y para widgets
 * que necesiten previsualizar otra fecha.
 */
export function fraseDelDia(
  esMujer: boolean,
  incluyeCiclo = false,
  fecha: Date = new Date(),
): string {
  const pool = esMujer
    ? incluyeCiclo
      ? [...FRASES_MUJERES, ...FRASES_CICLO]
      : FRASES_MUJERES
    : FRASES_GENERALES;

  // Un desplazamiento distinto evita que el primer día de ambas colecciones
  // vuelva a coincidir si en el futuro se añaden mensajes repetidos.
  const desplazamiento = esMujer ? 2 : 0;
  return pool[(diaDelAnio(fecha) + desplazamiento) % pool.length];
}
