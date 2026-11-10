import { cleanup, render, screen } from '@testing-library/react-native';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import TabLayout from '../../app/(tabs)/_layout';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from '../training/training-store';

// Native router mounting needs an Activity. Keep EVRY's options and stores real;
// inspect the layout EVRY supplies at that boundary, not the router's internals.
jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Tabs = ({ screenOptions }: { screenOptions: { tabBarStyle: object } }) =>
    <View accessibilityLabel="Navegación principal" style={screenOptions.tabBarStyle} />;
  Tabs.Screen = function TabScreenBoundary() { return null; };
  return { Tabs, Redirect: () => null };
});

const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
const originalWindow = Dimensions.get('window');
const originalScreen = Dimensions.get('screen');

afterEach(() => {
  cleanup();
  Object.defineProperty(Platform, 'OS', originalPlatform);
  Dimensions.set({ window: originalWindow, screen: originalScreen });
});

async function layout(platform: 'android' | 'ios', bottom: number, fontScale = 1) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
  Dimensions.set({ window: { width: 360, height: 800, scale: 2, fontScale } });
  const session = { userId: 'navigation-fixture', serverUrl: 'https://api.example.test/api/v1', version: 1 as const };
  useSessionStore.setState({ status: 'authenticated', session });
  useTrainingStore.setState({ ready: true, session, error: null });
  await render(<SafeAreaInsetsContext.Provider value={{ top: 36, bottom, left: 0, right: 0 }}>
    <TabLayout />
  </SafeAreaInsetsContext.Provider>);
  return StyleSheet.flatten(screen.getByLabelText('Navegación principal').props.style);
}

it('keeps Android tab content clear of the measured 15dp gesture area when navigation inset is zero', async () => {
  const style = await layout('android', 0, 0.9);
  expect(style.paddingBottom).toBeGreaterThanOrEqual(15);
  expect(style.height - style.paddingBottom).toBeGreaterThanOrEqual(64);
});

it('preserves a larger Android navigation inset rather than replacing it with the gesture gutter', async () => {
  const style = await layout('android', 48);
  expect(style.paddingBottom).toBe(48);
  expect(style.height - style.paddingBottom).toBeGreaterThanOrEqual(64);
});

it.each([0, 34])('uses the reported iOS bottom inset of %s without adding an Android-only gutter', async bottom => {
  const style = await layout('ios', bottom);
  expect(style.paddingBottom).toBe(bottom);
  expect(style.height - style.paddingBottom).toBeGreaterThanOrEqual(64);
});

it('adds content room for large system text without reducing the Android gesture gutter', async () => {
  const style = await layout('android', 0, 2);
  expect(style.paddingBottom).toBeGreaterThanOrEqual(15);
  expect(style.height - style.paddingBottom).toBeGreaterThanOrEqual(80);
});
