import { useAutenticacion } from './lib/auth-store';

const protectedRoots = ['/dashboard', '/workout', '/progress', '/cycle', '/profile'];

if (typeof window !== 'undefined' && protectedRoots.some(root =>
  window.location.pathname === root || window.location.pathname.startsWith(`${root}/`))) {
  // Begin cookie restoration before hydration without waiting for the network.
  // The protected layout consumes this same generation-scoped operation.
  void useAutenticacion.getState().inicializar({ reuseForDocument: true });
}
