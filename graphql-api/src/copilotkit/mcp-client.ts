import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPClient, MCPTool } from "@copilotkit/runtime";
import logger from '../logger';

export class LocalMCPClient implements MCPClient {
  private client!: Client;
  private connected = false;

  constructor(private config: { command: string; args: string[]; env?: Record<string, string> }) {}

  async connect(): Promise<void> {
    logger.info({
      message: 'MCP client connecting',
      command: this.config.command,
      args: this.config.args,
    });

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
    logger.info('MCP client connected successfully');
  }

  async tools(): Promise<Record<string, MCPTool>> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await this.client.listTools();
    const toolsMap: Record<string, MCPTool> = {};

    logger.info({
      message: 'MCP tools loaded',
      toolCount: response.tools.length,
      tools: response.tools.map(t => t.name),
    });

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
          const startTime = Date.now();
          logger.info({
            message: 'MCP tool execution started',
            tool: tool.name,
            args,
          });

          try {
            const result = await this.client.callTool({
              name: tool.name,
              arguments: args,
            });
            const duration = Date.now() - startTime;

            logger.info({
              message: 'MCP tool execution completed',
              tool: tool.name,
              duration: `${duration}ms`,
              hasStructuredContent: !!(result as any).structuredContent,
            });

            // Return structured content if available
            const structuredContent = (result as any).structuredContent;
            if (structuredContent) {
              logger.info({
                message: 'MCP tool returned structured content',
                tool: tool.name,
                structuredContentKeys: Object.keys(structuredContent),
              });
              return {
                content: result.content,
                structuredContent,
              };
            }

            return result.content;
          } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error({
              message: 'MCP tool execution failed',
              tool: tool.name,
              duration: `${duration}ms`,
              error: error.message,
            });
            throw error;
          }
        },
      };
    }

    return toolsMap;
  }

  async close(): Promise<void> {
    if (this.connected) {
      logger.info('MCP client closing');
      await this.client.close();
      this.connected = false;
      logger.info('MCP client closed');
    }
  }
}