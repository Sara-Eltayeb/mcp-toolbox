import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client = null;
let transport = null;
let mcpProcess = null;
let _connected = false;

export async function connect() {
  const serverPath = join(__dirname, "mockServer.js");

  mcpProcess = null;
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
  });

  client = new Client(
    { name: "mcp-toolbox-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  _connected = true;
}

export async function disconnect() {
  _connected = false;
  if (client) {
    try {
      await client.close();
    } catch {}
    client = null;
  }
  transport = null;
  if (mcpProcess) {
    try {
      mcpProcess.kill();
    } catch {}
    mcpProcess = null;
  }
}

export function isConnected() {
  return _connected;
}

export async function listTools() {
  if (!client || !_connected) throw new Error("MCP client is not connected");
  const result = await client.listTools();
  return result.tools;
}

export async function callTool(name, toolArgs) {
  if (!client || !_connected) throw new Error("MCP client is not connected");

  const result = await client.callTool(
    { name, arguments: toolArgs },
    undefined,
    { timeout: 10000 }
  );
  return result;
}
