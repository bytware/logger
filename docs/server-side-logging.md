# Server-Side Logging Guide

This guide explains how to implement server-side only logging with `@bytware/logger`, ensuring all logs (even those initiated from the client) are processed and stored on the server.

## Overview

When building web applications, you often need to ensure that all logging happens on the server for:
- Security (preventing sensitive data exposure)
- Consistency (maintaining structured logging)
- Reliability (ensuring logs are properly stored)
- Compliance (meeting data handling requirements)

## Implementation

### 1. Create a Unified Logger

First, create a unified logger that detects the environment and routes logs accordingly:

```typescript
// lib/logger.ts
import baseLogger from '@bytware/logger'

interface LogContext {
  module?: string
  userId?: string
  [key: string]: any
}

class UnifiedLogger {
  private context: LogContext
  private isClient: boolean

  constructor(module: string = 'app') {
    this.context = { module }
    this.isClient = typeof window !== 'undefined'
  }

  private async sendToServer(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: object) {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          data,
          context: this.context
        })
      })
    } catch (err) {
      // Only show errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send log to server:', err)
      }
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: object) {
    if (this.isClient) {
      // Client-side: Send to server API
      this.sendToServer(level, message, data)
    } else {
      // Server-side: Use @bytware/logger directly
      const serverLogger = baseLogger.child({ module: this.context.module || 'app' })
      switch (level) {
        case 'debug':
          serverLogger.debug(message, data)
          break
        case 'info':
          serverLogger.info(message, data)
          break
        case 'warn':
          serverLogger.warn(message, data)
          break
        case 'error':
          serverLogger.error(message, data)
          break
      }
    }
    return this
  }

  debug(message: string, data?: object) {
    return this.log('debug', message, data)
  }

  info(message: string, data?: object) {
    return this.log('info', message, data)
  }

  warn(message: string, data?: object) {
    return this.log('warn', message, data)
  }

  error(message: string, data?: object) {
    return this.log('error', message, data)
  }

  setUserId(userId: string | null) {
    this.context = { ...this.context, userId: userId || undefined }
    return this
  }

  child(options: { module: string }) {
    const logger = new UnifiedLogger(options.module)
    logger.context = { ...this.context, ...options }
    return logger
  }
}

// Export singleton instance
export default new UnifiedLogger()

// Also export the class for testing/mocking
export { UnifiedLogger }
```

### 2. Create a Logging API Endpoint

Create an API endpoint to handle client-side logs:

```typescript
// app/api/log/route.ts
import { NextResponse } from 'next/server'
import baseLogger from '@bytware/logger'

const log = baseLogger.child({ module: 'client-logger' })

export async function POST(request: Request) {
  try {
    const { level, message, data, context } = await request.json()
    
    // Create child logger with context
    const logger = log.child(context)
    
    // Route to appropriate log level
    switch (level) {
      case 'debug':
        logger.debug(message, data)
        break
      case 'info':
        logger.info(message, data)
        break
      case 'warn':
        logger.warn(message, data)
        break
      case 'error':
        logger.error(message, data)
        break
      default:
        logger.info(message, data)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to process client log', { error })
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    )
  }
}
```

### 3. Usage

Use the unified logger throughout your application:

```typescript
import logger from '@/lib/logger'

// Create module-specific logger
const log = logger.child({ module: 'my-component' })

// Set user context when available
log.setUserId(user.id)

// Log at different levels
log.debug('Debug message', { details: 'extra info' })
log.info('Operation successful', { duration: '100ms' })
log.warn('Rate limit approaching')
log.error('Operation failed', { error })
```

## Best Practices

1. **Module Context**: Always use `child()` to create module-specific loggers:
   ```typescript
   const log = logger.child({ module: 'component-name' })
   ```

2. **User Context**: Set user ID when available:
   ```typescript
   useEffect(() => {
     const userId = localStorage.getItem('userId')
     if (userId) {
       log.setUserId(userId)
     }
   }, [])
   ```

3. **Structured Data**: Pass structured data as the second argument:
   ```typescript
   log.info('User action', {
     action: 'button_click',
     target: 'submit',
     duration: 150
   })
   ```

4. **Error Handling**: Include full error context:
   ```typescript
   try {
     // ... code ...
   } catch (error) {
     log.error('Operation failed', {
       error,
       stack: error instanceof Error ? error.stack : undefined,
       context: additionalContext
     })
   }
   ```

5. **Environment Configuration**:
   - Use `LOG_LEVEL` environment variable to control logging
   - Available levels: debug, info, warn, error
   - Defaults to 'info' if not specified

## Security Considerations

1. **API Protection**: Secure the logging endpoint:
   - Add rate limiting
   - Validate request origin
   - Require authentication when possible

2. **Data Sanitization**: Sanitize sensitive data:
   - Remove passwords, tokens, etc.
   - Mask personal information
   - Follow data protection regulations

3. **Error Handling**: Never expose internal errors to clients:
   - Log full errors server-side
   - Return sanitized error messages to clients
   - Monitor for unusual logging patterns

## Testing

The exported `UnifiedLogger` class can be used for testing:

```typescript
import { UnifiedLogger } from '@/lib/logger'

describe('UnifiedLogger', () => {
  let logger: UnifiedLogger

  beforeEach(() => {
    logger = new UnifiedLogger('test')
  })

  test('logs are sent to server in client environment', async () => {
    // Test implementation
  })

  test('logs use baseLogger in server environment', () => {
    // Test implementation
  })
})
```

## Environment Variables

Configure logging behavior with environment variables:

```env
# Control log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable detailed logging in development
NEXT_PUBLIC_DEBUG_MODE=true

# Control log destination
LOG_DESTINATION=stdout # or file, etc.
```

## Monitoring and Debugging

1. **Development Mode**: 
   - Set `NEXT_PUBLIC_DEBUG_MODE=true` for detailed logging
   - Failed client-to-server log transfers will show in console

2. **Production Mode**:
   - Failed transfers are silently ignored
   - Monitor API endpoint for errors
   - Set up alerts for logging failures

## Migration Guide

If migrating from direct `console.log` usage:

1. Replace direct console calls:
   ```typescript
   // Before
   console.log('Message', data)
   
   // After
   log.info('Message', data)
   ```

2. Add module context:
   ```typescript
   // Before
   const log = console
   
   // After
   const log = logger.child({ module: 'component-name' })
   ```

3. Update error handling:
   ```typescript
   // Before
   console.error(error)
   
   // After
   log.error('Operation failed', {
     error,
     stack: error instanceof Error ? error.stack : undefined
   })
   ``` 