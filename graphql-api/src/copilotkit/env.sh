#!/bin/sh
# CopilotKit environment configuration
# Source this from graphql-api/start.sh: source "$(dirname "$0")/src/copilotkit/env.sh"

# CopilotKit database (PostgreSQL for chat history)
DEFAULT_DATABASE_URL="postgresql://gnomad:gnomad_dev@localhost:5432/gnomad_copilot"
export DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"

# CopilotKit MCP server (gmd binary path)
# Uses the local gmd binary if available, falls back to 'gmd' in PATH
DEFAULT_GMD_COMMAND_PATH="${HOME}/.grove/bin/gmd"
if [ -f "$DEFAULT_GMD_COMMAND_PATH" ]; then
    export GMD_COMMAND_PATH="${GMD_COMMAND_PATH:-$DEFAULT_GMD_COMMAND_PATH}"
else
    export GMD_COMMAND_PATH="${GMD_COMMAND_PATH:-gmd}"
fi

# gnomAD API URL (for MCP server to call back to GraphQL API)
DEFAULT_GNOMAD_API_URL="http://localhost:8010/api"
export GNOMAD_API_URL="${GNOMAD_API_URL:-$DEFAULT_GNOMAD_API_URL}"

# Google Gemini API key (required for CopilotKit AI features)
if [ -z "${GOOGLE_GENERATIVE_AI_API_KEY:-}" ]; then
    echo "WARNING: GOOGLE_GENERATIVE_AI_API_KEY is not set"
    echo "CopilotKit AI features will not work without this API key"
    echo ""
    echo "To set it, add to your shell profile or .env:"
    echo "  export GOOGLE_GENERATIVE_AI_API_KEY=your-api-key"
    echo ""
    echo "Or retrieve from GCP Secret Manager:"
    echo "  export GOOGLE_GENERATIVE_AI_API_KEY=\$(gcloud secrets versions access latest --secret=gnomad-gemini-api-key-25-11-19 --project=YOUR_PROJECT)"
    echo ""
fi
