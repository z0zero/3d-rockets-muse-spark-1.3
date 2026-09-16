import { describe, it, expect } from 'vitest';
import { getPhase, rocketY, ignitionAmount, LOOP } from '../sequence.js';

describe('sequence', () => {
  it('loops at 22s', () => { expect(LOOP).toBe(22); });
  it('phases match spec windows', () => {
    expect(getPhase(0.5)).toBe('idle');
    expect(getPhase(2.5)).toBe('ignition');
    expect(getPhase(5)).toBe('liftoff');
    expect(getPhase(10)).toBe('ascent');
    expect(getPhase(19)).toBe('reset');
  });
  it('rocket rises monotonically during liftoff+ascent', () => {
    expect(rocketY(6.5)).toBeGreaterThan(rocketY(3.5));
    expect(rocketY(15)).toBeGreaterThan(rocketY(6.5));
  });
  it('ignition ramps 0->1 and stays on until reset', () => {
    expect(ignitionAmount(0.5)).toBe(0);
    expect(ignitionAmount(3)).toBeGreaterThan(0.5);
    expect(ignitionAmount(10)).toBe(1);
  });
});
