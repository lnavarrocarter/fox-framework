import express from 'express';
import path from 'path';
import { ReActAgent } from '@foxframework/core/dist/tsfox/core/agents/react/react.agent';
import { createAgentSseHandler } from '@foxframework/core/dist/tsfox/core/agents/streaming/create-agent-sse-handler';
import { HttpTool } from '@foxframework/core/dist/tsfox/core/agents/tools/http.tool';
import { CalculatorTool } from '@foxframework/core/dist/tsfox/core/agents/tools/calculator.tool';

// ── Model selection ──────────────────────────────────────────────────────────
async function createModel() {
  const provider = process.env.PROVIDER ?? 'openai';

  if (provider === 'ollama') {
    const { OllamaProvider } = await import('@foxframework/model-ollama');
    return new OllamaProvider({
      baseUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    });
  }

  const { OpenAIProvider } = await import('@foxframework/model-openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required (or set PROVIDER=ollama)');
  return new OpenAIProvider({ apiKey, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' });
}

// ── App ──────────────────────────────────────────────────────────────────────
async function main() {
  const model = await createModel();

  const agent = new ReActAgent({
    model,
    tools: [HttpTool, CalculatorTool],
    systemPrompt: 'You are a helpful assistant. Be concise.',
    maxIterations: 8,
  });

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // Health
  app.get('/health', (_req, res) => res.json({ status: 'healthy', provider: process.env.PROVIDER ?? 'openai' }));

  // Streaming SSE endpoint
  app.get('/chat/stream', createAgentSseHandler(agent, {
    getInput: req => req.query?.message as string | undefined,
    heartbeatIntervalMs: 15_000,
  }));

  // Non-streaming endpoint (returns full result)
  app.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' }) as any;
    try {
      const result = await agent.run(message);
      res.json({ answer: result.answer, steps: result.steps.length, usage: result.usage });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = Number(process.env.PORT) || 3002;
  app.listen(PORT, () => {
    console.log(`Fox agent-chat running on http://localhost:${PORT}`);
    console.log(`Provider: ${process.env.PROVIDER ?? 'openai'}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
