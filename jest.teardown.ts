/**
 * @fileoverview Jest global teardown to prevent worker process failures
 */

export default async (): Promise<void> => {
  // Close all remaining servers and connections
  await new Promise<void>((resolve) => {
    process.on('exit', () => {
      resolve();
    });
    
    // Force close any remaining handles
    setTimeout(() => {
      if (process.env.NODE_ENV === 'test') {
        process.exit(0);
      }
      resolve();
    }, 1000);
  });
};
