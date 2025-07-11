/**
 * @fileoverview Stream transport for Fox Framework logging
 * @version 1.0.0
 * @since 2025-01-11
 */

import { Writable } from 'stream';
import { ITransport, IFormatter, LogEntry, LogLevel } from '../interfaces';
import { DefaultFormatter } from '../formatters';

export class StreamTransport implements ITransport {
  name = 'stream';

  constructor(
    public level: LogLevel,
    private stream: Writable,
    private formatter: IFormatter = new DefaultFormatter()
  ) {}

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    
    if (this.stream.writable) {
      this.stream.write(formatted + '\n');
    }
  }

  close(): void {
    if (this.stream.writable && this.stream !== process.stdout && this.stream !== process.stderr) {
      this.stream.end();
    }
  }
}
