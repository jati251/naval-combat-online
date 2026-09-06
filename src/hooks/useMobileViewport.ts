import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 1024px), (pointer: coarse)';
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const getSnapshot = () => window.matchMedia(QUERY).matches;

export function useMobileViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
