# LINE Proxy Server

A Node.js Express server that acts as a proxy for LINE Messaging API calls, specifically designed to bypass CORS restrictions for Chrome extensions.

## Features

- 🚀 **LINE API Proxy**: Complete proxy functionality for LINE Messaging API
- 🔒 **CORS Support**: Configured to allow Chrome extension origins
- 🛡️ **Security**: Built-in authentication, rate limiting, and input validation
- 🔄 **Circuit Breaker**: Resilient API calls with automatic failure handling
- 📊 **Health Monitoring**: Comprehensive health checks and metrics
- 🪝 **Webhook Support**: Handle LINE webhook events with signature verification
- 📝 **Comprehensive Logging**: Structured logging with multiple output formats
- 🐳 **Docker Ready**: Containerized for easy deployment
- 🚂 **Railway Compatible**: Pre-configured for Railway deployment

## Quick Start

### Local Development

1. **Clone and setup**:
   ```bash
   cd line-proxy-server
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` with the following endpoints:

- `GET /` - Server information
- `GET /api/health` - Health check
- `POST /api/line/message/push` - Send push messages
- `POST /api/webhook` - LINE webhook endpoint

### Docker Deployment

1. **Build the image**:
   ```bash
   docker build -t line-proxy-server .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e PORT=3000 \
     line-proxy-server
   ```

### Railway Deployment

1. **Connect your repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy** - Railway will automatically use the `railway.json` configuration

## API Endpoints

### LINE API Proxy

All LINE API endpoints require `Authorization: Bearer <LINE_CHANNEL_ACCESS_TOKEN>` header.

#### Messages

- `POST /api/line/message/push` - Send push message
- `POST /api/line/message/multicast` - Send multicast message
- `POST /api/line/message/broadcast` - Send broadcast message
- `POST /api/line/message/reply` - Reply to message

#### Bot Information

- `GET /api/line/bot/info` - Get bot information
- `GET /api/line/profile/:userId` - Get user profile
- `GET /api/line/quota` - Get message quota

### Health & Monitoring

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health with dependencies
- `GET /api/health/live` - Liveness probe (for containers)
- `GET /api/health/ready` - Readiness probe (for containers)
- `GET /api/health/metrics` - System metrics

### Webhooks

- `POST /api/webhook` - LINE webhook endpoint
- `GET /api/webhook/status` - Webhook status and statistics

## Configuration

### Environment Variables

Key configuration options:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# LINE API
LINE_API_BASE_URL=https://api.line.me/v2/bot
LINE_API_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_STRICT_MAX=100

# Security
AUTH_REQUIRE_HTTPS=true
WEBHOOK_SIGNATURE_VALIDATION=true

# Features
FEATURE_LINE_API_PROXY=true
FEATURE_WEBHOOK_SUPPORT=true
FEATURE_CIRCUIT_BREAKER=true
```

See `.env.example` for complete configuration options.

### CORS Configuration

The server is pre-configured to allow:

- Chrome extensions (`chrome-extension://`)
- Mozilla extensions (`moz-extension://`)
- Gmail (`https://mail.google.com`)
- Discord (`https://discord.com`)
- LINE (`https://line.me`)

## Usage Examples

### Send a Text Message

```javascript
const response = await fetch('https://your-proxy-server.com/api/line/message/push', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_LINE_CHANNEL_ACCESS_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'USER_ID',
    messages: [
      {
        type: 'text',
        text: 'Hello from Chrome Extension!'
      }
    ]
  })
});

const result = await response.json();
console.log(result);
```

### Chrome Extension Integration

```javascript
// In your Chrome extension content script
const sendLineMessage = async (userId, message) => {
  try {
    const response = await fetch('https://your-proxy-server.com/api/line/message/push', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + lineAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Message sent successfully:', result);
    } else {
      console.error('Failed to send message:', await response.json());
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Chrome          │    │ LINE Proxy       │    │ LINE            │
│ Extension       │◄──►│ Server           │◄──►│ Messaging API   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│ Gmail/Discord   │    │ Health Checks    │
│ Web Pages       │    │ Metrics          │
└─────────────────┘    └──────────────────┘
```

### Key Components

1. **API Gateway Layer**: Express.js routing with CORS, rate limiting, and validation
2. **Business Logic Layer**: LINE API service with circuit breaker protection
3. **Infrastructure Layer**: HTTP client, logging, and health monitoring

## Development

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Testing

The project includes comprehensive tests:

- Unit tests for middleware components
- Integration tests for API endpoints
- Mock LINE API responses
- CORS and authentication testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test -- --coverage # With coverage report
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting with TypeScript rules
- **Jest**: Testing framework with mocks
- **Prettier**: Code formatting (if configured)

## Security

### Authentication

- Bearer token validation for all LINE API endpoints
- Token format validation and sanitization
- Request logging with sensitive data masking

### Rate Limiting

- Global rate limiting (1000 requests per 15 minutes)
- Strict rate limiting for LINE API (100 requests per minute)
- Message-specific limiting (50 messages per minute)

### CORS Protection

- Whitelist-based origin validation
- Chrome extension origin support
- Preflight request handling

### Input Validation

- Request body validation with express-validator
- LINE message format validation
- File upload restrictions

## Monitoring

### Health Checks

- **Basic**: Server status and uptime
- **Detailed**: Dependencies and system metrics
- **Liveness**: Container health for orchestrators
- **Readiness**: Traffic readiness indicator

### Metrics

- Request counts and response times
- Error rates and types
- Memory and CPU usage
- Circuit breaker statistics

### Logging

- Structured JSON logging
- Request/response logging
- Error tracking with stack traces
- Performance monitoring

## Deployment

### Environment Requirements

- Node.js 18+ 
- 1GB RAM minimum
- SSL certificate for production

### Railway Deployment

1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway automatically detects and uses `railway.json`
4. SSL certificate is provided automatically

### Docker Deployment

The Docker image includes:

- Multi-stage build for optimization
- Non-root user for security
- Health check endpoint
- Proper signal handling

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
AUTH_REQUIRE_HTTPS=true
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=1000
CIRCUIT_BREAKER_ENABLED=true
HEALTH_CHECK_ENABLED=true
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Verify origin is in allowed list
2. **Authentication Failures**: Check LINE access token format
3. **Rate Limiting**: Monitor rate limit headers
4. **Circuit Breaker Open**: Check LINE API status

### Debug Mode

Enable debug mode for detailed logging:

```bash
NODE_ENV=development
LOG_LEVEL=debug
FEATURE_DEBUG_MODE=true
```

### Health Check

Monitor server health:

```bash
curl https://your-server.com/api/health/detailed
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- Check the health endpoint: `/api/health/detailed`
- Review logs for error details
- Verify LINE API credentials and permissions
- Check rate limiting headers in responses