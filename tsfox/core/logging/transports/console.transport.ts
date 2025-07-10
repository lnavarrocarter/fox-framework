/**
 * @fileoverview Console transport for Fox Framework logging
 * @version 1.0.0
 * @since 2025-01-10
 */

import { ITransport, IFormatter, LogEntry, LogLevel } from '../interfaces';
import { DefaultFormatter } from '../formatters';

export class ConsoleTransport implements ITransport {
  name = 'console';
  
  constructor(
    public level: LogLevel = LogLevel.INFO,
    private formatter: IFormatter = new DefaultFormatter()
  ) {}

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    
    switch (entry.level) {
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(formatted);
        break;
    }
  }
}
