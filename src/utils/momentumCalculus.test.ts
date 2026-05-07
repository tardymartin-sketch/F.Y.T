import { describe, it, expect } from 'vitest';
import { calculateMomentum, calculateRestDiscipline, calculateConsistency } from './momentumCalculus';

describe('Momentum Calculus', () => {
  describe('calculateMomentum', () => {
    it('should return 0 if totalPlannedSets is 0', () => {
      expect(calculateMomentum(0, 0, 0, 0, 0)).toBe(0);
    });

    it('should calculate correct score for example from design doc', () => {
      // Example: 12 sets completed out of 16, 1 PR, avg rest 80, avg consistency 90
      // completion = 75
      // prBonus = 25
      // momentum = (0.5 * 75) + (0.2 * 25) + (0.15 * 80) + (0.15 * 90) = 37.5 + 5 + 12 + 13.5 = 68
      expect(calculateMomentum(12, 16, 1, 80, 90)).toBe(68);
    });

    it('should max out at 100', () => {
      expect(calculateMomentum(16, 16, 5, 100, 100)).toBe(100);
    });
  });

  describe('calculateRestDiscipline', () => {
    it('should return 100 if within 10s of target', () => {
      expect(calculateRestDiscipline(65, 60)).toBe(100);
      expect(calculateRestDiscipline(50, 60)).toBe(100);
    });

    it('should linearly decay between 10s and 60s', () => {
      // Pour 95 secondes de repos au lieu de 60 (diff 35s)
      // > 10s, reste 25s * 2 points = 50 => 100 - 50 = 50
      expect(calculateRestDiscipline(95, 60)).toBe(50);
    });

    it('should return 0 if diff >= 60s', () => {
      expect(calculateRestDiscipline(120, 60)).toBe(0);
      expect(calculateRestDiscipline(0, 60)).toBe(0); // diff is 60
    });
  });

  describe('calculateConsistency', () => {
    it('should return 100 for exact match', () => {
      expect(calculateConsistency(10, 10)).toBe(100);
    });

    it('should decay by 15 per missing/extra rep', () => {
      expect(calculateConsistency(9, 10)).toBe(85);
      expect(calculateConsistency(11, 10)).toBe(85);
    });

    it('should not go below 0', () => {
      expect(calculateConsistency(2, 10)).toBe(0);
    });
  });
});
