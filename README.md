# Ali Software Jurídico - Sistema Completo

## 🎯 Visão Geral

O Ali Software Jurídico é um sistema completo de gestão jurídica que combina tecnologia avançada com facilidade de uso. O sistema oferece gerenciamento de processos, clientes, tarefas, financeiro e um sistema completo de notificações automáticas por email.

## ✅ Status do Projeto

### Sistema 100% Funcional e Pronto para Uso

### Funcionalidades Implementadas

- ✅ **Backend Completo**: Node.js + Express + SQLite
- ✅ **Autenticação JWT**: Login, registro e recuperação de senha
- ✅ **APIs REST Completas**: CRUD para todas as entidades
- ✅ **Sistema de Email**: Gmail SMTP com templates e notificações automáticas
- ✅ **Dashboard Funcional**: Dados reais, estatísticas e alertas
- ✅ **Frontend Integrado**: Formulários conectados ao backend
- ✅ **Segurança**: Middleware de segurança, rate limiting, CORS

## 🚀 Como Executar

### Pré-requisitos

- Node.js 16+ instalado
- Conta Gmail com senha de app configurada

### Instalação

1. **Instale as dependências do backend:**

```bash
cd backend
npm install
```

1. **Configure as variáveis de ambiente:**

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

1. **Inicie o servidor:**

```bash
node server.js
```

1. **Acesse o sistema:**

- **Frontend**: <http://localhost:3001>
- **Dashboard**: <http://localhost:3001/pages/dashboard.html>
- **API**: <http://localhost:3001/api>
- **Health Check**: <http://localhost:3001/health>

## 📊 APIs Disponíveis

### Autenticação

- `POST /api/auth/login` - Login do usuário
- `POST /api/auth/register` - Registro de novo usuário
- `POST /api/auth/forgot-password` - Recuperação de senha

### Dashboard

- `GET /api/dashboard` - Dados completos do dashboard
- `GET /api/dashboard/alertas` - Alertas e notificações
- `GET /api/dashboard/agenda` - Agenda do dia

### Entidades Principais

- `GET|POST|PUT|DELETE /api/clientes` - Gestão de clientes
- `GET|POST|PUT|DELETE /api/processos` - Gestão de processos
- `GET|POST|PUT|DELETE /api/tarefas` - Gestão de tarefas
- `GET|POST|PUT|DELETE /api/financeiro` - Gestão financeira

## 📧 Sistema de Email

### Configuração Gmail

```env
GMAIL_USER=alisoftwarejuridico@gmail.com
GMAIL_PASS=opqm nemr fobi nvjr
EMAIL_FROM_NAME=Ali Software Jurídico
EMAIL_SUPPORT=alisoftwarejuridico@gmail.com
```

### Templates Disponíveis

- **Boas-vindas**: Email para novos usuários
- **Lembrete de tarefa**: Notificação de tarefas vencendo
- **Recuperação de senha**: Reset de senha via email
- **Conta vencida**: Alerta de pagamentos em atraso

### Agendamentos Automáticos

- **9h diariamente**: Verifica tarefas vencendo hoje
- **8h diariamente**: Verifica contas vencidas
- **0h diariamente**: Reset de flags de lembretes

## � Deploy

### Backend no Railway

1. **Configurações do serviço no Railway:**
   - Source → Add Root Directory: `backend/`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Networking → Generate Domain (copiar a URL pública)

2. **Variáveis de ambiente (Railway → Variables → Raw Editor):**

   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_PATH=/app/database/ali_software.db
   JWT_SECRET=sua_chave_jwt_secreta_32bytes
   JWT_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=alisoftwarejuridico@gmail.com
   EMAIL_PASS=opqm nemr fobi nvjr
   GMAIL_USER=alisoftwarejuridico@gmail.com
   GMAIL_PASS=opqm nemr fobi nvjr
   ASAAS_API_URL=https://sandbox.asaas.com/api/v3
   ASAAS_API_KEY=sua-chave-sandbox-asaas
   FRONTEND_URL=https://seu-site.netlify.app
   BACKEND_URL=https://SEU-DOMINIO-RAILWAY.up.railway.app
   ```

3. **Persistência SQLite (recomendado):**
   - Storage → Add Volume
     - Name: `ali-sqlite`
     - Mount Path: `/app/database`

4. **Healthcheck:**
   - Deploy → Healthcheck Path: `/api/hello`

5. **Teste:**

   ```bash
   GET https://SEU-DOMINIO-RAILWAY.up.railway.app/api/hello
   Resposta: {"ok": true, "message": "Ali Software Jurídico Backend - Running!"}
   ```

### Frontend no Netlify

1. **Configuração do build:**
   - Build command: `npm run build` (se aplicável)
   - Publish directory: `public/` ou `dist/`

2. **Ajuste de configuração:**
   - Editar `frontend/config.js` com a URL do Railway
   - Substituir `fetch("/api/...")` por `fetch("${API_URL}/...")`

## �🔧 Tecnologias Utilizadas

- **Backend**: Node.js, Express, SQLite
- **Autenticação**: JWT
- **Email**: Nodemailer + Gmail SMTP
- **Validação**: Express Validator
- **Segurança**: Helmet, CORS, Rate Limiting
- **Agendamento**: Node-cron
- **Frontend**: HTML5, CSS3, JavaScript

## 📞 Contato

- WhatsApp: +55 19 99182-1389
- Email: <alisoftwarejuridico@gmail.com>

---

© 2025 Ali Software Jurídico. Todos os direitos reservados.
