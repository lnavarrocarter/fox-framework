/**
 * @fileoverview Epic C1 — Agents Core test suite
 */

import {
  InMemoryStore,
  ReActAgent,
  Orchestrator,
  AgentAbortedError,
  MaxIterationsError,
  ToolExecutionError,
  OrchestratorError,
} from '../index';
import type {
  IModelProvider,
  ModelMessage,
  ModelOptions,
  ModelResponse,
  StreamChunk,
  ITool,
  AgentContext,
  IAgent,
  AgentDefinition,
} from '../interfaces/agent.interface';

// ── Mock model provider ───────────────────────────────────────────────────────

type CompleteHandler = (messages: ModelMessage[], options?: ModelOptions) => ModelResponse | Promise<ModelResponse>;

class MockModelProvider implements IModelProvider {
  readonly name = 'mock';
  private _handler: CompleteHandler;

  constructor(handler: CompleteHandler) {
    this._handler = handler;
  }

  setHandler(h: CompleteHandler) { this._handler = h; }

  async complete(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse> {
    return this._handler(messages, options);
  }

  async *stream(_messages: ModelMessage[], _options?: ModelOptions): AsyncIterable<StreamChunk> {
    yield { delta: 'mock', done: true };
  }
}

function simpleModel(answer: string): MockModelProvider {
  return new MockModelProvider(() => ({
    content: answer,
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: 'stop',
  }));
}

// ── Mock tool ─────────────────────────────────────────────────────────────────

function makeTool(name: string, fn: (args: Record<string, unknown>) => unknown): ITool {
  return {
    definition: {
      name,
      description: `Tool: ${name}`,
      parameters: {
        type: 'object',
        properties: { input: { type: 'string' } },
        required: ['input'],
      },
    },
    async execute(args, _ctx) { return fn(args); },
  };
}

// ── InMemoryStore ─────────────────────────────────────────────────────────────

describe('InMemoryStore', () => {
  let store: InMemoryStore;
  beforeEach(() => { store = new InMemoryStore(); });

  it('adds and retrieves entries', async () => {
    const e = await store.add({ content: 'hello world' });
    expect(e.id).toMatch(/^mem_/);
    expect(e.content).toBe('hello world');
    const all = await store.getAll();
    expect(all).toHaveLength(1);
  });

  it('searches by keyword', async () => {
    await store.add({ content: 'the quick brown fox' });
    await store.add({ content: 'lazy dog sleeping' });
    const results = await store.search('fox');
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('fox');
  });

  it('returns top N results sorted by score', async () => {
    await store.add({ content: 'apple banana cherry' });
    await store.add({ content: 'apple banana' });
    await store.add({ content: 'cherry only' });
    const results = await store.search('apple banana', 2);
    expect(results).toHaveLength(2);
    expect(results[0].content).toContain('apple');
    expect(results[0].content).toContain('banana');
  });

  it('clears all entries', async () => {
    await store.add({ content: 'foo' });
    await store.clear();
    expect(await store.getAll()).toHaveLength(0);
  });

  it('returns empty array when no matches', async () => {
    await store.add({ content: 'hello' });
    const r = await store.search('xyz');
    expect(r).toHaveLength(0);
  });
});

// ── ReActAgent — basic flow ───────────────────────────────────────────────────

describe('ReActAgent — basic', () => {
  it('returns model answer directly when no tool calls', async () => {
    const agent = new ReActAgent(simpleModel('42'), {
      name: 'test-agent',
      systemPrompt: 'You are a helpful assistant.',
    });
    const result = await agent.run('What is 6 * 7?');
    expect(result.status).toBe('completed');
    expect(result.answer).toBe('42');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe('final_answer');
  });

  it('accumulates usage tokens', async () => {
    const agent = new ReActAgent(simpleModel('done'), {
      name: 'usage-agent',
      systemPrompt: 'sys',
    });
    const result = await agent.run('hello');
    expect(result.usage?.totalTokens).toBe(15);
  });

  it('stores Q&A in memory when configured', async () => {
    const store = new InMemoryStore();
    const agent = new ReActAgent(simpleModel('Paris'), {
      name: 'memory-agent',
      systemPrompt: 'sys',
      memory: store,
    });
    await agent.run('Capital of France?');
    const entries = await store.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toContain('Paris');
  });

  it('executes tool calls and injects results', async () => {
    let callCount = 0;
    const model = new MockModelProvider((msgs) => {
      callCount++;
      if (callCount === 1) {
        // First call: request a tool
        return {
          content: 'Let me look that up.',
          toolCalls: [{
            id: 'tc_001',
            type: 'function',
            function: { name: 'lookup', arguments: JSON.stringify({ input: 'fox' }) },
          }],
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
          finishReason: 'tool_calls',
        };
      }
      // Second call: final answer
      return {
        content: 'The fox is a mammal.',
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
        finishReason: 'stop',
      };
    });

    const tool = makeTool('lookup', (args) => `result for ${args.input}`);
    const agent = new ReActAgent(model, {
      name: 'tool-agent',
      systemPrompt: 'sys',
      tools: [tool],
    });

    const result = await agent.run('What is a fox?');
    expect(result.status).toBe('completed');
    expect(result.answer).toBe('The fox is a mammal.');
    const types = result.steps.map(s => s.type);
    expect(types).toContain('thought');
    expect(types).toContain('tool_call');
    expect(types).toContain('tool_result');
    expect(types).toContain('final_answer');
  });

  it('throws MaxIterationsError when loop exceeds limit', async () => {
    // Model always requests a tool → infinite loop
    const model = new MockModelProvider(() => ({
      content: 'thinking...',
      toolCalls: [{
        id: 'tc_001',
        type: 'function',
        function: { name: 'noop', arguments: '{}' },
      }],
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      finishReason: 'tool_calls',
    }));

    const tool = makeTool('noop', () => 'ok');
    const agent = new ReActAgent(model, {
      name: 'loop-agent',
      systemPrompt: 'sys',
      tools: [tool],
      maxIterations: 3,
    });

    await expect(agent.run('loop')).rejects.toThrow(MaxIterationsError);
  });

  it('handles unknown tool gracefully (returns error in tool result)', async () => {
    let callCount = 0;
    const model = new MockModelProvider(() => {
      callCount++;
      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [{ id: 'tc_001', type: 'function', function: { name: 'ghost', arguments: '{}' } }],
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: 'tool_calls',
        };
      }
      return { content: 'done', usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }, finishReason: 'stop' };
    });

    const agent = new ReActAgent(model, { name: 'ghost-agent', systemPrompt: 'sys' });
    const result = await agent.run('call ghost');
    expect(result.status).toBe('completed');
    const toolResult = result.steps.find(s => s.type === 'tool_result');
    expect(toolResult?.toolResult?.error).toContain('Unknown tool');
  });

  it('prevents concurrent runs', async () => {
    const model = new MockModelProvider(() => new Promise<ModelResponse>(resolve =>
      setTimeout(() => resolve({ content: 'done', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: 'stop' }), 50)
    ));
    const agent = new ReActAgent(model, { name: 'concurrent', systemPrompt: 'sys' });
    const p1 = agent.run('first');
    await expect(agent.run('second')).rejects.toThrow(/already running/);
    await p1;
  });

  it('aborts mid-run', async () => {
    const model = new MockModelProvider(() => new Promise<ModelResponse>(resolve =>
      setTimeout(() => resolve({ content: 'done', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: 'stop' }), 100)
    ));
    const agent = new ReActAgent(model, { name: 'abort-agent', systemPrompt: 'sys' });
    const p = agent.run('hello');
    agent.abort();
    const result = await p;
    expect(result.status).toBe('failed');
  });
});

// ── ReActAgent — tool execution error ────────────────────────────────────────

describe('ReActAgent — tool execution error', () => {
  it('throws ToolExecutionError when tool throws', async () => {
    const model = new MockModelProvider(() => ({
      content: '',
      toolCalls: [{ id: 'tc_e', type: 'function', function: { name: 'boom', arguments: '{}' } }],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      finishReason: 'tool_calls',
    }));

    const tool: ITool = {
      definition: {
        name: 'boom',
        description: 'explodes',
        parameters: { type: 'object', properties: {} },
      },
      async execute() { throw new Error('ka-boom'); },
    };

    const agent = new ReActAgent(model, { name: 'err-agent', systemPrompt: 'sys', tools: [tool] });
    await expect(agent.run('go')).rejects.toThrow(ToolExecutionError);
  });
});

// ── Orchestrator ──────────────────────────────────────────────────────────────

describe('Orchestrator', () => {
  function makeAgent(id: string, answer: string): IAgent {
    return {
      id,
      name: id,
      status: 'idle',
      abort: () => {},
      async run(_input, ctx) {
        return {
          runId: ctx?.runId ?? 'r',
          answer,
          steps: [{ stepNumber: 1, type: 'final_answer', content: answer, timestamp: new Date() }],
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          status: 'completed',
        };
      },
    };
  }

  it('throws OrchestratorError when no agents registered', async () => {
    const o = new Orchestrator(simpleModel('plan'));
    await expect(o.run('goal')).rejects.toThrow(OrchestratorError);
  });

  it('runs single agent and returns its answer', async () => {
    // Planner model returns a valid plan JSON
    const plannerModel = new MockModelProvider(() => ({
      content: JSON.stringify({
        steps: [{ agentId: 'agent-a', input: 'solve it', dependsOn: [] }],
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop',
    }));

    const o = new Orchestrator(plannerModel);
    o.registerAgent({ id: 'agent-a', agent: makeAgent('agent-a', 'result-A'), description: 'does A' });

    const result = await o.run('Do A');
    expect(result.status).toBe('completed');
    expect(result.answer).toBe('result-A');
  });

  it('runs two sequential agents (dependsOn)', async () => {
    const plannerModel = new MockModelProvider(() => ({
      content: JSON.stringify({
        steps: [
          { agentId: 'step-1', input: 'first task', dependsOn: [] },
          { agentId: 'step-2', input: 'second task', dependsOn: ['step-1'] },
        ],
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop',
    }));

    const synthModel = new MockModelProvider(() => ({
      content: 'synthesised answer',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      finishReason: 'stop',
    }));

    // Planner model is called for planning; synth model is called for synthesis
    // We use the planner model for both via call counting
    let modelCallCount = 0;
    const model = new MockModelProvider((msgs) => {
      modelCallCount++;
      if (modelCallCount === 1) {
        return {
          content: JSON.stringify({
            steps: [
              { agentId: 'step-1', input: 'first', dependsOn: [] },
              { agentId: 'step-2', input: 'second', dependsOn: ['step-1'] },
            ],
          }),
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          finishReason: 'stop',
        };
      }
      // Synthesis call
      return { content: 'final synthesis', usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }, finishReason: 'stop' };
    });

    const o = new Orchestrator(model);
    o.registerAgent({ id: 'step-1', agent: makeAgent('step-1', 'output-1'), description: 'step 1' });
    o.registerAgent({ id: 'step-2', agent: makeAgent('step-2', 'output-2'), description: 'step 2' });

    const result = await o.run('multi-step goal');
    expect(result.status).toBe('completed');
    expect(result.steps.some(s => s.type === 'thought')).toBe(true);
    expect(result.steps.some(s => s.type === 'final_answer')).toBe(true);
  });

  it('unregisters agent', () => {
    const o = new Orchestrator(simpleModel('plan'));
    o.registerAgent({ id: 'a', agent: makeAgent('a', 'x'), description: 'd' });
    o.unregisterAgent('a');
    expect(o.run('goal')).rejects.toThrow(OrchestratorError);
  });

  it('falls back to first agent when planner returns invalid JSON', async () => {
    const model = new MockModelProvider(() => ({
      content: 'not valid json at all',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      finishReason: 'stop',
    }));
    const o = new Orchestrator(model);
    o.registerAgent({ id: 'fallback', agent: makeAgent('fallback', 'fallback-answer'), description: 'd' });
    const result = await o.run('goal');
    expect(result.status).toBe('completed');
    expect(result.answer).toBe('fallback-answer');
  });
});

// ── Error classes ─────────────────────────────────────────────────────────────

describe('Agent errors', () => {
  it('AgentAbortedError has correct code', () => {
    const e = new AgentAbortedError('a1');
    expect(e.code).toBe('AGENT_ABORTED');
    expect(e.agentId).toBe('a1');
  });

  it('MaxIterationsError includes iteration count in message', () => {
    const e = new MaxIterationsError('a1', 10);
    expect(e.message).toContain('10');
    expect(e.code).toBe('MAX_ITERATIONS_EXCEEDED');
  });

  it('ToolExecutionError wraps cause', () => {
    const cause = new Error('bad tool');
    const e = new ToolExecutionError('a1', 'myTool', cause);
    expect(e.message).toContain('bad tool');
    expect(e.code).toBe('TOOL_EXECUTION_FAILED');
  });
});
