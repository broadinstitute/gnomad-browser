import express from 'express';
import cors from 'cors';
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from '@copilotkit/runtime';
import { LocalMCPClient } from './mcp-client';

const app = express();

// Enable CORS for the browser
app.use(cors({
  origin: ['http://localhost:8008', 'http://localhost:8010'],
  credentials: true
}));

const serviceAdapter = new GoogleGenerativeAIAdapter({
  model: "gemini-1.5-flash-latest",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

// Configure the MCP server command.
// Assumes the 'gmd' binary is installed in PATH
const mcpConfig = {
  command: "gmd",
  args: ["mcp", "serve"],
  env: {
    GNOMAD_API_URL: process.env.GNOMAD_API_URL || "https://gnomad.broadinstitute.org/api"
  }
};

// Create runtime with MCP support
const runtime = new CopilotRuntime({
  // Function to create MCP clients based on configuration
  createMCPClient: async (config) => {
    // For local MCP servers, use the stdio client
    if (config.endpoint === "local://gnomad") {
      const client = new LocalMCPClient(mcpConfig);
      await client.connect();
      return client;
    }
    throw new Error(`Unsupported MCP endpoint: ${config.endpoint}`);
  },

  // Configure which MCP servers are available
  mcpServers: [
    {
      endpoint: "local://gnomad",
      apiKey: undefined, // Not needed for local servers
    }
  ]
});

app.use('/api/copilotkit', (req, res, next) => {
  (async () => {
    const handler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/api/copilotkit',
      runtime,
      serviceAdapter,
    });

    return handler(req, res);
  })().catch(next);
});

const PORT = process.env.COPILOTKIT_PORT || 4001;

app.listen(PORT, () => {
  console.log(`CopilotKit server listening on http://localhost:${PORT}/api/copilotkit`);
});
