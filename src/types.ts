// YAML Agent Runner Type Definitions

export interface YAMLAgentConfig {
  name: string;
  description?: string;
  version?: string;
  variables?: Record<string, any>;
  steps: Step[];
  yolo?: boolean;
}

export type Step = PromptStep | CommandStep | LoopStep;

export interface BaseStep {
  name?: string;
  description?: string;
  continueOnError?: boolean;
  condition?: string;
}

export interface PromptStep extends BaseStep {
  type: 'prompt';
  prompt: string;
  model?: string;
  maxTurns?: number;
  tools?: string[];
  saveResultAs?: string;
}

export interface CommandStep extends BaseStep {
  type: 'command';
  command: string;
  timeout?: number;
  workingDirectory?: string;
  saveResultAs?: string;
}

export interface LoopStep extends BaseStep {
  type: 'loop';
  condition?: string;
  maxIterations?: number;
  iterateOver?: string;
  itemVariable?: string;
  indexVariable?: string;
  steps: Step[];
}

export interface ExecutionContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  currentIteration?: number;
  currentItem?: any;
  currentIndex?: number;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
  cost?: number;
}