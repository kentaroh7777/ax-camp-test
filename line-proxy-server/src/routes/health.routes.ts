import { Router } from 'express';
import { HealthCheckService } from '../services/health-check.service';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const healthCheckService = new HealthCheckService();

// Basic health check endpoint
router.get('/', asyncHandler(async (req, res) => {
  const healthStatus = await healthCheckService.getBasicHealth();
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.status === 'healthy',
    ...healthStatus,
    timestamp: new Date().toISOString(),
  });
}));

// Detailed health check endpoint
router.get('/detailed', asyncHandler(async (req, res) => {
  logger.info('Detailed health check requested');
  
  const healthStatus = await healthCheckService.getDetailedHealth();
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.status !== 'unhealthy',
    ...healthStatus,
    timestamp: new Date().toISOString(),
  });
}));

// Liveness probe endpoint (for Kubernetes/Docker)
router.get('/live', asyncHandler(async (req, res) => {
  const isAlive = await healthCheckService.getLivenessStatus();
  
  if (isAlive) {
    res.status(200).json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not alive',
      timestamp: new Date().toISOString(),
    });
  }
}));

// Readiness probe endpoint (for Kubernetes/Docker)
router.get('/ready', asyncHandler(async (req, res) => {
  const isReady = await healthCheckService.getReadinessStatus();
  
  if (isReady) {
    res.status(200).json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
}));

// Circuit breaker status endpoint
router.get('/circuit-breaker', asyncHandler(async (req, res) => {
  const circuitStatus = await healthCheckService.getCircuitBreakerStatus();
  
  res.status(200).json({
    success: true,
    circuitBreaker: circuitStatus,
    timestamp: new Date().toISOString(),
  });
}));

// System metrics endpoint
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = await healthCheckService.getSystemMetrics();
  
  res.status(200).json({
    success: true,
    metrics,
    timestamp: new Date().toISOString(),
  });
}));

// LINE API connectivity check
router.get('/line-api', asyncHandler(async (req, res) => {
  const authorization = req.headers.authorization;
  
  if (!authorization) {
    return res.status(400).json({
      success: false,
      error: 'Authorization header required for LINE API health check',
      timestamp: new Date().toISOString(),
    });
  }

  const lineApiStatus = await healthCheckService.checkLineApiConnectivity(authorization);
  const statusCode = lineApiStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: lineApiStatus.status === 'healthy',
    lineApi: lineApiStatus,
    timestamp: new Date().toISOString(),
  });
}));

// Environment info endpoint (for debugging)
router.get('/env', asyncHandler(async (req, res) => {
  // Only expose safe environment info
  const envInfo = {
    nodeVersion: process.version,
    environment: config.NODE_ENV,
    platform: process.platform,
    architecture: process.arch,
    uptime: process.uptime(),
    pid: process.pid,
  };

  // Add more detailed info in development
  if (config.NODE_ENV === 'development') {
    envInfo['cwd'] = process.cwd();
    envInfo['memoryUsage'] = process.memoryUsage();
    envInfo['cpuUsage'] = process.cpuUsage();
  }

  res.status(200).json({
    success: true,
    environment: envInfo,
    timestamp: new Date().toISOString(),
  });
}));

// Health check history endpoint
router.get('/history', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = await healthCheckService.getHealthHistory(limit);
  
  res.status(200).json({
    success: true,
    history,
    count: history.length,
    timestamp: new Date().toISOString(),
  });
}));

// Startup check endpoint
router.get('/startup', asyncHandler(async (req, res) => {
  const startupStatus = await healthCheckService.getStartupStatus();
  const statusCode = startupStatus.ready ? 200 : 503;
  
  res.status(statusCode).json({
    success: startupStatus.ready,
    startup: startupStatus,
    timestamp: new Date().toISOString(),
  });
}));

export { router as healthRoutes };