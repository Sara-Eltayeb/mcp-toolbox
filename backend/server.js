import express from "express";
import cors from "cors";
import { connect, disconnect, listTools, callTool, isConnected } from "./mcpClient.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/status", (_req, res) => {
  res.json({ connected: isConnected() });
});

app.get("/tools", async (_req, res) => {
  try {
    const tools = await listTools();
    res.json({ tools });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/run", async (req, res) => {
  try {
    const { name, arguments: toolArgs } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Tool name is required" });
    }
    const result = await callTool(name, toolArgs || {});
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  try {
    await connect();
    console.log("Connected to MCP server");
  } catch (err) {
    console.error("Failed to connect to MCP server:", err.message);
    process.exit(1);
  }

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await disconnect();
    process.exit(0);
  });

  app.listen(PORT, () => {
    console.log(`MCP Toolbox API running on http://localhost:${PORT}`);
    console.log(`  GET  /status  - Connection status`);
    console.log(`  GET  /tools   - List all tools`);
    console.log(`  POST /run     - Execute a tool`);
  });
}

start();
