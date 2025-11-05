import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPClient, MCPTool } from "@copilotkit/runtime";

export class LocalMCPClient implements MCPClient {
  private client!: Client;
  private connected = false;

  constructor(private config: { command: string; args: string[]; env?: Record<string, string> }) {}

  async connect(): Promise<void> {
    // Build environment variables, filtering out undefined values
    const env: Record<string, string> = {};
    
    // Add process.env values, filtering undefined
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    
    // Add config env values, overriding process.env
    if (this.config.env) {
      Object.assign(env, this.config.env);
    }

    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env,
    });

    this.client = new Client(
      {
        name: "copilotkit-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(transport);
    this.connected = true;
  }

  async tools(): Promise<Record<string, MCPTool>> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await this.client.listTools();
    const toolsMap: Record<string, MCPTool> = {};

    for (const tool of response.tools) {
      // Convert MCP tool schema to CopilotKit MCPTool schema format
      const schema = tool.inputSchema ? {
        parameters: {
          properties: (tool.inputSchema as any).properties || {},
          required: (tool.inputSchema as any).required || [],
          jsonSchema: tool.inputSchema
        }
      } : undefined;

      toolsMap[tool.name] = {
        description: tool.description,
        schema,
        execute: async (args: any) => {
          const result = await this.client.callTool({
            name: tool.name,
            arguments: args,
          });
          return result.content;
        },
      };
    }

    return toolsMap;
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}