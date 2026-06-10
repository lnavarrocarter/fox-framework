// Mock for chalk ESM module used in CLI tests
// chalk v5+ is ESM-only and ts-jest may fail to transform it.
// Returns a callable proxy that acts as both a function and an object
// where every property access returns a chainable function.

function createChainable(): any {
  const fn = (..._args: any[]): any => createChainable();
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
        return () => '';
      }
      return createChainable();
    },
  });
}

const chalk = createChainable();
export default chalk;
