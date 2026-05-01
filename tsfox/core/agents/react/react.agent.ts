/**
 * @fileoverview ReActAgent — Reasoning + Acting loop (ReAct pattern)
 * @module tsfox/core/agents
 *
 * Implements the ReAct loop:
 *   1. Thought: model reasons about what to do next
 *   2. Action: model requests a tool call
 *   3. Observation: tool result injected back into context
 *   4. Repeat until model produces a final answer or max iterations exceeded
 */

import type {
  AgentContext,
  AgentRunResult,
  AgentStep,
  ModelMessage,
  IModelProvider,
  AgentConfig,
  ToolCall,
} from '../interfaces/agent.interface';
import { BaseAgent } from '../base/base.agent';
import {
  MaxIterationsError,
  ToolExecutionError,
  ModelError,
} from '../errors/agent.errors';

export class ReActAgent extends BaseAgent {
  constructor(model: IModelProvider, config: AgentConfig) {
    super(model, config);
  }

  protected async _execute(input: string, context: AgentContext): Promise<AgentRunResult> {
    const maxIter = this._config.maxIterations ?? 10;
    const steps: AgentStep[] = [];
    const messages: ModelMessage[] = [
      { role: 'system', content: this._buildSystemPrompt() },
      { role: 'user', content: input },
    ];

    let totalPrompt = 0;
    let totalCompletion = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      this._checkAbort(context);

      let response;
      try {
        response = await this._model.complete(messages, {
          ...this._config.modelOptions,
          // Pass tool definitions if the provider supports function-calling
        });
      } catch (err) {
        throw new ModelError(this.id, err);
      }

      // Check abort after potentially long model call
      this._checkAbort(context);

      totalPrompt += response.usage?.promptTokens ?? 0;
      totalCompletion += response.usage?.completionTokens ?? 0;

      // ── Tool calls requested ────────────────────────────────────────────────
      if (response.toolCalls && response.toolCalls.length > 0) {
        this._status = 'waiting_for_tool';

        // Record thought step
        if (response.content) {
          steps.push({
            stepNumber: steps.length + 1,
            type: 'thought',
            content: response.content,
            timestamp: new Date(),
          });
        }

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.content ?? '',
          toolCalls: response.toolCalls,
        });

        // Execute each tool call
        for (const tc of response.toolCalls) {
          this._checkAbort(context);

          steps.push({
            stepNumber: steps.length + 1,
            type: 'tool_call',
            content: `${tc.function.name}(${tc.function.arguments})`,
            toolCall: tc,
            timestamp: new Date(),
          });

          const toolResult = await this._executeTool(tc, context);

          steps.push({
            stepNumber: steps.length + 1,
            type: 'tool_result',
            content: typeof toolResult.result === 'string'
              ? toolResult.result
              : JSON.stringify(toolResult.result),
            toolResult,
            timestamp: new Date(),
          });

          messages.push({
            role: 'tool',
            content: toolResult.error ?? JSON.stringify(toolResult.result),
            toolCallId: tc.id,
          });
        }

        this._status = 'running';
        continue;
      }

      // ── Final answer ────────────────────────────────────────────────────────
      const answer = response.content ?? '';

      steps.push({
        stepNumber: steps.length + 1,
        type: 'final_answer',
        content: answer,
        timestamp: new Date(),
      });

      // Store to memory if configured
      if (this._config.memory) {
        await this._config.memory.add({
          content: `Q: ${input}\nA: ${answer}`,
        });
      }

      return {
        runId: context.runId,
        answer,
        steps,
        usage: {
          promptTokens: totalPrompt,
          completionTokens: totalCompletion,
          totalTokens: totalPrompt + totalCompletion,
        },
        status: 'completed',
      };
    }

    throw new MaxIterationsError(this.id, maxIter);
  }

  private _buildSystemPrompt(): string {
    const tools = this._toolDefinitions();
    const toolList = tools.length > 0
      ? `\n\nAvailable tools:\n${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
      : '';
    return `${this._config.systemPrompt}${toolList}`;
  }

  private async _executeTool(tc: ToolCall, context: AgentContext) {
    const tool = this._toolMap.get(tc.function.name);
    if (!tool) {
      return {
        toolCallId: tc.id,
        result: null,
        error: `Unknown tool: ${tc.function.name}`,
      };
    }

    try {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
      const result = await tool.execute(args, context);
      return { toolCallId: tc.id, result };
    } catch (err) {
      throw new ToolExecutionError(this.id, tc.function.name, err);
    }
  }
}
