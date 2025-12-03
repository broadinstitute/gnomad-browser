# CopilotKit Server

**Note:** The CopilotKit server code has been moved into the GraphQL API codebase.

## Location

The CopilotKit server is now integrated into the GraphQL API at:
- **Source code:** `graphql-api/src/copilotkit/`
- **Mounted in:** `graphql-api/src/app.ts`

## Architecture

The CopilotKit server now runs as part of the same Node.js process as the GraphQL API, mounted at `/api/copilotkit`. This colocation provides several benefits:

- **Better performance:** MCP server calls GraphQL API via localhost
- **Simplified deployment:** Single container for both services
- **Easier development:** Shared dependencies and TypeScript configuration

## Local Development

For local standalone testing of the CopilotKit functionality, you can still run it separately:

```bash
cd copilotkit-server
./start.sh
```

This will use the standalone server script that imports from the GraphQL API codebase.

## Production

In production, the CopilotKit endpoint is automatically available at `/api/copilotkit` as part of the GraphQL API deployment. No separate deployment is needed.
