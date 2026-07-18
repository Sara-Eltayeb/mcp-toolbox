/* ── Configuration ── */
const API_BASE = "http://localhost:3001";
const POLL_INTERVAL = 5000;

/* ── State ── */
let tools = [];
let selectedTool = null;
let history = [];

/* ── DOM refs ── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const statusDot = $("#statusDot");
const statusLabel = $("#statusLabel");
const toolsGrid = $("#toolsGrid");
const toolCount = $("#toolCount");
const executionSection = $("#executionSection");
const execToolName = $("#execToolName");
const execToolDesc = $("#execToolDesc");
const paramsForm = $("#paramsForm");
const runBtn = $("#runBtn");
const closeExecution = $("#closeExecution");
const resultArea = $("#resultArea");
const resultContent = $("#resultContent");
const resultTime = $("#resultTime");
const resultSpinner = $("#resultSpinner");
const historyList = $("#historyList");
const clearHistory = $("#clearHistory");

/* ── API helpers ── */
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Connection polling ── */
function setStatus(ok) {
  statusDot.className = "status-dot " + (ok ? "connected" : "disconnected");
  statusLabel.textContent = ok ? "Connected" : "Disconnected";
}

async function pollStatus() {
  try {
    const data = await apiGet("/status");
    if (data.connected) {
      setStatus(true);
    } else {
      setStatus(false);
    }
  } catch {
    setStatus(false);
  }
}

/* ── Tool rendering ── */
function renderToolCards() {
  if (!tools.length) {
    toolsGrid.innerHTML = '<p class="error-message">No tools discovered.</p>';
    toolCount.textContent = "0";
    return;
  }

  toolCount.textContent = String(tools.length);

  toolsGrid.innerHTML = tools
    .map(
      (t) => `
    <div class="tool-card${selectedTool?.name === t.name ? " selected" : ""}" data-tool="${t.name}">
      <div class="tool-card-name">${t.name}</div>
      <div class="tool-card-desc">${escapeHtml(t.description || "")}</div>
      ${t.inputSchema ? `<div class="tool-card-params">${Object.keys(t.inputSchema.properties || {}).join(", ") || "no params"}</div>` : ""}
    </div>
  `
    )
    .join("");

  $$(".tool-card").forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.dataset.tool;
      const tool = tools.find((t) => t.name === name);
      if (tool) selectTool(tool);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ── Tool selection ── */
function selectTool(tool) {
  selectedTool = tool;
  renderToolCards();

  executionSection.style.display = "block";
  execToolName.textContent = `🔧 ${tool.name}`;
  execToolDesc.textContent = tool.description || "";
  resultArea.style.display = "none";

  buildParamsForm(tool);
}

closeExecution.addEventListener("click", () => {
  selectedTool = null;
  executionSection.style.display = "none";
  renderToolCards();
});

/* ── Parameter form builder ── */
function buildParamsForm(tool) {
  const schema = tool.inputSchema || {};
  const props = schema.properties || {};
  const required = new Set(schema.required || []);

  if (!Object.keys(props).length) {
    paramsForm.innerHTML =
      '<p class="empty-state" style="text-align:left;padding:8px 0">No parameters required</p>';
    return;
  }

  paramsForm.innerHTML = Object.entries(props)
    .map(([key, prop]) => {
      const isReq = required.has(key);
      const label = `${key}${isReq ? "" : ' <span class="optional">(optional)</span>'}`;
      const defValue = prop.default ?? "";

      if (prop.type === "boolean") {
        return `
          <div class="param-field">
            <label><input type="checkbox" name="${key}" ${defValue ? "checked" : ""}> ${label}</label>
          </div>`;
      }

      return `
        <div class="param-field">
          <label>${label}</label>
          <input type="${prop.type === "number" ? "number" : "text"}" name="${key}" 
                 placeholder="${prop.description || key}" value="${defValue}"
                 ${prop.type === "number" ? `step="${Number.isInteger(defValue) ? "1" : "any"}"` : ""}>
        </div>`;
    })
    .join("");
}

/* ── Tool execution ── */
runBtn.addEventListener("click", async () => {
  if (!selectedTool) return;

  const args = collectParams();
  runBtn.disabled = true;
  resultArea.style.display = "block";
  resultSpinner.style.display = "flex";
  resultContent.textContent = "";
  resultTime.textContent = "";
  resultContent.className = "";

  const startTime = Date.now();

  try {
    const data = await apiPost("/run", { name: selectedTool.name, arguments: args });
    const elapsed = Date.now() - startTime;

    resultSpinner.style.display = "none";
    resultTime.textContent = `${elapsed}ms`;

    const textContent = data.result?.content?.[0]?.text || JSON.stringify(data.result, null, 2);
    resultContent.textContent = textContent;
    resultContent.className = "";

    addHistory(selectedTool.name, args, textContent, elapsed);
  } catch (err) {
    resultSpinner.style.display = "none";
    resultTime.textContent = "error";
    resultContent.textContent = `Error: ${err.message}`;
    resultContent.className = "";
  }

  runBtn.disabled = false;
});

function collectParams() {
  const inputs = paramsForm.querySelectorAll("input");
  const args = {};
  inputs.forEach((input) => {
    if (input.type === "checkbox") {
      args[input.name] = input.checked;
    } else if (input.type === "number") {
      const val = input.value.trim();
      if (val !== "") args[input.name] = Number(val);
    } else {
      const val = input.value.trim();
      if (val !== "") args[input.name] = val;
    }
  });
  return args;
}

/* ── History ── */
function addHistory(name, args, result, elapsed) {
  history.unshift({ name, args, result, elapsed, time: new Date() });
  if (history.length > 50) history.pop();
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<p class="empty-state">No executions yet</p>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (h, i) => `
    <div class="history-item" data-index="${i}">
      <span class="hist-name">🔧 ${h.name}</span>
      <span class="hist-time">${h.elapsed}ms · ${formatTime(h.time)}</span>
    </div>
  `
    )
    .join("");

  $$(".history-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.index);
      const h = history[idx];
      resultArea.style.display = "block";
      resultSpinner.style.display = "none";
      resultContent.textContent = h.result;
      resultTime.textContent = `${h.elapsed}ms`;
      resultContent.className = "";
    });
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

clearHistory.addEventListener("click", () => {
  history = [];
  renderHistory();
});

/* ── Initialization ── */
async function init() {
  pollStatus();
  setInterval(pollStatus, POLL_INTERVAL);

  try {
    const data = await apiGet("/tools");
    tools = data.tools || [];
    renderToolCards();

    if (tools.length) {
      selectTool(tools[0]);
    }
  } catch (err) {
    toolsGrid.innerHTML = `<p class="error-message">Failed to connect to backend: ${escapeHtml(err.message)}</p>`;
    toolCount.textContent = "!";
  }
}

init();
