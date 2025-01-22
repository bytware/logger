declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LOG_LEVEL?: LogLevel
    }
  }
}

interface LogContext {
  module?: string
  userId?: string
  [key: string]: any
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const LEVEL_COLORS = {
  debug: '\x1b[90m', // gray
  info: '\x1b[34m',  // blue
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m'  // red
} as const

// Get configured log level from environment
const getLogLevel = (): LogLevel => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
  return LEVEL_VALUES[level] !== undefined ? level : 'info'
}

// Check if a log level meets the minimum configured level
const shouldLog = (level: LogLevel): boolean => {
  const configuredLevel = getLogLevel()
  return LEVEL_VALUES[level] >= LEVEL_VALUES[configuredLevel]
}

// Get module color hash for consistent coloring
const getModuleColor = (moduleName: string): number => {
  let hash = 0;
  for (let i = 0; i < moduleName.length; i++) {
    hash = moduleName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

// Format debug object for better readability
const formatDebugObject = (obj: any): string => {
  if (!obj || Object.keys(obj).length === 0) return ''
  try {
    if (obj instanceof Error) {
      return `\n${obj.stack || obj.message}`
    }
    if (obj.error instanceof Error) {
      return `\n${obj.error.stack || obj.error.message}`
    }
    
    // Keep track of objects that have been stringified
    const seen = new WeakSet()
    return '\n' + JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }
      return value
    }, 2)
  } catch (err) {
    return `\n[Unable to stringify object: ${err}]`
  }
}

const formatTime = () => {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, '0')
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `\x1b[2m[${month}/${day} ${hours}:${minutes}:${seconds}.${ms}]\x1b[0m`
}

const formatLogMessage = (level: LogLevel, context: LogContext, message: string, data?: any): string => {
  const module = context.module || 'app'
  const moduleHue = getModuleColor(module)
  const moduleColor = `\x1b[38;2;${Math.round(127 + 127 * Math.sin(moduleHue * Math.PI / 180))};${Math.round(127 + 127 * Math.sin((moduleHue + 120) * Math.PI / 180))};${Math.round(127 + 127 * Math.sin((moduleHue + 240) * Math.PI / 180))}m`
  const userPart = context.userId ? ` \x1b[35m[${context.userId}]\x1b[0m` : ''
  const levelStr = `${LEVEL_COLORS[level]}${level.toUpperCase()} \x1b[0m`.padEnd(10)
  const timestamp = formatTime()
  
  let debugData = ''
  if (level === 'debug') {
    // In debug mode, show all context data
    const contextData = { ...context }
    delete contextData.module // Don't show module in data since it's in the prefix
    if (Object.keys(contextData).length > 0) {
      debugData += formatDebugObject(contextData)
    }
    if (data) {
      debugData += formatDebugObject(data)
    }
  } else if (level === 'error') {
    // For errors, always show all data
    const errorData = {
      ...data,
      context: { ...context, module: undefined } // Include context but exclude module
    }
    if (Object.keys(errorData).length > 0) {
      debugData = formatDebugObject(errorData)
    }
  } else if (data) {
    // For other levels, only show data if explicitly provided
    debugData = formatDebugObject(data)
  }
  
  return `${timestamp} ${levelStr}${moduleColor}[${module}]\x1b[0m${userPart} ${message}${debugData}`
}

class Logger {
  private context: LogContext

  constructor(module: string = 'app') {
    this.context = { module }
  }

  private log(level: LogLevel, message: string, data?: object) {
    if (!shouldLog(level)) return this

    const formattedMessage = formatLogMessage(level, this.context, message, data)
    switch (level) {
      case 'error':
        console.error(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'debug':
        console.debug(formattedMessage)
        break
      default:
        console.log(formattedMessage)
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
    const logger = new Logger(options.module)
    logger.context = { ...this.context, ...options }
    return logger
  }
}

export default new Logger()
