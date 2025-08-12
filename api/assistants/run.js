import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Checklist simples para avaliar triagem
function triageChecklist(text) {
  const checks = {
    papelIA: /IA de apoio|não substituo consulta|não prescrevo/i.test(text),
    acaoImediata: /ligue.*emerg|procure.*imediat|não dirija|vá ao hospital/i.test(text),
    passosNumerados: /\n\s*1[\).]/.test(text) && /\n\s*2[\).]/.test(text),
    sinaisPiora: /sinais.*(pior|vermelh|alarme)|falta de ar|desmaio|vômitos|sangramento|confusão/i.test(text),
    tomAcolhedor: /estou aqui|sua segurança|vamos passo a passo|acalme-se/i.test(text),
  };
  const aprovado = Object.values(checks).filter(Boolean).length >= 4; // aprova se 4/5 itens passaram
  return { checks, aprovado };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const { assistantId, message, threadId } = req.body || {};
    if (!assistantId || !message) {
      return res.status(400).json({ ok: false, error: "assistantId and message are required" });
    }

    // 1) Cria thread se não veio, senão reutiliza
    const thread = threadId ? { id: threadId } : await client.beta.threads.create();

    // 2) Adiciona mensagem do usuário
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // 3) Cria a run do assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // 4) Polling até completar
    let status = run.status;
    while (status === "queued" || status === "in_progress") {
      await new Promise(r => setTimeout(r, 1000));
      const r2 = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = r2.status;
      if (status === "completed") break;
      if (status !== "queued" && status !== "in_progress") {
        throw new Error(`Run status: ${status}`);
      }
    }

    // 5) Lê as mensagens e pega a última (resposta do assistant)
    const msgs = await client.beta.threads.messages.list(thread.id, { order: "asc" });
    const last = msgs.data[msgs.data.length - 1];
    const text = (last.content || [])
      .map(p => p.text?.value || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    const check = triageChecklist(text);

    return res.status(200).json({ ok: true, threadId: thread.id, text, check });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
