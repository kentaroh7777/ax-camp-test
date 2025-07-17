import fetch from 'node-fetch';

async function testFetch() {
  const url = 'http://localhost:3000/api/discord/send';
  const payload = {
    channelId: '1394492451317878804',
    content: '[Test] Hello from Node.js script!'
  };

  console.log(`Attempting to fetch from: ${url} with payload:`, payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log('Fetch response status:', response.status);
    console.log('Fetch response data:', data);
  } catch (error) {
    console.error('Fetch script failed:', error);
  }
}

testFetch();