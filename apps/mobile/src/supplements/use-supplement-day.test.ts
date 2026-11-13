import { renderHook, act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { MobileSession } from '../api/client';
import { useSupplementDay } from './use-supplement-day';

it('refreshes at local midnight and on foreground after a background day change', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 9, 23, 59, 59));
  const original = AppState.currentState;
  AppState.currentState = 'active';
  let listener: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const clear = jest.spyOn(globalThis, 'clearTimeout');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    listener = callback;
    return { remove };
  });
  const session = {} as MobileSession;
  const load = jest.fn().mockResolvedValue(undefined);
  try {
    const hook = await renderHook(() => useSupplementDay(session, load));
    await act(() => { jest.advanceTimersByTime(1000); });
    expect(load).toHaveBeenCalledTimes(1);
    AppState.currentState = 'background';
    await act(() => { listener?.('background'); });
    jest.setSystemTime(new Date(2026, 10, 12, 12));
    AppState.currentState = 'active';
    await act(() => { listener?.('active'); });
    expect(load).toHaveBeenCalledTimes(2);
    await act(() => { listener?.('active'); });
    expect(load).toHaveBeenCalledTimes(2);
    clear.mockClear();
    await hook.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalled();
  } finally {
    AppState.currentState = original;
    jest.restoreAllMocks();
    jest.useRealTimers();
  }
});
