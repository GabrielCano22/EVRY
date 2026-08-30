import { render } from '@testing-library/react-native';
import { SyncStatus } from './components';

describe('SyncStatus', () => {
  it.each([
    ['pending', 'Guardado localmente'],
    ['syncing', 'Sincronizando'],
    ['synced', 'Sincronizado'],
    ['requires_review', 'Requiere revisión'],
  ] as const)('announces %s as %s', async (state, label) => {
    const screen = await render(<SyncStatus state={state} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
