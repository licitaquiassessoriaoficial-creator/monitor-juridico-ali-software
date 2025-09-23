import type { Config } from "@netlify/functions";
import { fontesJuridicas } from "../../src/fontes.js";

export const config: Config = { path: "/work-run" };

// Sample movements for different types of legal proceedings
const movimentos = [
  'Despacho',
  'Sentença',
  'Acórdão',
  'Intimação',
  'Citação',
  'Audiência Designada',
  'Recurso Recebido',
  'Recurso Julgado',
  'Petição Protocolada',
  'Decisão Interlocutória',
  'Apelação Interposta',
  'Mandado Expedido',
  'Certidão',
  'Julgamento',
  'Homologação'
];

const textosSample = [
  'Intime-se para manifestação em 15 dias',
  'Cite-se o requerido para contestar em 15 dias',
  'Designo audiência de conciliação',
  'Defiro a liminar pleiteada',
  'Recebo o recurso em seu efeito devolutivo',
  'Julgo procedente o pedido',
  'Homologo o acordo celebrado',
  'Determino a expedição de mandado',
  'Defiro os benefícios da justiça gratuita',
  'Indefiro o pedido de antecipação de tutela'
];

// Generate random processo number
function generateProcesso(): string {
  const sequential = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
  const year = new Date().getFullYear();
  const segment = '8'; // Justice segment (8 = state courts)
  const court = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  const origin = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `${sequential}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}.${year}.${segment}.${court}.${origin}`;
}

// Generate sample event
function generateEvento() {
  const fonte = fontesJuridicas[Math.floor(Math.random() * fontesJuridicas.length)];
  const movimento = movimentos[Math.floor(Math.random() * movimentos.length)];
  const texto = textosSample[Math.floor(Math.random() * textosSample.length)];
  
  return {
    fonte: fonte.nome.split(' - ')[0], // Extract short name (e.g., "TJSP")
    processo: generateProcesso(),
    movimento,
    texto,
    link: `${fonte.url}/processo/${generateProcesso()}`,
    data: new Date().toISOString().slice(0, 10)
  };
}

export default async function handler() {
  const base = process.env.URL || ""; // URL do site no Netlify
  const userIds = ["user-123", "user-456", "user-789"]; // IDs de teste
  
  console.log(`🚀 Worker executado em: ${new Date().toISOString()}`);
  console.log(`📡 Base URL: ${base}`);

  const eventos = [];
  
  // Gerar 1-3 eventos por usuário
  for (const userId of userIds) {
    const eventCount = Math.floor(Math.random() * 3) + 1; // 1-3 events
    
    for (let i = 0; i < eventCount; i++) {
      const evento = generateEvento();
      eventos.push({ userId, evento });

      try {
        await fetch(`${base}/.netlify/functions/api/ingest`, {
          method: "POST",
          headers: { 
            "content-type": "application/json", 
            "x-user-id": userId 
          },
          body: JSON.stringify(evento)
        });
        
        console.log(`✅ [${userId}] Evento enviado:`, {
          fonte: evento.fonte,
          processo: evento.processo,
          movimento: evento.movimento
        });
      } catch (error) {
        console.error(`❌ [${userId}] Erro ao enviar evento:`, error);
      }
    }
  }

  return new Response(JSON.stringify({ 
    ok: true, 
    sent: eventos.length,
    timestamp: new Date().toISOString(),
    users: userIds.length
  }), {
    status: 200, 
    headers: { "content-type": "application/json" }
  });
}