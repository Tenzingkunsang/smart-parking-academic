import { getSocketOrigin } from './config/api';

test('derives socket origin from API base', () => {
  const origin = getSocketOrigin();
  expect(typeof origin).toBe('string');
  expect(origin.length).toBeGreaterThan(0);
});
