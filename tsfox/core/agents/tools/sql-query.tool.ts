import { ITool, AgentContext } from '../interfaces/agent.interface';

export interface IQueryExecutor {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
}

export function createSqlQueryTool(
  executor: IQueryExecutor,
  options: { allowMutations?: boolean; maxRows?: number; label?: string } = {},
): ITool {
  const allowMutations = options.allowMutations ?? false;
  const maxRows = options.maxRows ?? 100;
  const toolName = options.label ?? 'sql_query';

  return {
    definition: {
      name: toolName,
      description:
        'Execute SQL queries against the connected database. ' +
        (allowMutations
          ? 'Supports SELECT, INSERT, UPDATE, DELETE.'
          : 'Read-only: only SELECT statements are permitted.') +
        ` Results are capped at ${maxRows} rows.`,
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL statement to execute' },
          params: {
            type: 'array',
            description: 'Optional parameterised values',
            items: { type: 'string' },
          },
        },
        required: ['sql'],
      },
    },

    async execute(p: Record<string, unknown>, _ctx: AgentContext): Promise<string> {
      const sql = (p.sql as string).trim();
      const params = (p.params as unknown[]) ?? [];

      if (!allowMutations) {
        const upper = sql.toUpperCase().replace(/\s+/g, ' ');
        if (/^(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE)/.test(upper)) {
          throw new Error(`SqlQueryTool: mutation statements are not allowed.`);
        }
      }

      const result = await executor.query(sql, params);
      const rows = result.rows.slice(0, maxRows);

      if (rows.length === 0) return `Query executed. 0 rows returned. (rowCount: ${result.rowCount})`;

      const headers = Object.keys(rows[0] as object);
      const sep = headers.map(() => '---');
      const body = rows.map((row) => {
        const vals = headers.map((h) => {
          const v = (row as Record<string, unknown>)[h];
          return v === null || v === undefined ? 'NULL' : String(v);
        });
        return `| ${vals.join(' | ')} |`;
      }).join('\n');

      const truncNote = result.rows.length > maxRows
        ? `\n\n*Results truncated to ${maxRows} rows (total: ${result.rows.length})*`
        : '';

      return `| ${headers.join(' | ')} |\n| ${sep.join(' | ')} |\n${body}${truncNote}`;
    },
  };
}
