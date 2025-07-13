# @hyshu/ccrunner

A tool that automatically executes a series of tasks defined in YAML files. It can execute AI prompts using Claude Code, run Bash commands, and perform loop operations.

## Setup

### Install

#### Option A: Use with npx (No Installation Required)

Run ccrunner directly without installing:

```bash
npx @hyshu/ccrunner <yaml-file>
```

Without arguments, runner.yaml is read.

#### Option B: Global Installation from npm

```bash
npm install -g @hyshu/ccrunner
```

#### Option C: Local Development Installation

```bash
git clone https://github.com/yourusername/ccrunner.git
cd ccrunner
npm install
npm link
```

### Uninstall

```bash
npm uninstall -g @hyshu/ccrunner
```

## Usage

### Quick Start with npx (No Installation Required)

```bash
# Run with default runner.yaml
npx @hyshu/ccrunner

# Run with specific YAML file
npx @hyshu/ccrunner examples/simple.yaml
```

### Using Global Installation

```bash
# Run with default runner.yaml
ccrunner

# Run with specific YAML file
ccrunner examples/simple.yaml
```

### Examples

```bash
# Simple task execution
ccrunner examples/simple.yaml

# Code generation
ccrunner examples/generate-app.yaml

# Data processing with loop
ccrunner examples/data-process.yaml
```

### Development Mode (with file watching)

```bash
npm run dev examples/simple.yaml
```

## YAML Configuration Reference

### Root Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | **Yes** | The name of the task |
| `description` | string | No | Optional description of what the task does |
| `version` | string | No | Optional version identifier |
| `variables` | object | No | Global variables as key-value pairs |
| `steps` | array | **Yes** | Array of steps to execute |
| `yolo` | boolean | No | When true, allows all tools for prompts without defined tools (default: false) |

Example:
```yaml
name: My Task
description: A sample task
version: "1.0"
variables:
  outputDir: "./output"
steps:
  # Steps go here
```

YOLO mode example:
```yaml
name: My Task
yolo: true  # Allows all tools for prompts without defined tools
steps:
  - type: prompt
    prompt: Read and write files and do whatever is necessary
    # tools is undefined but all tools are available due to yolo: true
    
  - type: prompt
    prompt: Only read files, don't write anything
    tools: ["Read", "LS"]  # Even with yolo: true, tools are restricted when explicitly specified
```

### Step Types

There are three types of steps:

1. **prompt** - Execute Claude Code AI prompts
2. **command** - Execute bash commands
3. **loop** - Iterate over arrays or conditions

#### Common Step Options

All step types support these options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `type` | string | **Yes** | The step type: `prompt`, `command`, or `loop` |
| `name` | string | No | Human-readable name for the step |
| `description` | string | No | Description of what the step does |
| `continueOnError` | boolean | No | Continue execution if step fails (default: false) |
| `condition` | string | No | JavaScript expression; step runs only if true |

### Prompt Steps

Execute Claude Code AI prompts with optional tool restrictions.

#### Options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `prompt` | string | **Yes** | The prompt text to send to Claude |
| `model` | string | No | Model to use (e.g., "claude-opus-4-20250514") |
| `maxTurns` | number | No | Maximum conversation turns (must be >= 1) |
| `tools` | string[] | No | Array of tool names Claude can use. If undefined, all tools are available |
| `saveResultAs` | string | No | Variable name to save the result |

#### Available Tools:
- `Task` - Launch sub-agents for complex operations
- `Bash` - Execute shell commands
- `Glob` - File pattern matching
- `Grep` - Content search
- `LS` - List directory contents
- `Read` - Read file contents
- `Edit` - Replace text in files
- `MultiEdit` - Multiple edits in one operation
- `Write` - Create/overwrite files
- `NotebookRead` - Read Jupyter notebooks
- `NotebookEdit` - Edit Jupyter notebooks
- `WebFetch` - Fetch and process web content
- `WebSearch` - Search the web
- `TodoRead` - Read todo list
- `TodoWrite` - Manage todo list
- `exit_plan_mode` - Exit planning mode

Example:
```yaml
# Allow only specific tools
- type: prompt
  name: Generate Component
  prompt: Create a React component for user authentication
  model: claude-opus-4-20250514
  maxTurns: 5
  tools: ["Write", "Edit", "Read"]
  saveResultAs: componentCode

# Allow all tools (omit tools parameter)
- type: prompt
  name: Create Full Stack App
  prompt: Create a full stack application
  model: claude-opus-4-20250514
  maxTurns: 10
  saveResultAs: appCode
```

### Command Steps

Execute bash commands with optional timeout and working directory.

#### Options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `command` | string | **Yes** | The bash command to execute |
| `timeout` | number | No | Command timeout in milliseconds (must be >= 0) |
| `workingDirectory` | string | No | Directory to execute command in |
| `saveResultAs` | string | No | Variable name to save command output |

Example:
```yaml
- type: command
  name: Install Dependencies
  command: npm install
  timeout: 60000
  workingDirectory: ./my-app
  saveResultAs: installResult
```

### Loop Steps

Iterate over arrays or execute conditional loops.

#### Options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `steps` | array | **Yes** | Array of steps to execute in the loop |
| `condition` | string | No | Loop condition for while-style loops |
| `maxIterations` | number | No | Maximum iterations (default: 100, must be >= 1) |
| `iterateOver` | string | No | Variable containing array to iterate |
| `itemVariable` | string | No | Variable name for current item |
| `indexVariable` | string | No | Variable name for current index |

Example - Array Iteration:
```yaml
variables:
  files: ["index.ts", "app.ts", "config.ts"]

steps:
  - type: loop
    name: Process Files
    iterateOver: files
    itemVariable: currentFile
    indexVariable: fileIndex
    steps:
      - type: command
        command: echo "Processing file ${fileIndex}: ${currentFile}"
```

Example - Conditional Loop:
```yaml
variables:
  counter: 0

steps:
  - type: loop
    name: Count to 5
    condition: "${variables.counter < 5}"
    maxIterations: 10
    steps:
      - type: command
        command: echo "Count: ${variables.counter}"

  # Loop until "finish" file or folder exists
  - type: loop
    name: Process until finish marker
    condition: "${!require('fs').existsSync('./finish')}"
    maxIterations: 100
    steps:
      - type: command
        command: echo "Processing... (create 'finish' file or folder to stop)"
      - type: command
        command: sleep 2
```

### Variable System

#### Variable Substitution

Use `${variableName}` syntax to substitute variables in any string field:

- Simple variable: `${projectName}`
- Nested object: `${config.database.host}`
- Array access: `${files[0]}`
- JavaScript expressions: `${new Date().getFullYear()}`
- Result access: `${results['my-step']?.output}`

#### Available Variables

During execution, these variables are available:

| Variable | Scope | Description |
|----------|-------|-------------|
| `variables` | Global | All defined variables |
| `results` | Global | Results from previous steps (keyed by step name) |
| `currentItem` | Loop only | Current item in iteration |
| `currentIndex` | Loop only | Current index in iteration |
| `currentIteration` | Loop only | Current iteration count (0-based) |

#### Saving Results

Use `saveResultAs` to save step results for later use:

```yaml
steps:
  - type: command
    name: get-version
    command: cat package.json | jq -r .version
    saveResultAs: packageVersion
    
  - type: prompt
    prompt: Update the changelog for version ${results['get-version']?.output}
```

### Conditional Execution

Use the `condition` field to conditionally execute steps:

```yaml
steps:
  - type: command
    command: test -f config.json
    continueOnError: true
    saveResultAs: configExists
    
  - type: prompt
    condition: "${!results.configExists?.success}"
    prompt: Create a default config.json file
```

### Error Handling

By default, the runner stops on the first error. Use `continueOnError: true` to continue:

```yaml
steps:
  - type: command
    command: rm non-existent-file
    continueOnError: true
    
  - type: prompt
    prompt: Continue with the rest of the task
```

## Complete Example

```yaml
name: Full Stack App Generator
description: Generate a complete full-stack application
version: "1.0.0"

variables:
  appName: "my-fullstack-app"
  components: ["Header", "Footer", "Dashboard"]
  apiEndpoints:
    - name: "users"
      methods: ["GET", "POST", "PUT", "DELETE"]
    - name: "products"
      methods: ["GET", "POST"]

steps:
  # Setup project structure
  - type: command
    name: create-directories
    command: mkdir -p ${appName}/{client,server,shared}
    saveResultAs: setupResult

  # Generate backend
  - type: prompt
    name: generate-backend
    condition: "${setupResult.success}"
    prompt: |
      Create an Express.js server with TypeScript in the server directory.
      Include endpoints for: ${JSON.stringify(variables.apiEndpoints)}
    tools: ["Write", "Edit", "Bash"]
    maxTurns: 10
    saveResultAs: backendResult

  # Generate frontend components
  - type: loop
    name: generate-components
    iterateOver: components
    itemVariable: componentName
    indexVariable: componentIndex
    steps:
      - type: prompt
        name: create-${componentName}
        prompt: |
          Create a React component named ${componentName} 
          in client/components/${componentName}.tsx
        tools: ["Write", "Read"]
        condition: "${componentIndex < 10}"

  # Setup and test
  - type: command
    name: install-dependencies
    command: cd ${appName} && npm init -y && npm install
    timeout: 120000
    continueOnError: true

  # Final documentation
  - type: prompt
    name: create-docs
    prompt: |
      Create a README.md file documenting:
      - How to run the application
      - API endpoints created
      - Component structure
    tools: ["Write", "Read"]
    condition: "${backendResult.success}"
```

## Examples

### 1. Simple Example (examples/simple.yaml)

Basic example of prompt and command execution.

### 2. Loop Processing Example (examples/loop-example.yaml)

Example of processing multiple files and using loop functionality.

### 3. Command Test Example (examples/command-test.yaml)

Example demonstrating various command execution features.

## Development

### TypeScript Build

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

## Best Practices

1. **Use descriptive names**: Give steps meaningful names for better debugging
2. **Save intermediate results**: Use `saveResultAs` to track progress
3. **Handle errors gracefully**: Use `continueOnError` when appropriate
4. **Limit tool access**: Only provide tools that are needed for the task
5. **Use conditions**: Skip unnecessary steps with conditional execution
6. **Set appropriate timeouts**: Prevent hanging on long-running commands
7. **Structure variables**: Use nested objects for related configuration
8. **Validate inputs**: Use conditions to check prerequisites before steps

## Rate Limit Handling

When Claude AI usage limits are reached, the agent runner automatically:

1. **Detects rate limit errors** - Identifies messages in the format `Claude AI usage limit reached|<unix_timestamp>`
2. **Calculates wait time** - Determines how long to wait until the rate limit resets
3. **Shows progress** - Displays remaining wait time with updates every 10 seconds
4. **Automatically retries** - Resumes execution once the rate limit period ends
5. **Supports multiple retries** - Will retry up to 3 times if rate limits persist

Example output when rate limited:
```
⏳ Claude AI usage limit reached. Waiting until 2025-01-14 10:00:00 (approximately 15 minutes)...
⏳ Waiting... 12 minutes remaining
✅ Rate limit period ended. Retrying...
```

## Limitations

- Type checking currently shows some warnings that don't affect execution
- Claude Code execution requires a Claude Max subscription or API key (environment variable `CLAUDE_API_KEY`)
  - Note: Claude Max subscription costs are not actually charged

## License

ISC