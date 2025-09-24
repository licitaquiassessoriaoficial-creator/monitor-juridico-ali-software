import { fontesJuridicas } from '../src/fontes.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const USER_IDS = ['user1', 'user2', 'user3']; // Usuários de teste

interface Evento {
  fonte: string;
  processo: string;
  movimento: string;
  texto?: string;
  link?: string;
  data?: string;
}

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

// Generate random date within last 30 days
function generateDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  return date.toISOString().split('T')[0];
}

// Generate sample event
function generateEvento(): Evento {
  const fonte = fontesJuridicas[Math.floor(Math.random() * fontesJuridicas.length)];
  const movimento = movimentos[Math.floor(Math.random() * movimentos.length)];
  const texto = textosSample[Math.floor(Math.random() * textosSample.length)];
  
  return {
    fonte: fonte.nome.split(' - ')[0], // Extract short name (e.g., "TJSP")
    processo: generateProcesso(),
    movimento,
    texto,
    link: `${fonte.url}/processo/${generateProcesso()}`,
    data: generateDate()
  };
}

// Send event to API
async function sendEvent(evento: Evento, userId: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(evento)
    });

    const result = await response.json();
    
    if (response.ok) {
      if (result.duplicate) {
        console.log(`✅ [${userId}] Evento duplicado (hash: ${result.id})`);
      } else {
        console.log(`🆕 [${userId}] Novo evento processado:`, {
          fonte: evento.fonte,
          processo: evento.processo,
          movimento: evento.movimento,
          hash: result.id
        });
      }
    } else {
      console.error(`❌ [${userId}] Erro ao enviar evento:`, result.error);
    }
  } catch (error) {
    console.error(`❌ [${userId}] Erro de conexão:`, error);
  }
}

// Main worker function
async function runWorker(): Promise<void> {
  console.log('🔄 Iniciando worker de monitoramento jurídico...');
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`👥 Usuários: ${USER_IDS.join(', ')}`);
  
  // Generate 1-3 events per user
  for (const userId of USER_IDS) {
    const eventCount = Math.floor(Math.random() * 3) + 1; // 1-3 events
    
    console.log(`\n📨 Gerando ${eventCount} evento(s) para usuário ${userId}...`);
    
    for (let i = 0; i < eventCount; i++) {
      const evento = generateEvento();
      await sendEvent(evento, userId);
      
      // Small delay between events for the same user
      if (i < eventCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  console.log('\n✅ Worker concluído!');
}

// Health check before running
async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const health = await response.json();
    
    if (response.ok && health.status === 'ok') {
      console.log('✅ API está funcionando');
      return true;
    } else {
      console.error('❌ API não está respondendo corretamente');
      return false;
    }
  } catch (error) {
    console.error('❌ Não foi possível conectar à API:', error);
    return false;
  }
}

// Run worker
async function main(): Promise<void> {
  console.log('🚀 Monitor Jurídico Worker');
  console.log(`⏰ Executado em: ${new Date().toISOString()}`);
  
  // Check if API is available
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    console.log('💡 Certifique-se de que a API está rodando: pnpm run dev');
    process.exit(1);
  }
  
  await runWorker();
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal no worker:', error);
    process.exit(1);
  });
}