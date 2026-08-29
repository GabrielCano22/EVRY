import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  Heart,
  History,
  Info,
  ListOrdered,
  LogOut,
  Minus,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  TriangleAlert,
  User,
  Weight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const icons: Record<string, LucideIcon> = {
  add: Plus,
  add_circle: CirclePlus,
  arrow_back: ArrowLeft,
  arrow_downward: ArrowDown,
  arrow_forward: ArrowRight,
  arrow_upward: ArrowUp,
  auto_awesome: Sparkles,
  calendar_today: CalendarDays,
  calendar_view_week: CalendarRange,
  check: Check,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  cyclone: RefreshCw,
  delete: Trash2,
  edit: Pencil,
  emoji_events: Flag,
  error: TriangleAlert,
  favorite: Heart,
  fitness_center: Dumbbell,
  flag: Flag,
  format_list_numbered: ListOrdered,
  format_quote: Quote,
  forward_10: RotateCw,
  history: History,
  info: Info,
  insights: ChartNoAxesCombined,
  logout: LogOut,
  menu_book: BookOpen,
  more_horiz: MoreHorizontal,
  person: User,
  play_arrow: Play,
  remove: Minus,
  replay_10: RotateCcw,
  save: Save,
  trending_up: TrendingUp,
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
