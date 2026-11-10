import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Check,
  CircleCheck,
  CircleHelp,
  CirclePlus,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Heart,
  History,
  Info,
  ListOrdered,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Minus,
  MoreHorizontal,
  Pause,
  Pencil,
  PersonStanding,
  Play,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Type,
  User,
  Weight,
  X,
  Zap,
  createLucideIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// The pinned Lucide release has no sex symbols. Keep these legacy choices
// as local SVGs rather than loading a remote symbol font or changing labels.
const FemaleSymbol = createLucideIcon('Female', [
  ['circle', { cx: '12', cy: '8', r: '5', key: 'circle' }],
  ['path', { d: 'M12 13v8m-3-3h6', key: 'cross' }],
]);
const MaleSymbol = createLucideIcon('Male', [
  ['circle', { cx: '10', cy: '14', r: '5', key: 'circle' }],
  ['path', { d: 'm14 10 7-7m-5 0h5v5', key: 'arrow' }],
]);
const TransgenderSymbol = createLucideIcon('Transgender', [
  ['circle', { cx: '12', cy: '12', r: '4', key: 'circle' }],
  ['path', { d: 'M12 16v6m-3-3h6m0-10 6-6m-5 0h5v5M9 9 3 3m0 5V3h5m-4 4 3-3', key: 'arrows' }],
]);

const icons: Record<string, LucideIcon> = {
  add: Plus,
  add_circle: CirclePlus,
  arrow_back: ArrowLeft,
  arrow_downward: ArrowDown,
  arrow_forward: ArrowRight,
  arrow_upward: ArrowUp,
  auto_awesome: Sparkles,
  battery_charging_full: BatteryCharging,
  calendar_month: CalendarDays,
  calendar_today: CalendarDays,
  calendar_view_week: CalendarRange,
  check: Check,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  cyclone: RefreshCw,
  dashboard: LayoutDashboard,
  delete: Trash2,
  directions_run: Footprints,
  edit: Pencil,
  emoji_events: Trophy,
  error: TriangleAlert,
  event: CalendarDays,
  exercise: Dumbbell,
  favorite: Heart,
  female: FemaleSymbol,
  fitness_center: Dumbbell,
  flag: Flag,
  flash_on: Zap,
  format_list_numbered: ListOrdered,
  format_quote: Quote,
  forward_10: RotateCw,
  history: History,
  help_outline: CircleHelp,
  info: Info,
  insights: ChartNoAxesCombined,
  local_fire_department: Flame,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  male: MaleSymbol,
  menu_book: BookOpen,
  more_horiz: MoreHorizontal,
  monitoring: ChartNoAxesCombined,
  pause: Pause,
  person: User,
  play_arrow: Play,
  remove: Minus,
  replay_10: RotateCcw,
  save: Save,
  search: Search,
  self_improvement: PersonStanding,
  settings: Settings,
  title: Type,
  transgender: TransgenderSymbol,
  trending_up: TrendingUp,
  tune: SlidersHorizontal,
  water_drop: Droplet,
  weight: Weight,
};

export function Icon({ name, fill, className, size = 24 }: {
  name: string;
  fill?: boolean;
  className?: string;
  size?: number;
}) {
  const Component = icons[name] ?? CircleHelp;
  return (
    <Component
      aria-hidden="true"
      className={cn('inline-block shrink-0', className)}
      fill={fill ? 'currentColor' : 'none'}
      focusable="false"
      size={size}
      strokeWidth={2}
    />
  );
}
