/**
 * @fileoverview Orchestrator — coordinates multiple agents towards a goal
 * @module tsfox/core/agents
 *
 * Strategy: the orchestrator uses a "planner" model call to break the goal
 * into sub-tasks, assigns each to the best-fit registered agent (by description
 * similarity), runs them (sequentially or in parallel respecting `dependsOn`),
 * then synthesises a final answer.
 */

import { randomUUID } from 'crypto';
import type {
  IOrchestrator,
  IAgent,
  AgentDefinition,
  AgentContext,
  AgentRunResult,
  AgentStep,
  IModelProvider,
} from '../interfaces/agent.interface';
import { OrchestratorError } from '../errors/agent.errors';

export interface OrchestratorConfig {
  name?: string;
  /** System prompt for the planning step */
  plannerSystemPrompt?: string;
  /** Max agents that can run concurrently (default: 4) */
  maxConcurrency?: number;
}

export class Orchestrator implements IOrchestrator {
  private readonly _agents = new Map<string, AgentDefinition>();
  private readonly _model: IModelProvider;
  private readonly _config: OrchestratorConfig;

  constructor(model: IModelProvider, config: OrchestratorConfig = {}) {
    this._model = model;
    this._config = config;
  }

  registerAgent(definition: AgentDefinition): void {
    this._agents.set(definition.id, definition);
  }

  unregisterAgent(id: string): void {
    this._agents.delete(id);
  }

  async run(goal: string, contextOverrides: Partial<AgentContext> = {}): Promise<AgentRunResult> {
    if (this._agents.size === 0) {
      throw new OrchestratorError('No agents registered', 'NO_AGENTS');
    }

    const runId = randomUUID();
    const context: AgentContext = {
      runId,
      variables: {},
      ...contextOverrides,
    };

    const allSteps: AgentStep[] = [];
    let totalPrompt = 0;
    let totalCompletion = 0;

    // ── Step 1: plan ──────────────────────────────────────────────────────────
    const plan = await this._plan(goal, context);

    allSteps.push({
      stepNumber: 1,
      type: 'thought',
      content: `Plan: ${JSON.stringify(plan.steps)}`,
      timestamp: new Date(),
    });

    // ── Step 2: execute plan steps ────────────────────────────────────────────
    // Group steps by wave (steps with no unresolved dependsOn run together)
    const results = new Map<string, AgentRunResult>();

    const waves = this._buildWaves(plan.steps);

    for (const wave of waves) {
      const concurrency = this._config.maxConcurrency ?? 4;
      // Run wave items in batches respecting concurrency
      for (let i = 0; i < wave.length; i += concurrency) {
        const batch = wave.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async step => {
            const def = this._agents.get(step.agentId);
            if (!def) {
              throw new OrchestratorError(
                `Agent "${step.agentId}" not found`,
                'AGENT_NOT_FOUND',
              );
            }

            // Inject outputs from dependencies into input
            const enrichedInput = this._enrichInput(step.input, step.dependsOn ?? [], results);

            const result = await def.agent.run(enrichedInput, {
              ...context,
              parentAgentId: undefined,
            });

            totalPrompt += result.usage?.promptTokens ?? 0;
            totalCompletion += result.usage?.completionTokens ?? 0;

            allSteps.push(...result.steps.map((s, idx) => ({
              ...s,
              stepNumber: allSteps.length + idx + 1,
              content: `[${def.agent.name}] ${s.content}`,
            })));

            return { id: step.agentId, result };
          }),
        );

        for (const { id, result } of batchResults) {
          results.set(id, result);
        }
      }
    }

    // ── Step 3: synthesise final answer ───────────────────────────────────────
    const answer = await this._synthesise(goal, results, context);

    totalPrompt += answer.usage?.promptTokens ?? 0;
    totalCompletion += answer.usage?.completionTokens ?? 0;

    allSteps.push({
      stepNumber: allSteps.length + 1,
      type: 'final_answer',
      content: answer.answer,
      timestamp: new Date(),
    });

    return {
      runId,
      answer: answer.answer,
      steps: allSteps,
      usage: {
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        totalTokens: totalPrompt + totalCompletion,
      },
      status: 'completed',
    };
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private async _plan(goal: string, _context: AgentContext) {
    const agentList = [...this._agents.values()]
      .map(d => `- id: "${d.id}" | description: "${d.description}"`)
      .join('\n');

    const systemPrompt =
      this._config.plannerSystemPrompt ??
      `You are a planning agent. Given a goal and a list of available agents, 
produce a JSON execution plan. Return ONLY valid JSON with the shape:
{
  "steps": [
    { "agentId": "<id>", "input": "<task>", "dependsOn": [] }
  ]
}
Use dependsOn to reference agentIds whose output should feed this step.
Only use agent ids from the list provided.`;

    const response = await this._model.complete([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Goal: ${goal}\n\nAvailable agents:\n${agentList}`,
      },
    ]);

    try {
      // Extract JSON from possible markdown fences
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/) ??
                        response.content.match(/(\{[\s\S]*\})/);
      const raw = jsonMatch ? jsonMatch[1] : response.content;
      return JSON.parse(raw) as { steps: Array<{ agentId: string; input: string; dependsOn?: string[] }> };
    } catch {
      // Fallback: run first agent with the full goal
      const first = this._agents.values().next().value as AgentDefinition;
      return { steps: [{ agentId: first.id, input: goal, dependsOn: [] }] };
    }
  }

  private _buildWaves(
    steps: Array<{ agentId: string; input: string; dependsOn?: string[] }>,
  ): Array<typeof steps> {
    const waves: Array<typeof steps> = [];
    const done = new Set<string>();
    let remaining = [...steps];

    while (remaining.length > 0) {
      const wave = remaining.filter(
        s => (s.dependsOn ?? []).every(dep => done.has(dep)),
      );
      if (wave.length === 0) {
        // Cycle or missing dep — run everything remaining
        waves.push(remaining);
        break;
      }
      waves.push(wave);
      wave.forEach(s => done.add(s.agentId));
      remaining = remaining.filter(s => !wave.includes(s));
    }

    return waves;
  }

  private _enrichInput(
    input: string,
    dependsOn: string[],
    results: Map<string, AgentRunResult>,
  ): string {
    if (dependsOn.length === 0) return input;
    const context = dependsOn
      .map(id => {
        const r = results.get(id);
        return r ? `[Output from ${id}]: ${r.answer}` : '';
      })
      .filter(Boolean)
      .join('\n');
    return `${input}\n\nContext:\n${context}`;
  }

  private async _synthesise(
    goal: string,
    results: Map<string, AgentRunResult>,
    _context: AgentContext,
  ): Promise<AgentRunResult> {
    if (results.size === 1) {
      return results.values().next().value as AgentRunResult;
    }

    const summaries = [...results.entries()]
      .map(([id, r]) => `[${id}]: ${r.answer}`)
      .join('\n\n');

    const response = await this._model.complete([
      {
        role: 'system',
        content: 'You are a synthesis agent. Combine the outputs from multiple agents into a single coherent answer.',
      },
      {
        role: 'user',
        content: `Original goal: ${goal}\n\nAgent outputs:\n${summaries}\n\nSynthesize a final answer.`,
      },
    ]);

    return {
      runId: '',
      answer: response.content,
      steps: [],
      usage: response.usage,
      status: 'completed',
    };
  }
}
