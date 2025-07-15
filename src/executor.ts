import { exec } from 'child_process';
import { promisify } from 'util';
import { query } from '@anthropic-ai/claude-code';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import { formatSDKMessage } from './utils/format-sdk-message.js';
import { formatError } from './utils/common.js';
import {
  YAMLAgentConfig,
  Step,
  PromptStep,
  CommandStep,
  LoopStep,
  ExecutionContext,
  StepResult
} from './types.js';

const execAsync = promisify(exec);

export class Executor {
  private context: ExecutionContext;
  private yolo: boolean = false;
  private promptSessions: Map<string, string> = new Map();
  private lastPromptSessionId: string | null = null;

  constructor() {
    this.context = {
      variables: {},
      results: {}
    };
  }

  async execute(config: YAMLAgentConfig): Promise<void> {
    console.log(`\n🚀 Starting execution of: ${config.name}`);
    if (config.description) {
      console.log(`📝 Description: ${config.description}`);
    }
    if (config.version) {
      console.log(`📌 Version: ${config.version}`);
    }

    // Set yolo mode
    this.yolo = config.yolo || false;
    if (this.yolo) {
      console.log(`🚨 YOLO mode enabled: All tools are allowed by default`);
    }

    // Initialize variables
    if (config.variables) {
      this.context.variables = { ...config.variables };
    }

    // Execute steps
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepId = this.generateStepId(step, i);
      const result = await this.executeStep(step, stepId);
      if (!result.success && step.continueOnError === false) {
        console.error(`\n❌ Step ${stepId} failed. Stopping execution.`);
        break;
      }
    }

    console.log(`\n✅ Execution completed`);
  }

  private generateStepId(step: Step, index: number): string {
    const typePrefix = step.type.charAt(0).toUpperCase() + step.type.slice(1);
    return `step-${typePrefix}-${index + 1}`;
  }

  private async executeStep(step: Step, stepId: string): Promise<StepResult> {
    console.log(`\n📍 Executing step: ${stepId}${step.name ? ` - ${step.name}` : ''}`);

    // Check condition if present
    if (step.condition && !this.evaluateCondition(step.condition)) {
      console.log(`⏩ Skipping step due to condition: ${step.condition}`);
      return {
        stepId: stepId,
        success: true,
        output: 'Skipped due to condition'
      };
    }

    const startTime = Date.now();
    let result: StepResult;

    try {
      switch (step.type) {
        case 'prompt':
          result = await this.executePromptStep(step, stepId);
          break;
        case 'command':
          result = await this.executeCommandStep(step, stepId);
          break;
        case 'loop':
          result = await this.executeLoopStep(step, stepId);
          break;
      }

      result.duration = Date.now() - startTime;

      // Save result if requested
      if ('saveResultAs' in step && step.saveResultAs) {
        this.context.results[step.saveResultAs] = result.output;
        this.context.variables[step.saveResultAs] = result.output;
      }

      return result;
    } catch (error) {
      const errorMessage = formatError(error);
      console.error(`❌ Error in step ${stepId}: ${errorMessage}`);

      return {
        stepId: stepId,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  private async executePromptStep(step: PromptStep, stepId: string): Promise<StepResult> {
    const prompt = this.substituteVariables(step.prompt);
    console.log(`🤖 Executing Claude Code prompt...`);

    // Resolve continueFrom
    let resolvedSessionId: string | undefined;
    let isContinue = false;
    if (step.continueFrom) {
      if (step.continueFrom === 'before') {
        isContinue = true;
      } else {
        // Try to find by name
        resolvedSessionId = this.promptSessions.get(step.continueFrom);
        if (!resolvedSessionId) {
          // If not found by name, assume it's a direct session ID
          resolvedSessionId = step.continueFrom;
        }
      }
    }

    const messages: SDKMessage[] = [];
    let retryCount = 0;
    const maxRetries = 3;
    let sessionId: string | null = null;

    while (retryCount < maxRetries) {
      try {
        for await (const message of query({
          prompt,
          options: {
            model: step.model,
            maxTurns: step.maxTurns,
            allowedTools: step.tools === undefined ? (this.yolo ? ["Task", "Bash", "Glob", "Grep", "LS", "exit_plan_mode", "Read", "Edit", "MultiEdit", "Write", "NotebookRead", "NotebookEdit", "WebFetch", "TodoRead", "TodoWrite", "WebSearch"] : step.tools) : step.tools,
            resume: isContinue ? resolvedSessionId : undefined,
            continue: isContinue ? true : undefined
          }
        })) {
          formatSDKMessage(message);
          messages.push(message);

          // Capture session ID from system init message
          if (message.type === 'system' && message.subtype === 'init' && 'session_id' in message) {
            sessionId = message.session_id;
          }
        }

        // Extract result from messages
        const resultMessage = messages.find(m => m.type === 'result');
        const output = resultMessage && 'result' in resultMessage ? resultMessage.result : '';
        const cost = resultMessage && 'total_cost_usd' in resultMessage ? resultMessage.total_cost_usd : 0;

        // Store session ID for future reference
        if (sessionId) {
          this.lastPromptSessionId = sessionId;
          if (step.name) {
            this.promptSessions.set(step.name, sessionId);
          }
        }

        return {
          stepId: stepId,
          success: true,
          output,
          cost
        };
      } catch (error) {
        // Check if this is a rate limit error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const rateLimitMatch = errorMessage.match(/Claude AI usage limit reached\|(\d+)/);

        if (rateLimitMatch) {
          const resetTimestamp = parseInt(rateLimitMatch[1], 10);
          const resetTime = new Date(resetTimestamp * 1000);
          const currentTime = new Date();
          const waitTimeMs = resetTime.getTime() - currentTime.getTime();

          if (waitTimeMs > 0) {
            const waitTimeMinutes = Math.ceil(waitTimeMs / 60000);
            console.log(`\n⏳ Claude AI usage limit reached. Waiting until ${resetTime.toLocaleString()} (approximately ${waitTimeMinutes} minutes)...`);

            // Add progress indicator
            const progressInterval = setInterval(() => {
              const remaining = resetTime.getTime() - new Date().getTime();
              if (remaining > 0) {
                const remainingMinutes = Math.ceil(remaining / 60000);
                process.stdout.write(`\r⏳ Waiting... ${remainingMinutes} minutes remaining`);
              }
            }, 10000); // Update every 10 seconds

            // Wait until reset time
            await new Promise(resolve => setTimeout(resolve, waitTimeMs + 1000)); // Add 1 second buffer

            clearInterval(progressInterval);
            console.log('\n✅ Rate limit period ended. Retrying...\n');

            retryCount++;
            messages.length = 0; // Clear messages for retry
            continue;
          }
        }

        // Check messages array for rate limit pattern when errorMessage does not include it
        const usageRegex = /Claude AI usage limit reached\|(\d+)/;
        let resetTimestampFromMessages: number | null = null;
        for (const m of messages) {
          const serialized = JSON.stringify(m);
          const match = serialized.match(usageRegex);
          if (match) {
            resetTimestampFromMessages = parseInt(match[1], 10);
            break;
          }
        }

        if (resetTimestampFromMessages) {
          const resetTime = new Date(resetTimestampFromMessages * 1000);
          const currentTime = new Date();
          const waitTimeMs = resetTime.getTime() - currentTime.getTime();

          if (waitTimeMs > 0) {
            const waitTimeMinutes = Math.ceil(waitTimeMs / 60000);
            console.log(`\n⏳ Claude AI usage limit reached. Waiting until ${resetTime.toLocaleString()} (approximately ${waitTimeMinutes} minutes)...`);

            const progressInterval = setInterval(() => {
              const remaining = resetTime.getTime() - new Date().getTime();
              if (remaining > 0) {
                const remainingMinutes = Math.ceil(remaining / 60000);
                process.stdout.write(`\r⏳ Waiting... ${remainingMinutes} minutes remaining`);
              }
            }, 10000);

            await new Promise(resolve => setTimeout(resolve, waitTimeMs + 1000));
            clearInterval(progressInterval);
            console.log('\n✅ Rate limit period ended. Retrying...\n');

            retryCount++;
            messages.length = 0;
            continue;
          }
        }

        // If not a rate limit error or max retries reached, throw the error
        throw error;
      }
    }

    throw new Error('Max retries reached for rate limit');
  }

  private async executeCommandStep(step: CommandStep, stepId: string): Promise<StepResult> {
    const command = this.substituteVariables(step.command);
    console.log(`💻 Executing command: ${command}`);

    try {
      const options: any = {};
      if (step.timeout) {
        options.timeout = step.timeout;
      }
      if (step.workingDirectory) {
        options.cwd = this.substituteVariables(step.workingDirectory);
      }

      const { stdout, stderr } = await execAsync(command, options);

      if (stderr) {
        console.warn(`⚠️ stderr: ${stderr}`);
      }

      console.log(`📤 Output: ${stdout.toString().trim()}`);

      return {
        stepId: stepId,
        success: true,
        output: stdout.toString().trim()
      };
    } catch (error: any) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  private async executeLoopStep(step: LoopStep, stepId: string): Promise<StepResult> {
    console.log(`🔄 Starting loop...`);

    const outputs: any[] = [];
    let iterations = 0;
    const maxIterations = step.maxIterations || 16777215;

    if (step.iterateOver) {
      // Iterate over a variable
      const items = this.getVariable(step.iterateOver);
      if (!Array.isArray(items)) {
        throw new Error(`Variable ${step.iterateOver} is not an array`);
      }

      for (let i = 0; i < items.length && iterations < maxIterations; i++) {
        const item = items[i];

        // Set loop variables
        if (step.itemVariable) {
          this.context.variables[step.itemVariable] = item;
        }
        if (step.indexVariable) {
          this.context.variables[step.indexVariable] = i;
        }

        this.context.currentIteration = iterations;
        this.context.currentItem = item;
        this.context.currentIndex = i;

        console.log(`\n🔄 Loop iteration ${i + 1}/${items.length}`);

        // Execute loop steps
        const result = await this.executeLoopIteration(step, stepId, iterations + 1);
        if (!result.success) {
          return result;
        }

        iterations++;
      }
    } else if (step.condition) {
      // Loop while condition is true
      while (this.evaluateCondition(step.condition) && iterations < maxIterations) {
        this.context.currentIteration = iterations;

        console.log(`\n🔄 Loop iteration ${iterations + 1}`);

        // Execute loop steps
        const result = await this.executeLoopIteration(step, stepId, iterations + 1);
        if (!result.success) {
          return result;
        }

        iterations++;
      }
    } else {
      // Simple loop with max iterations
      for (let i = 0; i < maxIterations; i++) {
        this.context.currentIteration = i;

        console.log(`\n🔄 Loop iteration ${i + 1}/${maxIterations}`);

        // Execute loop steps
        const result = await this.executeLoopIteration(step, stepId, i + 1);
        if (!result.success) {
          return result;
        }
      }
    }

    console.log(`✅ Loop completed after ${iterations} iterations`);

    return {
      stepId: stepId,
      success: true,
      output: outputs
    };
  }

  private async executeLoopIteration(step: LoopStep, parentStepId: string, iterationNumber: number): Promise<StepResult> {
    for (let i = 0; i < step.steps.length; i++) {
      const substep = step.steps[i];
      const substepId = `${parentStepId}-substep-${substep.type}-${i + 1}`;
      const result = await this.executeStep(substep, substepId);
      if (!result.success && substep.continueOnError === false) {
        console.error(`❌ Loop substep ${substepId} failed. Stopping loop.`);
        return {
          stepId: parentStepId,
          success: false,
          output: [],
          error: `Loop failed at iteration ${iterationNumber}`
        };
      }
    }

    return {
      stepId: parentStepId,
      success: true
    };
  }

  private substituteVariables(text: string): string {
    // Replace ${variable} with actual values
    return text.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        // Create a function with variables in scope
        const func = new Function(...Object.keys(this.context.variables), 'results', `return ${expression}`);
        const result = func(...Object.values(this.context.variables), this.context.results);
        return String(result);
      } catch (error) {
        console.warn(`⚠️ Failed to evaluate expression: ${expression}`);
        return match;
      }
    });
  }

  private getVariable(name: string): any {
    if (name in this.context.variables) {
      return this.context.variables[name];
    }
    if (name in this.context.results) {
      return this.context.results[name];
    }
    return undefined;
  }

  private evaluateCondition(condition: string): boolean {
    try {
      const substituted = this.substituteVariables(condition);
      const func = new Function(...Object.keys(this.context.variables), 'results', `return ${substituted}`);
      return Boolean(func(...Object.values(this.context.variables), this.context.results));
    } catch (error) {
      console.warn(`⚠️ Failed to evaluate condition: ${condition}`);
      return false;
    }
  }
}