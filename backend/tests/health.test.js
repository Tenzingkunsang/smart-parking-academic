const request = require('supertest');
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
const createApp = require('../src/app');

describe('Health endpoint', () => {
  it('returns health status payload', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('version', 'v1');
  });
});

describe('Auth-protected routes', () => {
  it('rejects /api/v1/reservations/my without a token', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/reservations/my');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects /api/v1/admin/analytics/insights without admin auth', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/admin/analytics/insights');
    expect(response.status).toBe(401);
  });

  it('responds 404 on an unknown route', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
  });
});
