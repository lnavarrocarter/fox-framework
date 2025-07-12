// Mock for inquirer to fix ES module issues in Jest
const inquirer = {
  prompt: jest.fn().mockResolvedValue({}),
  Separator: class MockSeparator {},
  ui: {
    BottomBar: class MockBottomBar {},
    Prompt: class MockPrompt {}
  }
};

module.exports = inquirer;
module.exports.default = inquirer;
