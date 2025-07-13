# Claude Code Agent

## Overview

This program is a tool for creating desired applications by executing Claude Code. It provides a programmatic interface to interact with Claude's capabilities for code generation, file manipulation, and task automation.

## Claude Code Tools and Specifications

### Available Tools

Claude Code has access to a comprehensive set of tools for various development tasks:

#### 1. **Task** - Launch Sub-agents for Complex Operations
- **Purpose**: Launches new agents for complex searches and operations
- **Use Case**: When searching for keywords, files, or performing complex multi-step operations
- **Parameters**:
  - `description`: Short (3-5 word) task description
  - `prompt`: Detailed task instructions for the agent
- **Example**:
```typescript
// Searching for configuration files
Task({
  description: "Find config files",
  prompt: "Search for all configuration files in the project and identify the main configuration entry point"
})
```

#### 2. **Bash** - Execute Shell Commands
- **Purpose**: Executes bash commands with proper handling and security
- **Timeout**: Default 2 minutes, max 10 minutes
- **Parameters**:
  - `command`: The command to execute
  - `description`: Clear description (5-10 words)
  - `timeout`: Optional timeout in milliseconds (max 600000)
- **Important Notes**:
  - Always quote file paths with spaces
  - Avoid using `find`, `grep`, `cat`, `head`, `tail` - use specialized tools instead
  - Use `rg` (ripgrep) instead of `grep` when needed
- **Example**:
```typescript
Bash({
  command: "npm install express",
  description: "Install Express framework"
})
```

#### 3. **Glob** - File Pattern Matching
- **Purpose**: Fast file pattern matching for any codebase size
- **Parameters**:
  - `pattern`: Glob pattern to match (e.g., "**/*.js", "src/**/*.ts")
  - `path`: Optional directory to search in (defaults to current working directory)
- **Returns**: Matching file paths sorted by modification time
- **Example**:
```typescript
Glob({
  pattern: "**/*.test.ts",
  path: "/src"
})
```

#### 4. **Grep** - Content Search
- **Purpose**: Search file contents using regular expressions
- **Parameters**:
  - `pattern`: Regular expression pattern
  - `include`: Optional file pattern filter (e.g., "*.js")
  - `path`: Optional directory to search in
- **Supports**: Full regex syntax
- **Example**:
```typescript
Grep({
  pattern: "function\\s+authenticate",
  include: "*.ts"
})
```

#### 5. **LS** - List Directory Contents
- **Purpose**: Lists files and directories in a given path
- **Parameters**:
  - `path`: Absolute path to directory (must be absolute)
  - `ignore`: Optional array of glob patterns to ignore
- **Example**:
```typescript
LS({
  path: "/Users/me/Projects/claude",
  ignore: ["node_modules/**", "*.log"]
})
```

#### 6. **Read** - Read File Contents
- **Purpose**: Reads files from the local filesystem
- **Features**:
  - Reads up to 2000 lines by default
  - Supports images (PNG, JPG, etc.)
  - Returns content with line numbers
- **Parameters**:
  - `file_path`: Absolute path to file
  - `limit`: Optional number of lines to read
  - `offset`: Optional starting line number
- **Example**:
```typescript
Read({
  file_path: "/Users/me/Projects/claude/index.ts"
})
```

#### 7. **Edit** - Replace Text in Files
- **Purpose**: Performs exact string replacements in files
- **Requirements**: Must use Read tool first
- **Parameters**:
  - `file_path`: Absolute path to file
  - `old_string`: Text to replace (must be unique)
  - `new_string`: Replacement text
  - `replace_all`: Optional boolean to replace all occurrences
- **Example**:
```typescript
Edit({
  file_path: "/src/config.ts",
  old_string: "const port = 3000",
  new_string: "const port = process.env.PORT || 3000"
})
```

#### 8. **MultiEdit** - Multiple Edits in One Operation
- **Purpose**: Perform multiple find-and-replace operations efficiently
- **Parameters**:
  - `file_path`: Absolute path to file
  - `edits`: Array of edit operations
    - `old_string`: Text to replace
    - `new_string`: Replacement text
    - `replace_all`: Optional boolean
- **Note**: Edits are applied sequentially
- **Example**:
```typescript
MultiEdit({
  file_path: "/src/api.ts",
  edits: [
    { old_string: "http://", new_string: "https://" },
    { old_string: "localhost", new_string: "api.example.com", replace_all: true }
  ]
})
```

#### 9. **Write** - Create/Overwrite Files
- **Purpose**: Writes a file to the filesystem
- **Warning**: Overwrites existing files
- **Parameters**:
  - `file_path`: Absolute path to file
  - `content`: File content to write
- **Example**:
```typescript
Write({
  file_path: "/src/new-component.tsx",
  content: "import React from 'react';\n\nexport const Component = () => {\n  return <div>Hello</div>;\n};"
})
```

#### 10. **NotebookRead** - Read Jupyter Notebooks
- **Purpose**: Reads Jupyter notebook (.ipynb) files
- **Parameters**:
  - `notebook_path`: Absolute path to notebook
  - `cell_id`: Optional specific cell ID
- **Returns**: All cells with their outputs

#### 11. **NotebookEdit** - Edit Jupyter Notebooks
- **Purpose**: Replace, insert, or delete cells in Jupyter notebooks
- **Parameters**:
  - `notebook_path`: Absolute path to notebook
  - `cell_id`: Cell ID to edit
  - `new_source`: New cell content
  - `cell_type`: "code" or "markdown"
  - `edit_mode`: "replace", "insert", or "delete"

#### 12. **WebFetch** - Fetch and Process Web Content
- **Purpose**: Fetches web content and processes it with AI
- **Features**:
  - Converts HTML to markdown
  - 15-minute cache for repeated requests
- **Parameters**:
  - `url`: Fully-formed URL
  - `prompt`: Instructions for processing content
- **Example**:
```typescript
WebFetch({
  url: "https://docs.example.com/api",
  prompt: "Extract all API endpoints and their descriptions"
})
```

#### 13. **WebSearch** - Search the Web
- **Purpose**: Search the web for current information
- **Parameters**:
  - `query`: Search query (min 2 characters)
  - `allowed_domains`: Optional array of domains to include
  - `blocked_domains`: Optional array of domains to exclude
- **Note**: Only available in the US
- **Example**:
```typescript
WebSearch({
  query: "latest React 18 features",
  allowed_domains: ["react.dev", "github.com"]
})
```

#### 14. **TodoRead** - Read Todo List
- **Purpose**: Read current session's todo list
- **Use Cases**:
  - Beginning of conversations
  - Before starting new tasks
  - Tracking progress
- **Parameters**: None (leave blank)
- **Returns**: List of todo items with status and priority

#### 15. **TodoWrite** - Manage Todo List
- **Purpose**: Create and manage structured task lists
- **When to Use**:
  - Complex multi-step tasks (3+ steps)
  - User provides multiple tasks
  - After receiving new instructions
- **Parameters**:
  - `todos`: Array of todo items
    - `id`: Unique identifier
    - `content`: Task description
    - `status`: "pending", "in_progress", or "completed"
    - `priority`: "high", "medium", or "low"
- **Best Practices**:
  - Only one task "in_progress" at a time
  - Mark tasks complete immediately after finishing
  - Create specific, actionable items

#### 16. **exit_plan_mode** - Exit Planning Mode
- **Purpose**: Exit plan mode and start coding
- **Parameters**:
  - `plan`: The plan to present for user approval

### Claude Code Specifications

#### Model Information
- **Model Name**: Opus 4
- **Model ID**: claude-opus-4-20250514
- **Context Window**: Large context window supporting extensive codebases

#### Capabilities
1. **Code Generation**: Write code in multiple programming languages
2. **Code Analysis**: Understand and explain existing code
3. **Refactoring**: Improve code structure and quality
4. **Bug Fixing**: Identify and fix issues in code
5. **Testing**: Write and run tests
6. **Documentation**: Generate comprehensive documentation
7. **Multi-file Operations**: Work across multiple files simultaneously
8. **Git Operations**: Handle version control tasks
9. **Web Integration**: Fetch and process web content
10. **Project Management**: Track tasks with todo lists

#### Security Features
- Never exposes or logs secrets/keys
- Refuses to work with malicious code
- Validates all file operations
- Secure command execution

#### Performance Optimizations
- Batch tool calls for parallel execution
- Efficient search with specialized tools
- Smart caching for web requests
- Minimal output tokens while maintaining quality

## How It Works

Claude Code implements, verifies, and refactors instructed tasks by repeating an iterative process. Each interaction returns a structured response containing system information, assistant messages, and results.

### Example Response

When you pass "hello world" as an argument to the `query` function:

```typescript
const result = await query("hello world");
```

The response structure looks like this:

```json
[
  {
    "type": "system",
    "subtype": "init",
    "cwd": "/Users/me/Projects/claude",
    "session_id": "aa4e7d0a-6011-4246-8072-a7189546c6f6",
    "tools": [
      "Task",         "Bash",
      "Glob",         "Grep",
      "LS",           "exit_plan_mode",
      "Read",         "Edit",
      "MultiEdit",    "Write",
      "NotebookRead", "NotebookEdit",
      "WebFetch",     "TodoRead",
      "TodoWrite",    "WebSearch"
    ],
    "mcp_servers": [],
    "model": "claude-opus-4-20250514",
    "permissionMode": "default",
    "apiKeySource": "none"
  },
  {
    "type": "assistant",
    "message": {
      "id": "msg_01EdPr9y75U2cvoZ7z66xjyH",
      "type": "message",
      "role": "assistant",
      "model": "claude-opus-4-20250514",
      "content": "[Array]",
      "stop_reason": null,
      "stop_sequence": null,
      "usage": "[Object]"
    },
    "parent_tool_use_id": null,
    "session_id": "aa4e7d0a-6011-4246-8072-a7189546c6f6"
  },
  {
    "type": "result",
    "subtype": "success",
    "is_error": false,
    "duration_ms": 3514,
    "duration_api_ms": 5773,
    "num_turns": 1,
    "result": "Hello world!",
    "session_id": "aa4e7d0a-6011-4246-8072-a7189546c6f6",
    "total_cost_usd": 0.0206954,
    "usage": {
      "input_tokens": 3,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 13298,
      "output_tokens": 7,
      "server_tool_use": "[Object]"
    }
  }
]
```

The same results can be seen in `cd examples-for-claude && tsx index.ts`.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Valid Claude API key

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```typescript
import { query } from './index';

// Simple query
const result = await query("Create a React component");

// With custom options
const result = await query("Build a REST API", {
  model: "claude-opus-4-20250514",
  maxTurns: 10,
  timeout: 300000
});
```

### Response Structure

Each response contains:

- `type`: Message type (system/assistant/result)
- `session_id`: Unique session identifier
- `result`: Final output from Claude
- `usage`: Token usage and cost information
- `duration_ms`: Execution time

## Best Practices

1. **Clear Instructions**: Provide specific, detailed instructions
2. **Iterative Development**: Break complex tasks into smaller steps
3. **Cost Management**: Monitor token usage and costs
4. **Error Handling**: Implement proper error handling for API calls
5. **Use Appropriate Tools**: Choose the right tool for each task
6. **Batch Operations**: Use MultiEdit for multiple changes to the same file
7. **Verify Before Writing**: Always read files before editing or overwriting

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Ensure CLAUDE_API_KEY is set
2. **Rate Limits**: Implement exponential backoff for retries
3. **Timeout Errors**: Increase timeout for complex tasks
4. **File Path Errors**: Always use absolute paths, not relative
5. **Edit Failures**: Ensure old_string matches exactly (including whitespace)

### Debug Mode

Enable debug logging:

```typescript
const result = await query("task", { debug: true });
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Specify your license here]