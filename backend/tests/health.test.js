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
