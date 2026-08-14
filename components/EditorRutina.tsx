'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Ejercicio, Rutina, SerieObjetivo } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Icon } from './ui/Icon';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseMedia } from './ExerciseMedia';
import { cn } from '@/lib/utils';
import { MapaMuscular } from './MapaMuscular';
import {
  etiquetaEquipo,
  etiquetaGrupoMuscular,
  traducirNombreEjercicio,
} from '@/lib/exercise-i18n';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface ItemRutina {
  exerciseId: string;
  exercise: Ejercicio;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  seriesPlan: SerieObjetivo[];
  notes?: string;
}

function crearPlan(series: number, reps: number | null, peso: number | null): SerieObjetivo[] {
  return Array.from({ length: Math.max(1, series) }, () => ({ reps, weightKg: peso }));
}

function normalizarPlan(
  plan: SerieObjetivo[] | null | undefined,
  series: number,
  reps: number | null,
  peso: number | null,
): Serמ}��$z{-���jם\b(push[- ]?up)\b/gi, 'flexión'],
  [/\b(dips?|dip)\b/gi, 'fondos'],
  [/\b(close[- ]grip)\b/gi, 'agarre cerrado'],
  [/\b(wide[- ]grip)\b/gi, 'agarre amplio'],
  [/\b(neutral grip)\b/gi, 'agarre neutro'],
  [/\b(bench press)\b/gi, 'press de banca'],
  [/\b(chest press)\b/gi, 'press de pecho'],
  [/\b(shoulder press)\b/gi, 'press de hombros'],
  [/\b(military press)\b/gi, 'press militar'],
  [/\b(overhead press)\b/gi, 'press por encima de la cabeza'],
  [/\b(stiff leg deadlift)\b/gi, 'peso muerto con piernas rígidas'],
  [/\b(straight leg deadlift)\b/gi, 'peso muerto con piernas extendidas'],
  [/\b(deadlift)\b/gi, 'peso muerto'],
  [/\b(split squat)\b/gi, 'sentadilla dividida'],
  [/\b(front squat)\b/gi, 'sentadilla frontal'],
  [/\b(hack squat)\b/gi, 'sentadilla hack'],
  [/\b(squat)\b/gi, 'sentadilla'],
  [/\b(step[- ]?up)\b/gi, 'subida al banco'],
  [/\b(lunge)\b/gi, 'zancada'],
  [/\b(hip thrust)\b/gi, 'empuje de cadera'],
  [/\b(hyperextension)\b/gi, 'hiperextensión'],
  [/\b(clean and press)\b/gi, 'cargada y press'],
  [/\b(clean)\b/gi, 'cargada'],
  [/\b(snatch)\b/gi, 'arranque'],
  [/\b(jerk)\b/gi, 'envión'],
  [/\b(farmer(?:s)?)\b/gi, 'paseo del granjero'],
  [/\b(good morning)\b/gi, 'buenos días'],
  [/\b(pallof press)\b/gi, 'press Pallof'],
  [/\b(bicycle)\b/gi, 'bicicleta'],
  [/\b(pulldown)\b/gi, 'jalón'],
  [/\b(pushdown)\b/gi, 'extensión en polea'],
  [/\b(pullover)\b/gi, 'pull-over'],
  [/\b(pull through)\b/gi, 'tirón de cadera'],
  [/\b(row)\b/gi, 'remo'],
  [/\b(curls?)\b/gi, 'flexión'],
  [/\b(lever)\b/gi, 'palanca'],
  [/\b(ball)\b/gi, 'balón'],
  [/\b(preacher)\b/gi, 'predicador'],
  [/\b(hammer)\b/gi, 'martillo'],
  [/\b(rope)\b/gi, 'cuerda'],
  [/\b(pulley)\b/gi, 'polea'],
  [/\b(sled|sledge)\b/gi, 'trineo'],
  [/\b(kettlebell)\b/gi, 'pesa rusa'],
  [/\b(press(?:es)?)\b/gi, 'empuje'],
  [/\b(raise|raises)\b/gi, 'elevación'],
  [/\b(extension|extensions)\b/gi, 'extensión'],
  [/\b(flyes?)\b/gi, 'aperturas'],
  [/\b(narrow)\b/gi, 'estrecho'],
  [/\b(stance)\b/gi, 'postura'],
  [/\b(high)\b/gi, 'alto'],
  [/\b(low)\b/gi, 'bajo'],
  [/\b(bent)\b/gi, 'flexionado'],
  [/\b(straight)\b/gi, 'recto'],
  [/\b(delt|deltoid)\b/gi, 'deltoides'],
  [/\b(internal)\b/gi, 'interna'],
  [/\b(external)\b/gi, 'externa'],
  [/\b(stirrups?)\b/gi, 'estribos'],
  [/\b(attachment)\b/gi, 'accesorio'],
  [/\b(stability)\b/gi, 'estabilidad'],
  [/\b(inverse)\b/gi, 'inverso'],
  [/\b(supinated)\b/gi, 'supinado'],
  [/\b(supination)\b/gi, 'supinación'],
  [/\b(pronated)\b/gi, 'pronado'],
  [/\b(pronation)\b/gi, 'pronación'],
  [/\b(extended)\b/gi, 'extendido'],
  [/\b(range)\b/gi, 'rango'],
  [/\b(above)\b/gi, 'encima'],
  [/\b(over)\b/gi, 'sobre'],
  [/\b(head)\b/gi, 'cabeza'],
  [/\b(skull)\b/gi, 'cráneo'],
  [/\b(drag)\b/gi, 'arrastre'],
  [/\b(lift)\b/gi, 'elevación'],
  [/\b(russian)\b/gi, 'ruso'],
  [/\b(twists?)\b/gi, 'giros'],
  [/\b(twisting)\b/gi, 'con giro'],
  [/\b(variation)\b/gi, 'variante'],
  [/\b(support(?:ed)?)\b/gi, 'apoyo'],
  [/\b(finger|fingers)\b/gi, 'dedo'],
  [/\b(row_shoulder)\b/gi, 'remo de hombros'],
  [/\b(butt[- ]?ups?)\b/gi, 'elevaciones de glúteos'],
  [/\b(up)\b/gi, 'arriba'],
  [/\b(upright)\b/gi, 'vertical'],
  [/\b(sternum)\b/gi, 'esternón'],
  [/\b(chin)\b/gi, 'barbilla'],
  [/\b(pirate)\b/gi, 'pirata'],
  [/\b(supper)\b/gi, 'super'],
  [/\b(mixed)\b/gi, 'mixto'],
  [/\b(oblique)\b/gi, 'oblicuo'],
  [/\b(crunches)\b/gi, 'abdominales'],
  [/\b(lower)\b/gi, 'inferior'],
  [/\b(upper)\b/gi, 'superior'],
  [/\b(neck)\b/gi, 'cuello'],
  [/\b(between)\b/gi, 'entre'],
  [/\b(benches?)\b/gi, 'bancos'],
  [/\b(butt[- ]?ups?)\b/gi, 'elevaciones de glúteos'],
  [/\b(dynamic)\b/gi, 'dinámico'],
  [/\b(drop)\b/gi, 'caída'],
  [/\b(ups?)\b/gi, 'elevaciones'],
  [/\b(pyramid)\b/gi, 'pirámide'],
  [/\b(upward)\b/gi, 'ascendente'],
  [/\b(facing)\b/gi, 'mirando'],
  [/\b(dog)\b/gi, 'perro'],
  [/\b(toes?)\b/gi, 'dedo del pie'],
  [/\b(raised)\b/gi, 'elevado'],
  [/\b(legged)\b/gi, 'con piernas'],
  [/\b(modified)\b/gi, 'modificado'],
  [/\b(backward)\b/gi, 'hacia atrás'],
  [/\b(butterfly)\b/gi, 'mariposa'],
  [/\b(pose)\b/gi, 'postura'],
  [/\b(squad)\b/gi, 'cuclillas'],
  [/\b(big)\b/gi, 'grande'],
  [/\b(squatting)\b/gi, 'en sentadilla'],
  [/\b(kickbacks?)\b/gi, 'patadas hacia atrás'],
  [/\b(dumbbells?)\b/gi, 'mancuernas'],
  [/\b(sitted)\b/gi, 'sentado'],
  [/\b(stepbox)\b/gi, 'cajón'],
  [/\b(cage)\b/gi, 'jaula'],
  [/\b(scissor)\b/gi, 'tijera'],
  [/\b(jumps?)\b/gi, 'saltos'],
  [/\b(astride)\b/gi, 'a horcajadas'],
  [/\b(wheel)\b/gi, 'rueda'],
  [/\b(outstretched)\b/gi, 'extendida'],
  [/\b(ski)\b/gi, 'esquí'],
  [/\b(step)\b/gi, 'paso'],
  [/\b(body)\b/gi, 'cuerpo'],
  [/\b(roller)\b/gi, 'rodillo'],
  [/\b(saw)\b/gi, 'sierra'],
  [/\b(extension)\b/gi, 'extensión'],
  [/\b(raise)\b/gi, 'elevación'],
  [/\b(fly)\b/gi, 'apertura'],
  [/\b(shrug)\b/gi, 'encogimiento de hombros'],
  [/\b(crunch)\b/gi, 'encogimiento abdominal'],
  [/\b(plank)\b/gi, 'plancha'],
  [/\b(twist)\b/gi, 'giro'],
  [/\b(rotation)\b/gi, 'rotación'],
  [/\b(kickback)\b/gi, 'patada hacia atrás'],
  [/\b(bridge)\b/gi, 'puente'],
  [/\b(fallout)\b/gi, 'despliegue'],
  [/\b(abduction)\b/gi, 'abducción'],
  [/\b(adduction)\b/gi, 'aducción'],
  [/\b(flexion)\b/gi, 'flexión'],
  [/\b(stretch)\b/gi, 'estiramiento'],
  [/\b(circles?)\b/gi, 'círculos'],
  [/\b(swing)\b/gi, 'balanceo'],
  [/\b(walkout)\b/gi, 'caminata hacia adelante'],
  [/\b(walk)\b/gi, 'caminata'],
  [/\b(run)\b/gi, 'carrera'],
  [/\b(jump)\b/gi, 'salto'],
  [/\b(throw down)\b/gi, 'lanzamiento hacia abajo'],
  [/\b(throw)\b/gi, 'lanzamiento'],
  [/\b(down)\b/gi, 'abajo'],
  [/\b(touch)\b/gi, 'toque'],
  [/\b(tap)\b/gi, 'toque'],
  [/\b(roll(?:er)?)\b/gi, 'rodamiento'],
  [/\b(lever)\b/gi, 'palanca'],
  [/\b(planche)\b/gi, 'plancha'],
  [/\b(superman)\b/gi, 'superman'],
  [/\b(spider)\b/gi, 'araña'],
  [/\b(donkey)\b/gi, 'burro'],
  [/\b(preacher)\b/gi, 'predicador'],
  [/\b(concentration)\b/gi, 'concentrado'],
  [/\b(hammer)\b/gi, 'martillo'],
  [/\b(archer)\b/gi, 'arquero'],
  [/\b(slingers?|slings?)\b/gi, 'lanzamientos'],
  [/\b(squad)\b/gi, 'sentadilla'],
  [/\b(balance board)\b/gi, 'tabla de equilibrio'],
  [/\b(board)\b/gi, 'tabla'],
  [/\b(barbell)\b/gi, 'barra'],
  [/\b(olympic bar)\b/gi, 'barra olímpica'],
  [/\b(ez bar)\b/gi, 'barra EZ'],
  [/\b(dumbbell)\b/gi, 'mancuerna'],
  [/\b(resistance band)\b/gi, 'banda elástica'],
  [/\b(band)\b/gi, 'banda elástica'],
  [/\b(cable)\b/gi, 'polea'],
  [/\b(smith machine)\b/gi, 'máquina Smith'],
  [/\b(leverage machine)\b/gi, 'máquina de palanca'],
  [/\b(machine)\b/gi, 'máquina'],
  [/\b(medicine ball)\b/gi, 'balón medicinal'],
  [/\b(stability ball)\b/gi, 'balón de estabilidad'],
  [/\b(exercise ball)\b/gi, 'balón de ejercicio'],
  [/\b(body[- ]?weight)\b/gi, 'peso corporal'],
  [/\b(weighted)\b/gi, 'lastrado'],
  [/\b(rope)\b/gi, 'cuerda'],
  [/\b(sled)\b/gi, 'trineo'],
  [/\b(assisted)\b/gi, 'asistido'],
  [/\b(seated)\b/gi, 'sentado'],
  [/\b(standing)\b/gi, 'de pie'],
  [/\b(lying)\b/gi, 'acostado'],
  [/\b(prone)\b/gi, 'boca abajo'],
  [/\b(supine)\b/gi, 'boca arriba'],
  [/\b(kneeling)\b/gi, 'de rodillas'],
  [/\b(hanging)\b/gi, 'colgado'],
  [/\b(incline)\b/gi, 'inclinado'],
  [/\b(decline)\b/gi, 'declinado'],
  [/\b(reverse)\b/gi, 'inverso'],
  [/\b(alternating|alternate)\b/gi, 'alterno'],
  [/\b(single leg)\b/gi, 'a una pierna'],
  [/\b(one arm)\b/gi, 'a un brazo'],
  [/\b(one hand)\b/gi, 'a una mano'],
  [/\b(two legs)\b/gi, 'a dos piernas'],
  [/\b(front)\b/gi, 'frontal'],
  [/\b(rear)\b/gi, 'posterior'],
  [/\b(lateral|side)\b/gi, 'lateral'],
  [/\b(lower)\b/gi, 'inferior'],
  [/\b(upper)\b/gi, 'superior'],
  [/\b(high)\b/gi, 'alto'],
  [/\b(low)\b/gi, 'bajo'],
  [/\b(inner)\b/gi, 'interno'],
  [/\b(outer)\b/gi, 'externo'],
  [/\b(cross(?: body)?)\b/gi, 'cruzado'],
  [/\b(bent[- ]over)\b/gi, 'inclinado'],
  [/\b(bent arm)\b/gi, 'con brazos flexionados'],
  [/\b(straight leg)\b/gi, 'pierna extendida'],
  [/\b(stiff leg)\b/gi, 'piernas rígidas'],
  [/\b(parallel)\b/gi, 'paralelo'],
  [/\b(behind)\b/gi, 'detrás'],
  [/\b(full)\b/gi, 'completo'],
  [/\b(half)\b/gi, 'medio'],
  [/\b(against)\b/gi, 'contra'],
  [/\b(above)\b/gi, 'por encima'],
  [/\b(underhand)\b/gi, 'agarre supino'],
  [/\b(overhand)\b/gi, 'agarre prono'],
  [/\b(neutral)\b/gi, 'neutro'],
  [/\b(suspended)\b/gi, 'suspendido'],
  [/\b(inverted)\b/gi, 'invertido'],
  [/\b(narrow)\b/gi, 'estrecho'],
  [/\b(wall)\b/gi, 'pared'],
  [/\b(floor)\b/gi, 'suelo'],
  [/\b(under)\b/gi, 'debajo'],
  [/\b(both)\b/gi, 'ambas'],
  [/\b(double)\b/gi, 'doble'],
  [/\b(straight)\b/gi, 'recto'],
  [/\b(bent)\b/gi, 'flexionado'],
  [/\b(plate|disc)\b/gi, 'disco'],
  [/\b(weight plate)\b/gi, 'disco de peso'],
  [/\b(landmine)\b/gi, 'landmine'],
  [/\b(towel)\b/gi, 'toalla'],
  [/\b(chair)\b/gi, 'silla'],
  [/\b(bench)\b/gi, 'banco'],
  [/\b(box)\b/gi, 'cajón'],
  [/\b(pull)\b/gi, 'tirón'],
  [/\b(push)\b/gi, 'empuje'],
  [/\b(carry(?:ing)?)\b/gi, 'transporte'],
  [/\b(rotate)\b/gi, 'rotación'],
  [/\b(turn)\b/gi, 'giro'],
  [/\b(kick)\b/gi, 'patada'],
  [/\b(thigh)\b/gi, 'muslo'],
  [/\b(foot|feet)\b/gi, 'pie'],
  [/\b(finger|fingers)\b/gi, 'dedo'],
  [/\b(toe)\b/gi, 'dedo del pie'],
  [/\b(heel)\b/gi, 'talón'],
  [/\b(ankle)\b/gi, 'tobillo'],
  [/\b(knee|knees)\b/gi, 'rodilla'],
  [/\b(elbow)\b/gi, 'codo'],
  [/\b(wrist)\b/gi, 'muñeca'],
  [/\b(arm|arms)\b/gi, 'brazo'],
  [/\b(chest)\b/gi, 'pecho'],
  [/\b(back)\b/gi, 'espalda'],
  [/\b(shoulder)\b/gi, 'hombro'],
  [/\b(forearm)\b/gi, 'antebrazo'],
  [/\b(leg|legs)\b/gi, 'pierna'],
  [/\b(calf)\b/gi, 'pantorrilla'],
  [/\b(calves)\b/gi, 'pantorrillas'],
  [/\b(hip|hips)\b/gi, 'cadera'],
  [/\b(glutes?|gluteus)\b/gi, 'glúteo'],
  [/\b(hamstring)\b/gi, 'isquiotibial'],
  [/\b(quads?)\b/gi, 'cuádriceps'],
  [/\b(triceps?|tricep)\b/gi, 'tríceps'],
  [/\b(biceps?|bicep)\b/gi, 'bíceps'],
  [/\b(pectoral)\b/gi, 'pectoral'],
  [/\b(pec)\b/gi, 'pectoral'],
  [/\b(balance)\b/gi, 'equilibrio'],
  [/\b(delt)\b/gi, 'deltoides'],
  [/\b(lat)\b/gi, 'dorsal'],
  [/\b(neck)\b/gi, 'cuello'],
  [/\b(head)\b/gi, 'cabeza'],
  [/\b(without)\b/gi, 'sin'],
  [/\b(with)\b/gi, 'con'],
  [/\b(and)\b/gi, 'y'],
  [/\b(on|in)\b/gi, 'en'],
  [/\b(to)\b/gi, 'a'],
  [/\b(for)\b/gi, 'para'],
  [/\b(of)\b/gi, 'de'],
  [/\b(the)\b/gi, ''],
  // No eliminamos la preposición española "a" después de traducir
  // expresiones compuestas como "subida dinámica a la barra".
  [/\b(male)\b/gi, 'hombre'],
  [/\b(female)\b/gi, 'mujer'],
  [/\b(exercise)\b/gi, 'ejercicio'],
  [/\b(stability)\b/gi, 'estabilidad'],
  [/\b(attachment)\b/gi, 'accesorio'],
  [/\b(palms?)\b/gi, 'palmas'],
  [/\b(hands?)\b/gi, 'manos'],
  [/\b(zigzag)\b/gi, 'zigzag'],
  [/\b(pike)\b/gi, 'pica'],
  [/\b(astride)\b/gi, 'a horcajadas'],
  [/\b(archer)\b/gi, 'arquero'],
  [/\b(backward)\b/gi, 'hacia atrás'],
  [/\b(forward)\b/gi, 'hacia adelante'],
  [/\b(circular)\b/gi, 'circular'],
  [/\b(fixed)\b/gi, 'fijo'],
  [/\b(straight back)\b/gi, 'espalda recta'],
  [/\b(rectus femoris)\b/gi, 'recto femoral'],
  [/\b(piriformis)\b/gi, 'piriforme'],
  [/\b(adductor)\b/gi, 'aductor'],
  [/\b(pectoralis major)\b/gi, 'pectoral mayor'],
  [/\b(motion)\b/gi, 'movimiento'],
  [/\b(squeeze)\b/gi, 'apretón'],
  [/\b(supported)\b/gi, 'con apoyo'],
  [/\b(modified)\b/gi, 'modificado'],
  [/\b(basic)\b/gi, 'básico'],
  [/\b(advanced)\b/gi, 'avanzado'],
  [/\b(cossack)\b/gi, 'cosaco'],
  [/\b(sissy)\b/gi, 'de cuádriceps'],
  [/\b(squats?)\b/gi, 'sentadillas'],
  [/\b(straddle)\b/gi, 'a horcajadas'],
  [/\b(maltese)\b/gi, 'maltés'],
  [/\b(swimmer)\b/gi, 'nadador'],
  [/\b(tire)\b/gi, 'neumático'],
  [/\b(trap bar)\b/gi, 'barra hexagonal'],
  [/\b(trainer)\b/gi, 'entrenador'],
  [/\b(treadmill)\b/gi, 'cinta de correr'],
  [/\b(elliptical)\b/gi, 'elíptica'],
  [/\b(stepmill)\b/gi, 'escaladora'],
  [/\b(wind sprints?)\b/gi, 'sprints de viento'],
  [/\b(world greatest)\b/gi, 'el mejor del mundo'],
  [/\b(vertical)\b/gi, 'vertical'],
  [/\b(horizontal)\b/gi, 'horizontal'],
  [/\b(round)\b/gi, 'circular'],
  [/\b(revers)\b/gi, 'inverso'],
  [/\b(inverse)\b/gi, 'inverso'],
  [/\b(pov)\b/gi, 'POV'],
  [/\b(zt?ottman)\b/gi, 'Zottman'],
  [/\b(blaster)\b/gi, 'bláster'],
  [/\b(muscle)\b/gi, 'muscle'],
  [/\b(up)\b/gi, 'arriba'],
  [/\b(down)\b/gi, 'abajo'],
  [/\b(two)\b/gi, 'dos'],
  [/\b(one)\b/gi, 'uno'],
  [/\b(three)\b/gi, 'tres'],
  [/\b(v)\b/gi, 'V'],
  [/\b(bar)\b/gi, 'barra'],
  [/\b(grip)\b/gi, 'agarre'],
  [/\b(hold)\b/gi, 'sostén'],
];

function limpiarTexto(texto: string) {
  return texto
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,)])/g, '$1')
    .replace(/([,(])\s+/g, '$1 ')
    .replace(/\s+-\s*/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function capitalizar(texto: string) {
  return texto ? `${texto[0].toLocaleUpperCase('es-CO')}${texto.slice(1)}` : texto;
}

export function traducirNombreEjercicio(nombre: string | null | undefined) {
  if (!nombre) return 'Ejercicio';
  let traducido = nombre
    .replace(/\s*\((male|female)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [patron, reemplazo] of REEMPLAZOS_NOMBRE) traducido = traducido.replace(patron, reemplazo);
  const limpio = limpiarTexto(traducido)
    .replace(/\blastrado\s+(sentadilla|zancada|prensa|extensi[oó]n)\b/gi, '$1 lastrada')
    .replace(/\blastrado\s+(curl)\b/gi, '$1 lastrado')
    .replace(/\bpress\s+banca\b/gi, 'press de banca')
    .replace(/\bdominadas\s+agarre\b/gi, 'dominadas con agarre');
  return capitalizar(limpio);
}

export function etiquetaGrupoMuscular(grupo: GrupoMuscular | string | null | undefined) {
  if (!grupo) return 'Sin grupo';
  return GRUPOS_MUSCULARES[grupo as GrupoMuscular] ?? traducirValorEjercicio(grupo);
}

export function etiquetaEquipo(equipo: Equipo | string | null | undefined) {
  if (!equipo) return 'Sin equipo';
  return EQUIPOS[equipo as Equipo] ?? traducirValorEjercicio(equipo);
}

export function traducirValorEjercicio(valor: string | null | undefined) {
  if (!valor) return '';
  const normalizado = valor.trim().toLowerCase().replace(/\s+/g, ' ');
  return VALORES_EJERCICIO[normalizado] ?? traducirNombreEjercicio(valor);
}

export function traducirCategoria(categoria: string | null | undefined) {
  if (!categoria) return '';
  const categorias: Record<string, string> = {
    waist: 'Zona media',
    back: 'Espalda',
    chest: 'Pecho',
    shoulders: 'Hombros',
    'upper arms': 'Brazos',
    'lower arms': 'Antebrazos',
    'upper legs': 'Piernas',
    'lower legs': 'Pantorrillas',
    cardio: 'Cardio',
    neck: 'Cuello',
  };
  const normalizada = categoria.trim().toLowerCase();
  return categorias[normalizada] ?? traducirValorEjercicio(categoria);
}

export function traducirEtiquetaEjercicio(etiqueta: string) {
  const normalizada = etiqueta.trim().toLowerCase();
  return ETIQUETAS[normalizada] ?? traducirNombreEjercicio(etiqueta.replaceAll('_', ' '));
}
