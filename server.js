import express from "express";
import cors from "cors";
import runHandler from "./api/assistants/run.js";
import runMultiHandler from "./api/assistants/run-multi.js";

const app = express();
app.use(express.json());

// Domínio do seu front-end (GitHub Pages)
const allowedOrigin = "https://telesaudemissionaria.github.io";
app.use(cors({ origin: allowedOrigin }));

// Rota simples para verificar se está no ar
app.get("/", (_req, res) => res.send("MissionCare Plus Backend is running"));

// Rotas da API que falam com os Assistants
app.post("/api/assistants/run", runHandler);
app.post("/api/assistants/run-multi", runMultiHandler);

// Porta dinâmica do Render (ou 3000 local)
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server on http://localhost:${port}`));
