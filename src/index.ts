#!/usr/bin/env tsx
import { YAMLParser } from './parser.js';
import { Executor } from './executor.js';
import { formatError } from './utils/common.js';
import * as path from 'path';
import * as fs from 'fs';

const VERSION = '0.0.5';

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Handle --help and --version flags
  if (args.length > 0) {
    const firstArg = args[0];
    if (firstArg === '--help' || firstArg === '-h') {
      showHelp();
      process.exit(0);
    }
    if (firstArg === '--version' || firstArg === '-V') {
      console.log(`ccrunner v${VERSION}`);
      process.exit(0);
    }
  }

  console.log(`🤖 ccrunner v${VERSION}`);
  console.log('========================\n');

  const yamlPath = args.length === 0 ? 'runner.yaml' : args[0];
  const absolutePath = path.isAbsolute(yamlPath) ? yamlPath : path.join(process.cwd(), yamlPath);

  try {
    // Parse YAML file
    console.log(`📄 Loading YAML file: ${yamlPath}`);
    const parser = new YAMLParser();
    const config = await parser.loadYAML(absolutePath);

    // Execute the configuration
    const executor = new Executor();
    await executor.execute(config);

    console.log('\n🎉 All tasks completed successfully!');
  } catch (error) {
    if (args.length === 0 && !fs.existsSync(absolutePath)) {
      console.error(`❌ Error: Default file 'runner.yaml' not found.\n`);
      showUsage();
    } else {
      console.error('\n❌ Fatal error:', formatError(error));
    }
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', formatError(reason));
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('❌ Uncaught error:', error);
  process.exit(1);
});

function showUsage() {
  console.log('Usage: ccrunner [options] [yaml-file]');
  console.log('');
  console.log('Try "ccrunner --help" for more information.');
}

function showHelp() {
  console.log(`ccrunner v${VERSION} - Claude Code YAML Agent Runner`);
  console.log('');
  console.log('Usage: ccrunner [options] [yaml-file]');
  console.log('');
  console.log('Execute prompts and commands defined in YAML files using Claude Code.');
  console.log('');
  console.log('Arguments:');
  console.log('  yaml-file          Path to YAML configuration file (default: runner.yaml)');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help         Show this help message');
  console.log('  -V, --version      Show version number');
  console.log('');
  console.log('Examples:');
  console.log('  ccrunner                      # Uses runner.yaml in current directory');
  console.log('  ccrunner task.yaml            # Uses specified YAML file');
  console.log('  ccrunner /path/to/task.yaml   # Uses absolute path');
  console.log('');
  console.log('YAML Configuration:');
  console.log('  The YAML file should contain:');
  console.log('  - name: Task name (required)');
  console.log('  - steps: Array of steps to execute (required)');
  console.log('  - description: Task description (optional)');
  console.log('  - variables: Global variables (optional)');
  console.log('  - addDir: Additional directories for Claude access (optional)');
  console.log('  - yolo: Allow all tools by default (optional)');
  console.log('');
  console.log('For more information, visit: https://github.com/hyshu/ccrunner');
}
