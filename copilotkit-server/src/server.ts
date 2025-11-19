import express, { Application } from 'express';
import cors from 'cors';
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from '@copilotkit/runtime';
import { LocalMCPClient } from './mcp-client';

// This function will be imported by the main graphql-api server
export function mountCopilotKit(app: Application) {
  const serviceAdapter = new GoogleGenerativeAIAdapter({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  });

  // Use an environment variable for the gmd command path, defaulting to 'gmd' for production.
  const gmdCommand = process.env.GMD_COMMAND_PATH || 'gmd';
  // Configure the MCP server command.
  // Since the MCP server is colocalized with the GraphQL API, it can call it locally
  const mcpConfig = {
    command: gmdCommand,
    args: ['mcp', 'serve'],
    env: {
      GNOMAD_API_URL: process.env.GNOMAD_API_URL || 'http://localhost:8000/api',
    },
  };

  // Create runtime with MCP support
  const runtime = new CopilotRuntime({
    // Function to create MCP clients based on configuration
    createMCPClient: async (config) => {
      // For local MCP servers, use the stdio client
      if (config.endpoint === 'local://gnomad') {
        const client = new LocalMCPClient(mcpConfig);
        await client.connect();
        return client;
      }
      throw new Error(`Unsupported MCP endpoint: ${config.endpoint}`);
    },

    // Configure which MCP servers are available
    mcpServers: [
      {
        endpoint: 'local://gnomad',
        apiKey: undefined, // Not needed for local servers
      },
    ],
  });

  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/api/copilotkit',
    runtime,
    serviceAdapter,
  });

  // Define CORS options for the CopilotKit endpoint
  const corsOptions = {
    origin: [
      'http://localhost:8008', // local browser dev
      'http://localhost:8010', // local api dev
      'https://gnomad.broadinstitute.org', // production
    ],
    credentials: true,
  };

  // Mount the handler on the provided Express app with its own CORS middleware
  app.use('/api/copilotkit', cors(corsOptions), (req, res, next) => {
    (async () => handler(req, res))().catch(next);
  });

  console.log('CopilotKit server mounted on /api/copilotkit');
}

// For local development, allow running as a standalone server
if (require.main === module) {
  const app = express();
  mountCopilotKit(app);

  const PORT = process.env.COPILOTKIT_PORT || 4001;
  app.listen(PORT, () => {
    console.log(`CopilotKit server listening on http://localhost:${PORT}/api/copilotkit`);
  });
}
