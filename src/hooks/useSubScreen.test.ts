import { describe, it, expect } from 'vitest';
import {
  createValidator,
  isValidConversation,
  isValidPersistedThread,
  isValidString
} from './useSubScreen';

describe('useSubScreen Validators', () => {
  describe('createValidator', () => {
    it('should return true when validator function returns true', () => {
      const validator = createValidator((data) => data === 'test');
      expect(validator('test')).toBe(true);
    });

    it('should return false when validator function returns false', () => {
      const validator = createValidator((data) => data === 'test');
      expect(validator('other')).toBe(false);
    });

    it('should return false when validator function throws an error', () => {
      const validator = createValidator(() => {
        throw new Error('Test error');
      });
      expect(validator('anything')).toBe(false);
    });
  });

  describe('isValidConversation', () => {
    it('should validate correct conversation objects', () => {
      const validConv = { id: '123', exerciseName: 'Pushups' };
      expect(isValidConversation(validConv)).toBe(true);
    });

    it('should reject objects with missing fields', () => {
      expect(isValidConversation({ id: '123' })).toBe(false);
      expect(isValidConversation({ exerciseName: 'Pushups' })).toBe(false);
    });

    it('should reject objects with wrong types', () => {
      expect(isValidConversation({ id: 123, exerciseName: 'Pushups' })).toBe(false);
      expect(isValidConversation({ id: '123', exerciseName: 123 })).toBe(false);
    });

    it('should reject null or non-object values', () => {
      expect(isValidConversation(null)).toBe(false);
      expect(isValidConversation('string')).toBe(false);
      expect(isValidConversation(123)).toBe(false);
    });
  });

  describe('isValidPersistedThread', () => {
    it('should validate correct persisted thread objects', () => {
      const validThread = {
        athlete: { oderId: 'athlete-1' },
        session: { exerciseName: 'Bench Press' }
      };
      expect(isValidPersistedThread(validThread)).toBe(true);
    });

    it('should reject objects with missing nested fields', () => {
      expect(isValidPersistedThread({ athlete: {}, session: { exerciseName: 'BP' } })).toBe(false);
      expect(isValidPersistedThread({ athlete: { oderId: 'A' }, session: {} })).toBe(false);
    });

    it('should reject missing top-level fields', () => {
      expect(isValidPersistedThread({ athlete: { oderId: 'A' } })).toBe(false);
      expect(isValidPersistedThread({ session: { exerciseName: 'BP' } })).toBe(false);
    });

    it('should reject wrong types', () => {
      expect(isValidPersistedThread({
        athlete: { oderId: 123 },
        session: { exerciseName: 'BP' }
      })).toBe(false);
    });
  });

  describe('isValidString', () => {
    it('should validate non-empty strings', () => {
      expect(isValidString('hello')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(isValidString('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidString(null)).toBe(false);
      expect(isValidString(undefined)).toBe(false);
      expect(isValidString(123)).toBe(false);
      expect(isValidString({})).toBe(false);
    });
  });
});
