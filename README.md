# @bytware/logger

A structured, colorful logging utility for Node.js applications with support for module-based logging, user context, and customizable log levels.

## Features

- 🎨 Colorful console output
- 📦 Module-based logging
- 👤 User context support
- 🔍 Multiple log levels (debug, info, warn, error)
- ⚙️ Configurable via environment variables
- 🎯 TypeScript support

## Installation

```bash
npm install @bytware/logger
# or
yarn add @bytware/logger
# or
pnpm add @bytware/logger
```

## Usage

```typescript
import logger from '@bytware/logger';

// Basic usage
logger.info('Application started');
logger.debug('Debug information', { someData: 123 });
logger.warn('Warning message');
logger.error('Error occurred', { error: new Error('Something went wrong') });

// Module-based logging
const authLogger = logger.child({ module: 'auth' });
authLogger.info('User logged in', { userId: '123' });

// Set user context
logger.setUserId('user-123')
  .info('Action performed by user');

// Clear user context
logger.setUserId(null);
```

## Configuration

Set the log level using the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug # Show all logs
LOG_LEVEL=info  # Show info and above (default)
LOG_LEVEL=warn  # Show only warnings and errors
LOG_LEVEL=error # Show only errors
```

## Log Levels

- `debug`: Detailed information for debugging
- `info`: General operational events
- `warn`: Warning conditions
- `error`: Error conditions that should be investigated

## Output Format

```
[DD/MM HH:MM:SS.mmm] LEVEL [module] [userId] message data
```

## License

MIT
