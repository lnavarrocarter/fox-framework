/**
 * @fileoverview Tests for Stream Transport
 * @version 1.0.0
 * @since 2025-01-11
 */

import { Writable } from 'stream';
import { StreamTransport } from '../transports/stream.transport';
import { LogLevel, LogEntry } from '../interfaces';
import { DefaultFormatter } from '../formatters';

class MockWritableStream extends Writable {
  public chunks: string[] = [];
  public writable = true;

  _write(chunk: any, encoding: string, callback: Function) {
    this.chunks.push(chunk.toString());
    callback();
  }

  getWrittenData(): string {
    return this.chunks.join('');
  }
}

describe('StreamTransport', () => {
  let mockStream: MockWritableStream;
  let transport: StreamTransport;

  beforeEach(() => {
    mockStream = new MockWritableStream();
    transport = new StreamTransport(LogLevel.INFO, mockStream);
  });

  afterEach(() => {
    transport.close();
  });

  it('should create transport with correct properties', () => {
    expect(transport.name).toBe('stream');
    expect(transport.level).toBe(LogLevel.INFO);
  });

  it('should write formatted log entry to stream', () => {
    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message',
      metadata: { key: 'value' }
    };

    transport.log(entry);

    const written = mockStream.getWrittenData();
    expect(written).toContain('Test message');
    expect(written).toContain('INFO');
    expect(written).toContain('2025-01-11T10:00:00.000Z');
    expect(written.endsWith('\n')).toBe(true);
  });

  it('should use custom formatter', () => {
    const customFormatter = {
      format: jest.fn().mockReturnValue('CUSTOM_FORMAT')
    };

    const customTransport = new StreamTransport(
      LogLevel.INFO,
      mockStream,
      customFormatter
    );

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    customTransport.log(entry);

    expect(customFormatter.format).toHaveBeenCalledWith(entry);
    expect(mockStream.getWrittenData()).toBe('CUSTOM_FORMAT\n');
  });

  it('should not write to non-writable stream', () => {
    mockStream.writable = false;

    const entry: LogEntry = {
      timestamp: '2025-01-11T10:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message'
    };

    transport.log(entry);

    expect(mockStream.getWrittenData()).toBe('');
  });

  it('should handle multiple log entries', () => {
    const entries: LogEntry[] = [
      {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'First message'
      },
      {
        timestamp: '2025-01-11T10:00:01.000Z',
        level: LogLevel.WARN,
        message: 'Second message'
      },
      {
        timestamp: '2025-01-11T10:00:02.000Z',
        level: LogLevel.ERROR,
        message: 'Third message'
      }
    ];

    entries.forEach(entry => transport.log(entry));

    const written = mockStream.getWrittenData();
    expect(written).toContain('First message');
    expect(written).toContain('Second message');
    expect(written).toContain('Third message');
    
    // Should have 3 newlines (one per entry)
    expect((written.match(/\n/g) || []).length).toBe(3);
  });

  it('should not close stdout/stderr streams', () => {
    const stdoutTransport = new StreamTransport(LogLevel.INFO, process.stdout);
    const stderrTransport = new StreamTransport(LogLevel.INFO, process.stderr);

    // Mock the end method to track if it's called
    const stdoutEndSpy = jest.spyOn(process.stdout, 'end').mockImplementation();
    const stderrEndSpy = jest.spyOn(process.stderr, 'end').mockImplementation();

    stdoutTransport.close();
    stderrTransport.close();

    expect(stdoutEndSpy).not.toHaveBeenCalled();
    expect(stderrEndSpy).not.toHaveBeenCalled();

    stdoutEndSpy.mockRestore();
    stderrEndSpy.mockRestore();
  });

  it('should close custom streams', () => {
    const endSpy = jest.spyOn(mockStream, 'end').mockImplementation();

    transport.close();

    expect(endSpy).toHaveBeenCalled();

    endSpy.mockRestore();
  });
});
