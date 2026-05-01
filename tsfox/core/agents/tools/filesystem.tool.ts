import * as fs from 'fs';
import * as path from 'path';
import { ITool, AgentContext } from '../interfaces/agent.interface';

export function createFilesystemTool(options: { allowedBase?: string } = {}): ITool {
  const allowedBase = options.allowedBase ? path.resolve(options.allowedBase) : null;

  function safeResolve(filePath: string): string {
    const resolved = path.resolve(filePath);
    if (allowedBase && !resolved.startsWith(allowedBase + path.sep) && resolved !== allowedBase) {
      throw new Error(
        `FilesystemTool: path "${filePath}" is outside allowed base "${allowedBase}"`,
      );
    }
    return resolved;
  }

  return {
    definition: {
      name: 'filesystem',
      description:
        'Read, write, append, list, delete files and directories on the local filesystem.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['read', 'write', 'append', 'list', 'exists', 'delete', 'mkdir'],
            description: 'Filesystem operation to perform',
          },
          path: {
            type: 'string',
            description: 'File or directory path',
          },
          content: {
            type: 'string',
            description: 'Content to write or append',
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64', 'hex'],
            description: 'File encoding (default: utf8)',
          },
        },
        required: ['operation', 'path'],
      },
    },

    async execute(params: Record<string, unknown>, _ctx: AgentContext): Promise<string> {
      const operation = params.operation as string;
      const filePath = safeResolve(params.path as string);
      const encoding = (params.encoding as BufferEncoding) ?? 'utf8';

      switch (operation) {
        case 'read': {
          if (!fs.existsSync(filePath)) throw new Error(`FilesystemTool: file not found: "${filePath}"`);
          const content = fs.readFileSync(filePath, encoding);
          const stats = fs.statSync(filePath);
          return `File: ${filePath} (${stats.size} bytes)\n\n${content}`;
        }
        case 'write': {
          const content = (params.content as string) ?? '';
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content, encoding);
          return `Written ${content.length} characters to "${filePath}"`;
        }
        case 'append': {
          const content = (params.content as string) ?? '';
          fs.appendFileSync(filePath, content, encoding);
          const stats = fs.statSync(filePath);
          return `Appended ${content.length} characters to "${filePath}" (total: ${stats.size} bytes)`;
        }
        case 'list': {
          if (!fs.existsSync(filePath)) throw new Error(`FilesystemTool: directory not found: "${filePath}"`);
          const entries = fs.readdirSync(filePath, { withFileTypes: true });
          const lines = entries.map((e) => {
            const type = e.isDirectory() ? 'd' : 'f';
            const size = type === 'f' ? fs.statSync(path.join(filePath, e.name)).size : '-';
            return `[${type}] ${e.name}${type === 'f' ? ` (${size} bytes)` : '/'}`;
          });
          return `Contents of "${filePath}" (${lines.length} entries):\n${lines.join('\n')}`;
        }
        case 'exists': {
          const exists = fs.existsSync(filePath);
          const type = exists ? (fs.statSync(filePath).isDirectory() ? 'directory' : 'file') : 'not found';
          return `"${filePath}": ${type}`;
        }
        case 'delete': {
          if (!fs.existsSync(filePath)) return `"${filePath}" does not exist (nothing to delete)`;
          fs.unlinkSync(filePath);
          return `Deleted "${filePath}"`;
        }
        case 'mkdir': {
          fs.mkdirSync(filePath, { recursive: true });
          return `Directory created: "${filePath}"`;
        }
        default:
          throw new Error(`FilesystemTool: unknown operation "${operation}"`);
      }
    },
  };
}

export const FilesystemTool: ITool = createFilesystemTool();
