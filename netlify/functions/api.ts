import type { Config } from "@netlify/functions";
import crypto from "node:crypto";
import { getHistory, putHistory, getSeen, putSeen } from "../../src/gh-storage.js";
import { requireAuth } from "../../src/auth.js";

export const config: Config = { path: "/api/*" };

function hashEvento(e: any) {
  return crypto.createHash("sha1").update(
    `${e.fonte}|${e.processo}|${e.movimento}|${e.data ?? ""}`
  ).digest("hex");
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace("/.netlify/functions", "");

    // Require authentication for all API endpoints
    let userId: string;
    try {
      const user = requireAuth(req);
      userId = user.userId;
    } catch (authError: any) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "unauthorized",
        message: "Authentication required. Please log in." 
      }), {
        status: 401, 
        headers: { "content-type": "application/json" }
      });
    }

    if (req.method === "POST" && pathname === "/api/ingest") {
      const evento = await req.json(); // {fonte,processo,movimento,texto?,link?,data?}
      const id = hashEvento(evento);

      const { content: seen, sha: seenSha } = await getSeen(userId);
      const key = "default";
      (seen as any)[key] ||= [];

      if (!(seen as any)[key].includes(id)) {
        // 1) carrega history atual
        const { content: history, sha: historySha } = await getHistory(userId);
        const arr = Array.isArray(history) ? history : [];

        // 2) anexa no topo
        arr.unshift({ id, ts: Date.now(), ...evento });

        // 3) grava history e seen
        await putHistory(userId, arr, historySha);
        (seen as any)[key].push(id);
        await putSeen(userId, seen as any, seenSha);

        // TODO: disparar notificação (e-mail/whats) aqui se quiser
        console.log(`[INGEST] 📥 Novo evento para usuário ${userId}:`, {
          fonte: evento.fonte,
          processo: evento.processo,
          movimento: evento.movimento,
          hash: id
        });

        return new Response(JSON.stringify({ 
          ok: true, 
          duplicate: false, 
          id 
        }), { 
          status: 200, 
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        duplicate: true, 
        id 
      }), { 
        status: 200, 
        headers: { "content-type": "application/json" }
      });
    }

    if (req.method === "GET" && pathname === "/api/history") {
      const { content } = await getHistory(userId);
      const items = Array.isArray(content) ? content : [];
      return new Response(JSON.stringify({ items }), { 
        status: 200, 
        headers: { "content-type": "application/json" }
      });
    }

    if (req.method === "DELETE" && pathname === "/api/history") {
      await putHistory(userId, []);
      await putSeen(userId, { default: [] });
      
      return new Response(JSON.stringify({ ok: true, message: "Histórico zerado" }), { 
        status: 200, 
        headers: { "content-type": "application/json" }
      });
    }

    if (req.method === "GET" && pathname === "/api/health") {
      return new Response(JSON.stringify({ 
        ok: true, 
        timestamp: new Date().toISOString(),
        authenticated: true,
        user: userId.substring(0, 8) + "..." // Only show partial hash for security
      }), { 
        status: 200, 
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
    
  } catch (e: any) {
    console.error("[API] Erro:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, 
      headers: { "content-type": "application/json" }
    });
  }
}