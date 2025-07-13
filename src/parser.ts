import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { YAMLAgentConfig, Step } from './types';

export class YAMLParser {
  private readonly ERROR_PREFIX = 'Invalid YAML:';
  async loadYAML(filePath: string): Promise<YAMLAgentConfig> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = yaml.parse(content) as YAMLAgentConfig;
      
      this.validateConfig(parsed);
      
      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load YAML file: ${error.message}`);
      }
      throw error;
    }
  }

  private validateConfig(config: any): asserts config is YAMLAgentConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`${this.ERROR_PREFIX} Root must be an object`);
    }

    this.validateRequiredField(config.name, '', 'name', 'string');
    this.validateArray(config.steps, '', 'steps', false);

    config.steps.forEach((step: any, index: number) => {
      this.validateStep(step, `steps[${index}]`);
    });
  }

  private validateStep(step: any, path: string): asserts step is Step {
    if (!step || typeof step !== 'object') {
      throw new Error(`${this.ERROR_PREFIX} ${path} must be an object`);
    }

    // id field has been removed - IDs are generated internally during execution
    
    if (!step.type || !['prompt', 'command', 'loop'].includes(step.type)) {
      throw new Error(`${this.ERROR_PREFIX} ${path}.type must be one of: prompt, command, loop`);
    }

    switch (step.type) {
      case 'prompt':
        this.validatePromptStep(step, path);
        break;
      case 'command':
        this.validateCommandStep(step, path);
        break;
      case 'loop':
        this.validateLoopStep(step, path);
        break;
    }
  }

  private validatePromptStep(step: any, path: string): void {
    this.validateRequiredField(step.prompt, path, 'prompt', 'string');
    
    if (step.tools !== undefined) {
      this.validateArray(step.tools, path, 'tools', true);
    }
    
    if (step.maxTurns !== undefined) {
      this.validateNumber(step.maxTurns, path, 'maxTurns', 1, 'positive number');
    }
  }

  private validateCommandStep(step: any, path: string): void {
    this.validateRequiredField(step.command, path, 'command', 'string');
    
    if (step.timeout !== undefined) {
      this.validateNumber(step.timeout, path, 'timeout', 0, 'non-negative number');
    }
  }

  private validateLoopStep(step: any, path: string): void {
    this.validateArray(step.steps, path, 'steps', false);
    
    if (step.maxIterations !== undefined) {
      this.validateNumber(step.maxIterations, path, 'maxIterations', 1, 'positive number');
    }
    
    if (step.iterateOver !== undefined) {
      this.validateRequiredField(step.iterateOver, path, 'iterateOver', 'string');
    }

    step.steps.forEach((substep: any, index: number) => {
      this.validateStep(substep, `${path}.steps[${index}]`);
    });
  }

  // Validation helper methods
  private validateRequiredField(value: any, path: string, fieldName: string, expectedType: string): void {
    const fullPath = path ? `${path}.${fieldName}` : fieldName;
    
    if (!value) {
      throw new Error(`${this.ERROR_PREFIX} "${fullPath}" field is required`);
    }
    
    if (typeof value !== expectedType) {
      throw new Error(`${this.ERROR_PREFIX} "${fullPath}" field must be a ${expectedType}`);
    }
  }

  private validateArray(value: any, path: string, fieldName: string, allowEmpty: boolean): void {
    const fullPath = path ? `${path}.${fieldName}` : fieldName;
    
    if (!value || !Array.isArray(value)) {
      throw new Error(`${this.ERROR_PREFIX} "${fullPath}" field is required and must be an array`);
    }
    
    if (!allowEmpty && value.length === 0) {
      throw new Error(`${this.ERROR_PREFIX} "${fullPath}" array cannot be empty`);
    }
  }

  private validateNumber(value: any, path: string, fieldName: string, minValue: number, description: string): void {
    const fullPath = `${path}.${fieldName}`;
    
    if (typeof value !== 'number' || value < minValue) {
      throw new Error(`${this.ERROR_PREFIX} ${fullPath} must be a ${description}`);
    }
  }

}