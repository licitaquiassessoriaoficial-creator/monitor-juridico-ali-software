import express, { Express } from 'express';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { sendEmail, sendWhats } from './notify.js';

const app: Express = express();
const PORT = 3000;

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Types
interface Evento {
  fonte: string;
  processo: string;
  movimento: string;
  texto?: string;
  link?: string;
  data?: string;
}

interface EventoHistorico extends Evento {
  id: string;
  ts: number;
}

// File system helpers
async function ensureUserDirs(userId: string): Promise<void> {
  const userDir = path.join('data', 'users', userId);
  try {
    await fs.mkdir(userDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

async function readJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return fallback;
  }
}

async function writeJSON(filePath: string, data: any): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashEvento(evento: Evento): string {
  const input = `${evento.fonte}|${evento.processo}|${evento.movimento}|${evento.data || ''}`;
  return createHash('sha1').update(input).digest('hex');
}

// Authentication middleware (simplified)
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(400).json({ error: 'Header x-user-id é obrigatório' });
  }
  req.userId = userId;
  next();
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// Routes
app.post('/ingest', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const evento: Evento = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!evento.fonte || !evento.processo || !evento.movimento) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: fonte, processo, movimento' 
      });
    }

    // Ensure user directories exist
    await ensureUserDirs(userId);

    const userDir = path.join('data', 'users', userId);
    const historyPath = path.join(userDir, 'history.json');
    const seenPath = path.join(userDir, 'seen.json');

    // Calculate hash and check for duplicates
    const hash = hashEvento(evento);
    const seen = await readJSON<string[]>(seenPath, []);

    if (seen.includes(hash)) {
      return res.json({ ok: true, duplicate: true });
    }

    // Read current history
    const history = await readJSON<EventoHistorico[]>(historyPath, []);

    // Create new event entry
    const eventoHistorico: EventoHistorico = {
      id: hash,
      ts: Date.now(),
      ...evento
    };

    // Send notifications (async, don't wait)
    sendEmail(userId, evento).catch(err => 
      console.error('Erro ao enviar email:', err)
    );
    sendWhats(userId, evento).catch(err => 
      console.error('Erro ao enviar WhatsApp:', err)
    );

    // Update history and seen lists
    history.unshift(eventoHistorico);
    seen.push(hash);

    // Save to files
    await writeJSON(historyPath, history);
    await writeJSON(seenPath, seen);

    console.log(`[INGEST] 📥 Novo evento para usuário ${userId}:`, {
      fonte: evento.fonte,
      processo: evento.processo,
      movimento: evento.movimento,
      hash
    });

    res.json({ ok: true, duplicate: false, id: hash });
  } catch (error) {
    console.error('[INGEST] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/history', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.userId;
    const userDir = path.join('data', 'users', userId);
    const historyPath = path.join(userDir, 'history.json');

    const history = await readJSON<EventoHistorico[]>(historyPath, []);

    res.json({ items: history });
  } catch (error) {
    console.error('[HISTORY] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/history', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.userId;
    const userDir = path.join('data', 'users', userId);
    const historyPath = path.join(userDir, 'history.json');
    const seenPath = path.join(userDir, 'seen.json');

    // Reset history and seen files
    await writeJSON(historyPath, []);
    await writeJSON(seenPath, []);

    console.log(`[RESET] 🗑️ Histórico zerado para usuário ${userId}`);

    res.json({ ok: true, message: 'Histórico zerado com sucesso' });
  } catch (error) {
    console.error('[RESET] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Monitor Jurídico rodando em http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Interface: http://localhost:${PORT}/`);
});

export default app;