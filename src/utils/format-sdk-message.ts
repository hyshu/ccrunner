import type { SDKMessage } from "@anthropic-ai/claude-code";

// Format SDKMessage for console output
export function formatSDKMessage(message: SDKMessage): void {
  const timestamp = new Date().toLocaleTimeString();

  switch (message.type) {
    case 'system':
      console.log(`\n📌 [${timestamp}] System Message`);
      console.log(`   Subtype: ${message.subtype}`);
      console.log(`   Model: ${message.model}`);
      console.log(`   CWD: ${message.cwd}`);
      console.log(`   Session ID: ${message.session_id}`);
      console.log(`   Tools: ${message.tools.join(', ')}`);
      if (message.mcp_servers && message.mcp_servers.length > 0) {
        console.log(`   MCP Servers: ${message.mcp_servers.join(', ')}`);
      }
      console.log(`   Permission Mode: ${message.permissionMode}`);
      console.log(`   API Key Source: ${message.apiKeySource}`);
      break;

    case 'user':
      console.log(`\n👤 [${timestamp}] User Message`);
      console.log(`   Session ID: ${message.session_id}`);
      if (typeof message.message.content === 'string') {
        const lines = message.message.content.split('\n');
        console.log(`   Content: ${lines[0]}${lines.length > 1 ? ' (multiline)' : ''}`);
        if (lines.length <= 5) {
          lines.slice(1).forEach((line: string) => console.log(`            ${line}`));
        } else {
          lines.slice(1, 4).forEach((line: string) => console.log(`            ${line}`));
          console.log(`            ... (${lines.length - 4} more lines)`);
        }
      } else if (Array.isArray(message.message.content)) {
        console.log(`   Content: [Array with ${message.message.content.length} items]`);
        message.message.content.forEach((item: any, index: number) => {
          if (item.type === 'text') {
            console.log(`     [${index}] Text: ${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}`);
          } else if (item.type === 'image') {
            console.log(`     [${index}] Image: ${item.source.type} source`);
          }
        });
      }
      break;

    case 'assistant':
      console.log(`\n🤖 [${timestamp}] Assistant Message`);
      console.log(`   Session ID: ${message.session_id}`);
      console.log(`   Model: ${message.message.model}`);
      console.log(`   Message ID: ${message.message.id}`);
      if (message.parent_tool_use_id) {
        console.log(`   Parent Tool Use ID: ${message.parent_tool_use_id}`);
      }
      if (message.message.content) {
        console.log(`   Content blocks: ${message.message.content.length}`);
        message.message.content.forEach((block: any, index: number) => {
          if (block.type === 'text') {
            const lines = block.text.split('\n');
            console.log(`   [${index}] Text block:`);
            if (lines.length <= 3) {
              lines.forEach((line: string) => console.log(`        ${line}`));
            } else {
              console.log(`        ${lines[0]}`);
              console.log(`        ${lines[1]}`);
              console.log(`        ... (${lines.length - 2} more lines)`);
            }
          } else if (block.type === 'tool_use') {
            // Tool-specific emoji and formatting
            const toolEmojis: Record<string, string> = {
              'Task': '🎯',
              'Bash': '💻',
              'Glob': '🔍',
              'Grep': '🔎',
              'LS': '📂',
              'exit_plan_mode': '🚪',
              'Read': '📖',
              'Edit': '✏️',
              'MultiEdit': '📝',
              'Write': '💾',
              'NotebookRead': '📓',
              'NotebookEdit': '📝',
              'WebFetch': '🌐',
              'TodoRead': '📋',
              'TodoWrite': '✅',
              'WebSearch': '🔍'
            };

            const emoji = toolEmojis[block.name] || '🔧';
            console.log(`   [${index}] ${emoji} Tool Use: ${block.name} (ID: ${block.id})`);

            // Tool-specific logging
            switch (block.name) {
              case 'Task':
                console.log(`        📌 Description: ${block.input.description || 'N/A'}`);
                if (block.input.prompt) {
                  const promptLines = block.input.prompt.split('\n');
                  console.log(`        📝 Prompt: ${promptLines[0].substring(0, 80)}${promptLines[0].length > 80 || promptLines.length > 1 ? '...' : ''}`);
                }
                break;

              case 'Bash':
                console.log(`        💻 Command: ${block.input.command}`);
                if (block.input.description) {
                  console.log(`        📌 Description: ${block.input.description}`);
                }
                if (block.input.timeout) {
                  console.log(`        ⏱️ Timeout: ${block.input.timeout}ms`);
                }
                break;

              case 'Glob':
                console.log(`        🔍 Pattern: ${block.input.pattern}`);
                if (block.input.path) {
                  console.log(`        📁 Path: ${block.input.path}`);
                }
                break;

              case 'Grep':
                console.log(`        🔎 Pattern: ${block.input.pattern}`);
                if (block.input.include) {
                  console.log(`        📄 Include: ${block.input.include}`);
                }
                if (block.input.path) {
                  console.log(`        📁 Path: ${block.input.path}`);
                }
                break;

              case 'LS':
                console.log(`        📁 Path: ${block.input.path}`);
                if (block.input.ignore && block.input.ignore.length > 0) {
                  console.log(`        🚫 Ignore: ${block.input.ignore.join(', ')}`);
                }
                break;

              case 'exit_plan_mode':
                if (block.input.plan) {
                  const planLines = block.input.plan.split('\n');
                  console.log(`        📝 Plan: ${planLines[0].substring(0, 80)}${planLines[0].length > 80 || planLines.length > 1 ? '...' : ''}`);
                }
                break;

              case 'Read':
                console.log(`        📄 File: ${block.input.file_path}`);
                if (block.input.limit) {
                  console.log(`        📏 Limit: ${block.input.limit} lines`);
                }
                if (block.input.offset) {
                  console.log(`        📍 Offset: Line ${block.input.offset}`);
                }
                break;

              case 'Edit':
                console.log(`        📄 File: ${block.input.file_path}`);
                console.log(`        🔄 Replace: ${block.input.replace_all ? 'All occurrences' : 'First occurrence'}`);
                console.log(`        📝 Old: ${block.input.old_string.substring(0, 50)}${block.input.old_string.length > 50 ? '...' : ''}`);
                console.log(`        ✨ New: ${block.input.new_string.substring(0, 50)}${block.input.new_string.length > 50 ? '...' : ''}`);
                break;

              case 'MultiEdit':
                console.log(`        📄 File: ${block.input.file_path}`);
                console.log(`        📝 Edits: ${block.input.edits.length} operations`);
                block.input.edits.slice(0, 3).forEach((edit: any, i: number) => {
                  console.log(`        [${i + 1}] ${edit.replace_all ? 'Replace all' : 'Replace'}: ${edit.old_string.substring(0, 30)}${edit.old_string.length > 30 ? '...' : ''}`);
                });
                if (block.input.edits.length > 3) {
                  console.log(`        ... and ${block.input.edits.length - 3} more edits`);
                }
                break;

              case 'Write':
                console.log(`        📄 File: ${block.input.file_path}`);
                const contentLines = block.input.content.split('\n');
                console.log(`        📝 Content: ${contentLines.length} lines`);
                console.log(`        📏 Size: ${block.input.content.length} characters`);
                break;

              case 'NotebookRead':
                console.log(`        📓 Notebook: ${block.input.notebook_path}`);
                if (block.input.cell_id) {
                  console.log(`        🔲 Cell ID: ${block.input.cell_id}`);
                }
                break;

              case 'NotebookEdit':
                console.log(`        📓 Notebook: ${block.input.notebook_path}`);
                console.log(`        🔲 Cell ID: ${block.input.cell_id}`);
                if (block.input.edit_mode) {
                  console.log(`        ✏️ Mode: ${block.input.edit_mode}`);
                }
                if (block.input.cell_type) {
                  console.log(`        📝 Type: ${block.input.cell_type}`);
                }
                break;

              case 'WebFetch':
                console.log(`        🌐 URL: ${block.input.url}`);
                if (block.input.prompt) {
                  console.log(`        📝 Prompt: ${block.input.prompt.substring(0, 80)}${block.input.prompt.length > 80 ? '...' : ''}`);
                }
                break;

              case 'WebSearch':
                console.log(`        🔍 Query: ${block.input.query}`);
                if (block.input.allowed_domains && block.input.allowed_domains.length > 0) {
                  console.log(`        ✅ Allowed domains: ${block.input.allowed_domains.join(', ')}`);
                }
                if (block.input.blocked_domains && block.input.blocked_domains.length > 0) {
                  console.log(`        🚫 Blocked domains: ${block.input.blocked_domains.join(', ')}`);
                }
                break;

              case 'TodoRead':
                console.log(`        📋 Reading todo list...`);
                break;

              case 'TodoWrite':
                console.log(`        ✏️ Updating todo list:`);
                if (block.input.todos && Array.isArray(block.input.todos)) {
                  const todos = block.input.todos;
                  console.log(`        Total todos: ${todos.length}`);

                  // Group by status
                  const byStatus = {
                    pending: todos.filter((t: any) => t.status === 'pending'),
                    in_progress: todos.filter((t: any) => t.status === 'in_progress'),
                    completed: todos.filter((t: any) => t.status === 'completed')
                  };

                  if (byStatus.in_progress.length > 0) {
                    console.log(`        🔄 In Progress (${byStatus.in_progress.length}):`);
                    byStatus.in_progress.forEach((todo: any) => {
                      console.log(`           - [${todo.priority}] ${todo.content.substring(0, 60)}${todo.content.length > 60 ? '...' : ''}`);
                    });
                  }

                  if (byStatus.pending.length > 0) {
                    console.log(`        ⏳ Pending (${byStatus.pending.length}):`);
                    byStatus.pending.slice(0, 3).forEach((todo: any) => {
                      console.log(`           - [${todo.priority}] ${todo.content.substring(0, 60)}${todo.content.length > 60 ? '...' : ''}`);
                    });
                    if (byStatus.pending.length > 3) {
                      console.log(`           ... and ${byStatus.pending.length - 3} more`);
                    }
                  }

                  if (byStatus.completed.length > 0) {
                    console.log(`        ✅ Completed (${byStatus.completed.length}):`);
                    byStatus.completed.slice(0, 2).forEach((todo: any) => {
                      console.log(`           - ${todo.content.substring(0, 60)}${todo.content.length > 60 ? '...' : ''}`);
                    });
                    if (byStatus.completed.length > 2) {
                      console.log(`           ... and ${byStatus.completed.length - 2} more`);
                    }
                  }
                }
                break;

              default:
                // Default handling for unknown tools
                console.log(`        Input parameters:`);
                const inputStr = JSON.stringify(block.input, null, 2);
                const inputLines = inputStr.split('\n');
                if (inputLines.length <= 10) {
                  inputLines.forEach(line => console.log(`          ${line}`));
                } else {
                  inputLines.slice(0, 8).forEach(line => console.log(`          ${line}`));
                  console.log(`          ... (${inputLines.length - 8} more lines)`);
                }
                break;
            }
          }
        });
      }
      if (message.message.usage) {
        console.log(`   Token usage:`);
        console.log(`     Input: ${message.message.usage.input_tokens}`);
        console.log(`     Output: ${message.message.usage.output_tokens}`);
        if (message.message.usage.cache_creation_input_tokens) {
          console.log(`     Cache creation: ${message.message.usage.cache_creation_input_tokens}`);
        }
        if (message.message.usage.cache_read_input_tokens) {
          console.log(`     Cache read: ${message.message.usage.cache_read_input_tokens}`);
        }
      }
      break;

    case 'result':
      console.log(`\n✅ [${timestamp}] Result Message`);
      console.log(`   Session ID: ${message.session_id}`);
      console.log(`   Subtype: ${message.subtype}`);
      console.log(`   Is Error: ${message.is_error}`);
      console.log(`   Duration: ${message.duration_ms}ms (API: ${message.duration_api_ms}ms)`);
      console.log(`   Turns: ${message.num_turns}`);
      console.log(`   Cost: $${message.total_cost_usd.toFixed(6)}`);
      if (message.usage) {
        console.log(`   Total Token Usage:`);
        console.log(`     Input: ${message.usage.input_tokens}`);
        console.log(`     Output: ${message.usage.output_tokens}`);
        if (message.usage.cache_creation_input_tokens) {
          console.log(`     Cache creation: ${message.usage.cache_creation_input_tokens}`);
        }
        if (message.usage.cache_read_input_tokens) {
          console.log(`     Cache read: ${message.usage.cache_read_input_tokens}`);
        }
        if (message.usage.server_tool_use) {
          console.log(`     Server tool use: ${JSON.stringify(message.usage.server_tool_use)}`);
        }
      }
      if (message.subtype === 'success' && message.result) {
        const resultLines = message.result.split('\n');
        console.log(`   Result preview:`);
        if (resultLines.length <= 5) {
          resultLines.forEach(line => console.log(`     ${line}`));
        } else {
          resultLines.slice(0, 3).forEach(line => console.log(`     ${line}`));
          console.log(`     ... (${resultLines.length - 3} more lines)`);
        }
      } else if (message.subtype !== 'success') {
        console.log(`   Error: ${(message as any).error || 'Unknown error'}`);
      }
      break;

    default:
      console.log(`\n❓ [${timestamp}] Unknown Message Type: ${(message as any).type}`);
      console.log(`   Raw message:`, JSON.stringify(message, null, 2));
      break;
  }
}