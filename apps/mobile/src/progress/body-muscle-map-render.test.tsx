import { fireEvent, render, screen } from '@testing-library/react-native';
import { BodyMuscleMap } from './body-muscle-map';

it.each([
  ['MALE', 'masculina'],
  ['FEMALE', 'femenina'],
  ['PREFER_NOT_SAY', 'neutral'],
] as const)('selects an orientative %s silhouette', async (sex, label) => {
  await render(<BodyMuscleMap sex={sex} distribution={[{ muscleGroup: 'CHEST', workingSets: 3 }]} />);
  expect(screen.getByText('Mapa muscular')).toBeTruthy();
  expect(screen.getByText(new RegExp(`Esquema ${label} orientativo`))).toBeTruthy();
  expect(screen.getByText(/No mide activación ni fatiga/)).toBeTruthy();
});

it('lets the user change the visual model without changing the profile', async () => {
  await render(<BodyMuscleMap sex="PREFER_NOT_SAY" distribution={[]} />);
  expect(screen.getByRole('radio', { name: 'Masculino' }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: 'Femenino' }));
  expect(screen.getByRole('radio', { name: 'Femenino' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByText(/no cambia tu perfil/)).toBeTruthy();
});

it('explains why whole-body and cardio work are not assigned to a specific region', async () => {
  await render(<BodyMuscleMap sex="OTHER" distribution={[{ muscleGroup: 'CARDIO', workingSets: 2 }]} />);
  expect(screen.getByText(/sin asignarlos a zonas específicas/)).toBeTruthy();
});
