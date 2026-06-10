// Mock for inquirer ESM module v9+ used in CLI tests
// inquirer is interactive — tests never need it
const mockInquirer: any = {
  prompt: () => Promise.resolve({}),
  registerPrompt: () => {},
  createPromptModule: () => mockInquirer,
  Separator: class {},
  ui: { Prompt: class {}, BottomBar: class {} },
};

export default mockInquirer;
