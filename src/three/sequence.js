export const LOOP = 22;

export function getPhase(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 2) return 'idle';
  if (x < 3.5) return 'ignition';
  if (x < 6.5) return 'liftoff';
  if (x < 17) return 'ascent';
  return 'reset';
}

export function ignitionAmount(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 2) return 0;
  if (x < 3.5) return (x - 2) / 1.5;
  if (x < 17) return 1;
  return Math.max(0, 1 - (x - 17) / 1.5);
}

export function rocketY(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 3.5) return 0;
  if (x < 6.5) {
    const k = (x - 3.5) / 3;
    return 8 * k * k;
  }
  if (x < 17) {
    const k = (x - 6.5) / 10.5;
    return 8 + 120 * k * k;
  }
  return 128;
}
