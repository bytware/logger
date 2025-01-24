import type { SpyInstance } from 'jest-mock';
import logger from '../src';

// Mock console methods
const mockConsole = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  debug: jest.spyOn(console, 'debug').mockImplementation(),
} as const;

describe('@bytware/logger', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset environment variables
    process.env.LOG_LEVEL = undefined;
  });

  describe('log levels', () => {
    it('should log at info level by default', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect LOG_LEVEL=debug', () => {
      process.env.LOG_LEVEL = 'debug';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect LOG_LEVEL=info', () => {
      process.env.LOG_LEVEL = 'info';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect LOG_LEVEL=warn', () => {
      process.env.LOG_LEVEL = 'warn';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect LOG_LEVEL=error', () => {
      process.env.LOG_LEVEL = 'error';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should convert uppercase LOG_LEVEL values to lowercase', () => {
      // @ts-expect-error Testing runtime behavior with invalid type
      process.env.LOG_LEVEL = 'ERROR';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should default to info level for non-standard LOG_LEVEL values', () => {
      // @ts-expect-error Testing runtime behavior with invalid type
      process.env.LOG_LEVEL = 'invalid';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('module-based logging', () => {
    it('should create child logger with module name', () => {
      const authLogger = logger.child({ module: 'auth' });
      authLogger.info('User logged in');

      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.log.mock.calls[0][0]).toContain('[auth]');
    });

    it('should inherit parent context in child logger', () => {
      const userLogger = logger.setUserId('user-123').child({ module: 'user' });
      userLogger.info('Profile updated');

      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.log.mock.calls[0][0]).toContain('[user-123]');
      expect(mockConsole.log.mock.calls[0][0]).toContain('[user]');
    });
  });

  describe('user context', () => {
    it('should add user context to logs', () => {
      logger.setUserId('user-123').info('Action performed');

      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.log.mock.calls[0][0]).toContain('[user-123]');
    });

    it('should clear user context when null is passed', () => {
      logger
        .setUserId('user-123')
        .info('First log')
        .setUserId(null)
        .info('Second log');

      expect(mockConsole.log).toHaveBeenCalledTimes(2);
      expect(mockConsole.log.mock.calls[0][0]).toContain('[user-123]');
      expect(mockConsole.log.mock.calls[1][0]).not.toContain('[user-123]');
    });
  });

  describe('data formatting', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'debug'
    });

    it('should format debug data properly', () => {
      const data = { key: 'value' };
      logger.debug('Debug message', data);

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug.mock.calls[0][0]).toContain(JSON.stringify(data, null, 2));
    });

    it('should format error data with context', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error.mock.calls[0][0]).toContain('Test error');
    });

    it('should handle non-serializable data', () => {
      const circular: any = {};
      circular.self = circular;
      
      logger.debug('Debug with circular reference', circular);

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug.mock.calls[0][0]).toContain('[Circular]');
    });
  });

  describe('timestamp formatting', () => {
    it('should include properly formatted timestamp', () => {
      logger.info('Test message');

      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      // Match timestamp format [MM/DD HH:MM:SS.mmm]
      expect(mockConsole.log.mock.calls[0][0]).toMatch(/\[\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });
  });
});
