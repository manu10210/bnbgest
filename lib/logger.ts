/**
 * 📊 Structured Logging System
 * Production-ready logging with levels, metadata, and formatting
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogMetadata {
  [key: string]: any;
  userId?: string;
  requestId?: string;
  route?: string;
  duration?: number;
  statusCode?: number;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private formatLog(level: LogLevel, message: string, metadata?: LogMetadata): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: metadata || {},
    };
  }

  private output(entry: LogEntry) {
    const { level, message, metadata, timestamp } = entry;

    // Console colors for development
    const colors = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      fatal: '\x1b[35m',   // Magenta
      reset: '\x1b[0m',
    };

    if (this.isDevelopment) {
      // Pretty console output for development
      const color = colors[level];
      const prefix = `${color}[${level.toUpperCase()}]${colors.reset}`;
      console.log(`${prefix} ${timestamp} - ${message}`, metadata || '');
    } else {
      // JSON output for production (easily parseable by log aggregators)
      console.log(JSON.stringify(entry));
    }

    // Send to external logging service in production
    if (this.isProduction) {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry) {
    // TODO: Send to logging service (Datadog, Logtail, Better Stack, etc.)
    // Example for Better Stack (Logtail):
    /*
    if (process.env.LOGTAIL_SOURCE_TOKEN) {
      fetch('https://in.logtail.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOGTAIL_SOURCE_TOKEN}`,
        },
        body: JSON.stringify(entry),
      }).catch(err => console.error('Failed to send log to Logtail:', err));
    }
    */
  }

  /**
   * Debug level - Detailed debugging information
   */
  debug(message: string, metadata?: LogMetadata) {
    if (this.isDevelopment) {
      this.output(this.formatLog('debug', message, metadata));
    }
  }

  /**
   * Info level - General informational messages
   */
  info(message: string, metadata?: LogMetadata) {
    this.output(this.formatLog('info', message, metadata));
  }

  /**
   * Warn level - Warning messages
   */
  warn(message: string, metadata?: LogMetadata) {
    this.output(this.formatLog('warn', message, metadata));
  }

  /**
   * Error level - Error messages
   */
  error(message: string, error?: Error, metadata?: LogMetadata) {
    const entry = this.formatLog('error', message, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(entry);
  }

  /**
   * Fatal level - Critical errors requiring immediate attention
   */
  fatal(message: string, error?: Error, metadata?: LogMetadata) {
    const entry = this.formatLog('fatal', message, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(entry);
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, metadata?: LogMetadata) {
    this.info(`API ${method} ${path}`, {
      ...metadata,
      route: path,
      method,
    });
  }

  /**
   * Log API response
   */
  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: LogMetadata
  ) {
    const msg = `API ${method} ${path} ${statusCode}`;
    const meta = {
      ...metadata,
      route: path,
      method,
      statusCode,
      duration,
    };

    if (statusCode >= 500) {
      this.error(msg, undefined, meta);
    } else if (statusCode >= 400) {
      this.warn(msg, meta);
    } else {
      this.info(msg, meta);
    }
  }

  /**
   * Log authentication event
   */
  auth(event: string, userId?: string, metadata?: LogMetadata) {
    this.info(`Auth: ${event}`, {
      ...metadata,
      userId,
      event,
    });
  }

  /**
   * Log database query
   */
  database(operation: string, table: string, duration: number, metadata?: LogMetadata) {
    this.debug(`DB ${operation} ${table}`, {
      ...metadata,
      operation,
      table,
      duration,
    });
  }

  /**
   * Log cache hit/miss
   */
  cache(event: 'hit' | 'miss' | 'set' | 'delete', key: string, metadata?: LogMetadata) {
    this.debug(`Cache ${event}: ${key}`, {
      ...metadata,
      event,
      key,
    });
  }

  /**
   * Log rate limit event
   */
  rateLimit(action: 'allowed' | 'blocked', ip: string, route: string, metadata?: LogMetadata) {
    const level = action === 'blocked' ? 'warn' : 'debug';
    
    this[level](`Rate limit ${action}: ${ip} on ${route}`, {
      ...metadata,
      action,
      ip,
      route,
    });
  }

  /**
   * Log integration event (Airbnb, Booking, Stripe, etc.)
   */
  integration(
    platform: string,
    event: string,
    success: boolean,
    metadata?: LogMetadata
  ) {
    const msg = `${platform} integration: ${event}`;
    const meta = {
      ...metadata,
      platform,
      event,
      success,
    };

    if (success) {
      this.info(msg, meta);
    } else {
      this.error(msg, undefined, meta);
    }
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Performance monitoring helper
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.debug(`Performance: ${name} completed`, { name, duration });
      }) as T;
    }
    
    const duration = performance.now() - start;
    logger.debug(`Performance: ${name} completed`, { name, duration });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Performance: ${name} failed`, error as Error, { name, duration });
    throw error;
  }
}

/**
 * Async performance monitoring decorator
 */
export function logPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    
    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;
      
      logger.debug(`${target.constructor.name}.${propertyKey} completed`, {
        class: target.constructor.name,
        method: propertyKey,
        duration,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      logger.error(
        `${target.constructor.name}.${propertyKey} failed`,
        error as Error,
        {
          class: target.constructor.name,
          method: propertyKey,
          duration,
        }
      );
      
      throw error;
    }
  };

  return descriptor;
}

export default logger;
