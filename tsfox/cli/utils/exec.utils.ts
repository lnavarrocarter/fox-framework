import { exec } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

/**
 * Execute command with better error handling
 */
export async function execCommand(command: string, options?: any): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, { encoding: 'utf8', ...options });
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString()
    };
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}
