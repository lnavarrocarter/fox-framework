# fox-agent-chat

Streaming AI chat app built with [Fox Framework](https://foxframework.dev) agents + SSE.

## Features

- Real-time streaming via Server-Sent Events
- Built-in tools: HTTP requests, calculator
- OpenAI (default) or Ollama (local, free)
- Minimal chat UI served from `/`

## Run

```bash
npm install

# With OpenAI (default)
OPENAI_API_KEY=sk-... npm run dev

# With Ollama (local, no API key needed)
PROVIDER=ollama npm run dev -- --infrastructure
```

## Environment

```env
PORT=3002

# OpenAI (default)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Ollama override
PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | Chat UI |
| GET | /chat/stream?message=... | SSE streaming response |
| POST | /chat | Non-streaming response |
| GET | /health | Health check |
