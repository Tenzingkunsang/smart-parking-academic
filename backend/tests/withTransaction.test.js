const { isTxnUnsupportedError } = require('../src/utils/withTransaction');

describe('isTxnUnsupportedError', () => {
  test('identifies standalone-Mongo error codes', () => {
    expect(isTxnUnsupportedError({ code: 20 })).toBe(true);
    expect(isTxnUnsupportedError({ code: 40573 })).toBe(true);
  });

  test('identifies textual error markers', () => {
    expect(isTxnUnsupportedError({ message: 'Transaction numbers are only allowed on a replica set' })).toBe(true);
    expect(isTxnUnsupportedError({ message: 'not supported on a standalone' })).toBe(true);
  });

  test('returns false for ordinary errors', () => {
    expect(isTxnUnsupportedError(new Error('connection lost'))).toBe(false);
    expect(isTxnUnsupportedError(null)).toBe(false);
  });
});
