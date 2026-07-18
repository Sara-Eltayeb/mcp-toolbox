#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  {
    name: "echo",
    description: "Echoes back the input message",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message to echo back" },
      },
      required: ["message"],
    },
  },
  {
    name: "roll_dice",
    description: "Rolls a dice with the specified number of sides",
    inputSchema: {
      type: "object",
      properties: {
        sides: {
          type: "number",
          description: "Number of sides (default 6)",
          default: 6,
        },
      },
    },
  },
  {
    name: "random_number",
    description: "Generates a random integer within a range",
    inputSchema: {
      type: "object",
      properties: {
        min: { type: "number", description: "Minimum value", default: 0 },
        max: {
          type: "number",
          description: "Maximum value",
          default: 100,
        },
      },
    },
  },
  {
    name: "current_time",
    description: "Returns the current time for a given timezone",
    inputSchema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone (e.g. UTC, America/New_York, Europe/London)",
          default: "UTC",
        },
      },
    },
  },
  {
    name: "sample_data",
    description: "Generates sample data items for testing",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of items to generate",
          default: 3,
        },
      },
    },
  },
];

const server = new Server(
  { name: "mcp-toolbox-demo", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "echo": {
      const msg = args?.message ?? "";
      return {
        content: [{ type: "text", text: `You said: ${msg}` }],
      };
    }

    case "roll_dice": {
      const sides = args?.sides ?? 6;
      const result = Math.floor(Math.random() * sides) + 1;
      return {
        content: [
          {
            type: "text",
            text: `Rolled a d${sides}: **${result}**`,
          },
        ],
      };
    }

    case "random_number": {
      const min = args?.min ?? 0;
      const max = args?.max ?? 100;
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      return {
        content: [
          {
            type: "text",
            text: `Random integer [${min}, ${max}]: **${result}**`,
          },
        ],
      };
    }

    case "current_time": {
      const tz = args?.timezone || "UTC";
      let timeStr;
      try {
        timeStr = new Date().toLocaleString("en-US", { timeZone: tz });
      } catch {
        timeStr = new Date().toLocaleString("en-US", { timeZone: "UTC" });
      }
      return {
        content: [{ type: "text", text: `Current time (${tz}): **${timeStr}**` }],
      };
    }

    case "sample_data": {
      const count = args?.count ?? 3;
      const items = Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.round(Math.random() * 10000) / 100,
        active: Math.random() > 0.5,
        tags: ["demo", `tag-${i + 1}`],
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
