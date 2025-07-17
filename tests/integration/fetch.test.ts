import { describe, it, expect } from 'vitest';

describe('Fetch Connectivity Test', () => {
  it('should be able to fetch from the local proxy server health endpoint', async () => {
    const proxyUrl = process.env.PROXY_SERVER_URL || 'http://localhost:3000';
    const healthUrl = `${proxyUrl}/api/health`;

    console.log(`Attempting to fetch from: ${healthUrl}`);

    try {
      const response = await fetch(healthUrl);
      const data = await response.json();

      console.log('Fetch response status:', response.status);
      console.log('Fetch response data:', data);

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
    } catch (error) {
      console.error('Fetch test failed:', error);
      throw error;
    }
  }, 10000); // タイムアウトを10秒に設定
});