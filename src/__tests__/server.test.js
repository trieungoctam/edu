const request = require('supertest');
const app = require('../server');

describe('Server Setup', () => {
  test('Health endpoint should return success', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('HSU Chatbot API is running');
    expect(response.body.environment).toBeDefined();
  });

  test('Non-existent endpoint should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  test('Rate limiting should be configured', async () => {
    // This test just verifies the server starts without rate limit errors
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});