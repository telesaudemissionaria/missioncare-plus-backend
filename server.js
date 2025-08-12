// server.js (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://telesaudemissionaria.github.io"
]);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(new Error("Not allowed by CORS: " + origin));
        },
        credentials: true
    })
);

app.use(bodyParser.json({ limit: "1mb" }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
    res.json({ ok: true, message: "MissionCare Plus Backend OK" });
});

async function runAssistantOnce({ assistantId, userMessage }) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada no ambiente.");
    if (!assistantId) throw new Error("assistantId é obrigatório.");

    const thread = await client.beta.threads.create();
    const threadId = thread.id;

    await client.beta.threads.messages.create(threadId, {
        role: "user",
        content: userMessage || ""
    });

    let run = await client.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    while (run.status === "queued" || run.status === "in_progress") {
        await new Promise((r) => setTimeout(r, 1000));
        run = await client.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (run.status !== "completed") {
        return { ok: false, threadId, text: "", check: null, error: `Run terminou com status: ${run.status}` };
    }

    const msgs = await client.beta.threads.messages.list(threadId, { order: "desc", limit: 1 });

    let text = "";
    const first = msgs.data?.[0];
    if (first && Array.isArray(first.content)) {
        const block = first.content.find((c) => c.type === "text");
        text = block?.text?.value || "";
    }

    let check = null;
    const match = text.match(/json\s*([\s\S]*?)\s*\//);
    if (match && match[1]) {
        try {
            check = JSON.parse(match[1]);
        } catch (e) {
            // Ignora erros de parsing
        }
    }

    return { ok: true, threadId, text, check };
}

app.post("/api/assistants/run", async (req, res) => {
    try {
        const { assistantId, message } = req.body || {};
        const result = await runAssistantOnce({ assistantId, userMessage: message || "" });
        if (!result.ok) return res.status(500).json(result);
        return res.json(result);
    } catch (error) {
        console.error("Erro /run:", error);
        return res.status(500).json({ ok: false, error: error?.message || "Erro interno" });
    }
});

const ASSISTANTS = {
    emergencias: "asst_NU2rjoLUZiECJ711IE1pXotZ",
    gob: "asst_6Y4J1zJGLhr7Wy129uj4shtA",
    clinica: "asst_qitIwbREUyPY1GRIYH7vYQx0",
    pediatria: "asst_AMRI91iC8Efv90P41K3PVATV"
};

app.post("/api/assistants/run/emergencias", async (req, res) => {
    try {
        const { message } = req.body || {};
        const result = await runAssistantOnce({ assistantId: ASSISTANTS.emergencias, userMessage: message || "" });
        if (!result.ok) return res.status(500).json(result);
        return res.json(result);
    } catch (error) {
        console.error("Erro /emergencias:", error);
        return res.status(500).json({ ok: false, error: error?.message || "Erro interno" });
    }
});

app.post("/api/assistants/run/gob", async (req, res) => {
    try {
        const { message } = req.body || {};
        const result = await runAssistantOnce({ assistantId: ASSISTANTS.gob, userMessage: message || "" });
        if (!result.ok) return res.status(500).json(result);
        return res.json(result);
    } catch (error) {
        console.error("Erro /gob:", error);
        return res.status(500).json({ ok: false, error: error?.message || "Erro interno" });
    }
});

app.post("/api/assistants/run/clinica", async (req, res) => {
    try {
        const { message } = req.body || {};
        const result = await runAssistantOnce({ assistantId: ASSISTANTS.clinica, userMessage: message || "" });
        if (!result.ok) return res.status(500).json(result);
        return res.json(result);
    } catch (error) {
        console.error("Erro /clinica:", error);
        return res.status(500).json({ ok: false, error: error?.message || "Erro interno" });
    }
});

app.post("/api/assistants/run/pediatria", async (req, res) => {
    try {
        const { message } = req.body || {};
        const result = await runAssistantOnce({ assistantId: ASSISTANTS.pediatria, userMessage: message || "" });
        if (!result.ok) return res.status(500).json(result);
        return res.json(result);
    } catch (error) {
        console.error("Erro /pediatria:", error);
        return res.status(500).json({ ok: false, error: error?.message || "Erro interno" });
    }
});

app.listen(PORT, () => {
    console.log(`Server on http://localhost:${PORT}`);
});
