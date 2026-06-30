import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setLocalStorageWithEvent, removeLocalStorageWithEvent } from './localStorageEvents';

describe('localStorageEvents', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setLocalStorageWithEvent', () => {
    it('écrit la valeur dans localStorage', () => {
      setLocalStorageWithEvent('fyt_key', 'val');
      expect(localStorage.getItem('fyt_key')).toBe('val');
    });

    it('émet un CustomEvent "local-storage-change" avec key + value', () => {
      const handler = vi.fn();
      window.addEventListener('local-storage-change', handler);

      setLocalStorageWithEvent('fyt_key', 'val');

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ key: 'fyt_key', value: 'val' });

      window.removeEventListener('local-storage-change', handler);
    });
  });

  describe('removeLocalStorageWithEvent', () => {
    it('supprime la clé de localStorage', () => {
      localStorage.setItem('fyt_key', 'val');
      removeLocalStorageWithEvent('fyt_key');
      expect(localStorage.getItem('fyt_key')).toBeNull();
    });

    it('émet un CustomEvent avec value null', () => {
      const handler = vi.fn();
      window.addEventListener('local-storage-change', handler);

      removeLocalStorageWithEvent('fyt_key');

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ key: 'fyt_key', value: null });

      window.removeEventListener('local-storage-change', handler);
    });
  });
});
