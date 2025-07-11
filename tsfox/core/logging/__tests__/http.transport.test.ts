/**
 * @fileoverview Tests for HTTP Transport
 * @version 1.0.0
 * @since 2025-01-11
 */

import { HttpTransport } from '../transports/http.transport';
import { LogLevel, LogEntry } from '../interfaces';
import { JsonFormatter } from '../formatters';

// Mock fetch globally
global.fetch = jest.fn();

describe('HttpTransport', () => {
  let transport: HttpTransport;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    transport = new HttpTransport(
      LogLevel.INFO,
      {
        url: 'http://localhost:3000/logs',
        batchSize: 2,
        batchTimeout: 100
      }
    );
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await transport.close();
  });

  it('should create transport with correct properties', () => {
    expect(transport.name).toBe('http');
    expect(transport.level).toBe(LogLevel.INFO);
  });

  it('should batch logs and send when batch size reached', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    const entry1: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message 1'
    };

    const entry2: LogEntry = {
      timestamp: '2025-01-11T10:00:00.100Z',
      level: LogLevel.INFO,
      message: 'Test message 2'
    };

    // Add entries to trigger batch send
    await transport.log(entry1);
    await transport.log(entry2);

    // Wait a bit for async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/logs',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test message 1')
      })
    );
  });

  it('should send logs after timeout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    await transport.log(entry);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    // First call fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    await transport.log(entry);
    await transport.log(entry); // Trigger batch send

    // Wait for retry
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle HTTP error responses', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    } as Response);

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    await transport.log(entry);
    await transport.log(entry); // Trigger batch send

    // Wait for retries to complete
    await new Promise(resolve => setTimeout(resolve, 3200));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('HTTP transport failed'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should use custom headers', async () => {
    const customTransport = new HttpTransport(
      LogLevel.INFO,
      {
        url: 'http://localhost:3000/logs',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom': 'custom-value'
        },
        batchSize: 1
      }
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    await customTransport.log(entry);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/logs',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer token123',
          'X-Custom': 'custom-value'
        })
      })
    );

    await customTransport.close();
  });

  it('should flush remaining logs on close', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    await transport.log(entry);
    await transport.close();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
