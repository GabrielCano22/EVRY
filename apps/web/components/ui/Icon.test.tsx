import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Icon } from './Icon';
import { Input } from './Input';

afterEach(cleanup);

it.each([
  ['Correo', 'mail', 'lucide-mail'],
  ['Contraseña', 'lock', 'lucide-lock'],
  ['Buscar', 'search', 'lucide-search'],
  ['Nombre de rutina', 'title', 'lucide-type'],
  ['Fecha de nacimiento', 'calendar_month', 'lucide-calendar-days'],
])('renders the intended local SVG beside the %s field', (label, name, glyph) => {
  render(<Input label={label} icon={name} />);
  const field = screen.getByRole('textbox', { name: label });
  const svg = field.closest('label')?.querySelector('svg');
  expect(svg).toHaveClass(glyph);
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('focusable', 'false');
  expect(field).toHaveAccessibleName(label);
});

it.each([
  ['dashboard', 'lucide-layout-dashboard'],
  ['monitoring', 'lucide-chart-no-axes-combined'],
  ['settings', 'lucide-settings'],
  ['flash_on', 'lucide-zap'],
  ['pause', 'lucide-pause'],
  ['battery_charging_full', 'lucide-battery-charging'],
  ['event', 'lucide-calendar-days'],
  ['local_fire_department', 'lucide-flame'],
  ['exercise', 'lucide-dumbbell'],
  ['directions_run', 'lucide-footprints'],
  ['self_improvement', 'lucide-person-standing'],
  ['tune', 'lucide-sliders-horizontal'],
  ['female', 'lucide-female'],
  ['male', 'lucide-male'],
  ['transgender', 'lucide-transgender'],
  ['emoji_events', 'lucide-trophy'],
])('renders %s as its intended SVG rather than a generic question mark', (name, glyph) => {
  const { container } = render(<Icon name={name} size={18} />);
  const svg = container.querySelector('svg');
  expect(svg).toHaveClass(glyph);
  expect(svg).not.toHaveClass('lucide-circle-help');
  expect(svg).toHaveAttribute('width', '18');
  expect(svg).toHaveAttribute('height', '18');
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('focusable', 'false');
});

it('preserves the help glyph for an explicit help request and an unknown icon', () => {
  const { container } = render(<><Icon name="help_outline" /><Icon name="unknown-future-icon" /></>);
  expect(container.querySelectorAll('svg.lucide-circle-help')).toHaveLength(2);
});
