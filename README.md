# 🔧 MCP Toolbox

A complete demonstration of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) using the official JavaScript SDK — **no LLM required**.

The project shows how an MCP client discovers and invokes tools on an MCP server over JSON-RPC 2.0. A mock MCP server (started as a child process via stdio transport) exposes several utility tools. A dashboard frontend lets you browse, configure, and execute them, then inspect the raw results.

## Screenshots

![MCP Toolbox Dashboard](https://raw.githubusercontent.com/Sara-Eltayeb/mcp-toolbox/main/screenshot.png)
*Dashboard showing the tools grid, execution panel, and history sidebar.*

## Repository structure

```
mcp-toolbox/
├── frontend/                  # Static dashboard (GitHub Pages)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/                   # Express API + MCP client/server
│   ├── package.json
│   ├── server.js              # Express API (GET /tools, POST /run, GET /status)
│   ├── mcpClient.js           # MCP client that connects to the mock server
│   └── mockServer.js          # Mock MCP server with 5 tools
├── .github/workflows/
│   ├── deploy.yml             # Deploy frontend to GitHub Pages
│   └── node.yml               # CI: install + test on every push
├── .gitignore
└── README.md
```

## Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `echo` | Echoes back a message | `message` (required) |
| `roll_dice` | Rolls a dice with N sides | `sides` (optional, default 6) |
| `random_number` | Generates a random integer | `min`, `max` (optional) |
| `current_time` | Returns the current time | `timezone` (optional, default UTC) |
| `sample_data` | Generates sample JSON items | `count` (optional, default 3) |

## Installation

```bash
# Clone the repository
git clone https://github.com/Sara-Eltayeb/mcp-toolbox.git
cd mcp-toolbox

# Install backend dependencies
cd backend
npm install
```

## Running the backend

```bash
cd backend
npm start
```

The API starts on `http://localhost:3001`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Connection status |
| `/tools` | GET | List all discovered MCP tools |
| `/run` | POST | Execute a tool (send `{ "name": "...", "arguments": {...} }`) |

## Running the frontend

Open `frontend/index.html` in your browser **while the backend is running**.

For the best experience, serve the frontend through a local HTTP server:

```bash
# Using Python
python3 -m http.server 8080 --directory frontend

# Using Node.js
npx serve frontend
```

Then open `http://localhost:8080` in your browser.

> **Note:** The frontend expects the backend at `http://localhost:3001`. If your backend runs on a different port, update `API_BASE` in `frontend/app.js`.

## GitHub Pages deployment

The frontend is automatically deployed to GitHub Pages whenever code is pushed to the `main` branch.

### How to enable

After pushing the repository to GitHub:

1. Go to **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. The next push to `main` will trigger deployment

The frontend will be available at `https://<your-username>.github.io/mcp-toolbox/`.

> **Important:** The deployed frontend still needs a running backend. Run `npm start` in the `backend/` directory on your machine or server, then update `API_BASE` in `frontend/app.js` to point to it.

## Architecture

```
┌─────────────┐     REST      ┌──────────────┐    stdio transport    ┌────────────────┐
│  Dashboard  │ ──── JSON ──► │  Express API  │ ◄──────────────────► │  Mock MCP      │
│  (HTML/CSS) │ ◄──────────── │  (server.js)  │    JSON-RPC 2.0      │  Server         │
│             │               │  + MCP Client │                      │  (mockServer.js)│
└─────────────┘               └──────────────┘                      └────────────────┘
```

1. The **mock MCP server** (`mockServer.js`) is a child process that implements `initialize`, `tools/list`, and `tools/call` via the MCP SDK.
2. The **MCP client** (`mcpClient.js`) connects to the mock server over stdio transport using the MCP SDK.
3. The **Express API** (`server.js`) exposes REST endpoints that delegate to the MCP client.
4. The **dashboard** (`frontend/`) calls the REST API to list tools, display them as cards, and execute them with custom parameters.

## License

MIT
