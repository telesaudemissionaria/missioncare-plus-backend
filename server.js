"use strict";

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai"); // SDK OpenAI 4.x

// Config
const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// IDs dos Assistants
const ASSISTANTS = {
emergencias: "asst_NU2rjoLUZiECJ711IE1pXotZ",
gob: "asst_6Y4J1zJGLhr7Wy129uj4shtA",
clinica: "asst_qitIwbREUyPY1GRIYH7vYQx0",
pediatria: "asst_AMRI91iC8Efv90P41K3PVATV",
};

const app = express();

// CORS — libera seu GitHub Pages e alguns hosts locais
const allowedOrigins = new Set([
"https://telesaudemissionaria.github.io",
"http://localhost:3000",
"http://127.0.0.1:3000",
"http://localhost",
"http://127.0.0.1",
]);

app.use(
cors({
origin: (origin, cb) => {
if (!origin) return cb(null, true); // permite curl/PowerShell/ReqBin
if (allowedOrigins.has(origin)) return cb(null, true);
return cb(new Error("CORS not allowed for origin: " + origin));
},
})
);

app.use(bodyParser.json({ limit: "1mb" }));

// Log simples
app.use((req, res, next) => {
console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
next();
});

// Health check
app.get("/", (req, res) => {
res.send("MissionCare Plus Backend is running");
});

// Função para executar um Assistant 1x
async function runAssistantOnce(assistantId, message) {
if (!OPENAI_API_KEY) {
const err = new Error("OPENAI_API_KEY is missing");
err.status = 500;
throw err;
}
if (!assistantId) {
const err = new Error("assistantId is required");
err.status = 400;
throw err;
}
if (!message || typeof message !== "string") {
const err = new Error("message is required (string)");
err.status = 400;
throw err;
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// 1) Cria thread
const thread = await client.beta.threads.create();
const threadId = thread.id;

// 2) Adiciona mensagem do usuário
await client.beta.threads.messages.create(threadId, {
role: "user",
content: message,
});

// 3) Inicia run
const run = await client.beta.threads.runs.create(threadId, {
assistant_id: assistantId,
});

// 4) Espera concluir
let state = run;
while (state.status === "queued" || state.status === "in_progress") {
await new Promise((r) => setTimeout(r, 1000));
state = await client.beta.threads.runs.retrieve(threadId, run.id);
}

if (state.status !== "completed") {
const err = new Error("Run did not complete: " + state.status);
err.status = 500;
throw err;
}

// 5) Lê resposta
const msgs = await client.beta.threads.messages.list(threadId, {
order: "desc",
limit: 1,
});

let text = "";
const first = msgs.data?.[0];
if (first && first.content?.length) {
  const block = first.content.find((c) => c.type === "text");
  text = block?.text?.value || "";
}

// Tenta extrair um bloco de checklist em JSON entre ```json e ```
let check = null;
const match = text.match(/```json\s*([\s\S]*?)\s*```/);
if (match) {
  try {
    check = JSON.parse(match[1]);
  } catch {}
}

return { ok: true, threadId, text, check };
}

// Rota genérica (POST) — recebe assistantId no body
app.post("/api/assistants/run", async (req, res) => {
try {
const { assistantId, message } = req.body || {};
const out = await runAssistantOnce(assistantId, message);
res.json(out);
} catch (e) {
console.error("Error /api/assistants/run:", e);
res
.status(e.status || 500)
.json({ ok: false, error: e.message || "Internal Server Error" });
}
});

// Rotas específicas (POST) — não expõem os IDs no front
app.post("/api/assistants/run/emergencias", async (req, res) => {
try {
const { message } = req.body || {};
const out = await runAssistantOnce(ASSISTANTS.emergencias, message);
res.json(out);
} catch (e) {
console.error("Error /emergencias:", e);
res
.status(e.status || 500)
.json({ ok: false, error: e.message || "Internal Server Error" });
}
});

app.post("/api/assistants/run/gob", async (req, res) => {
try {
const { message } = req.body || {};
const out = await runAssistantOnce(ASSISTANTS.gob, message);
res.json(out);
} catch (e) {
console.error("Error /gob:", e);
res
.status(e.status || 500)
.json({ ok: false, error: e.message || "Internal Server Error" });
}
});

app.post("/api/assistants/run/clinica", async (req, res) => {
try {
const { message } = req.body || {};
const out = await runAssistantOnce(ASSISTANTS.clinica, message);
res.json(out);
} catch (e) {
console.error("Error /clinica:", e);
res
.status(e.status || 500)
.json({ ok: false, error: e.message || "Internal Server Error" });
}
});

app.post("/api/assistants/run/pediatria", async (req, res) => {
try {
const { message } = req.body || {};
const out = await runAssistantOnce(ASSISTANTS.pediatria, message);
res.json(out);
} catch (e) {
console.error("Error /pediatria:", e);
res
.status(e.status || 500)
.json({ ok: false, error: e.message || "Internal Server Error" });
}
});

// 404 padrão
app.use((req, res) => {
res.status(404).send("Not found");
});

// Start
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
