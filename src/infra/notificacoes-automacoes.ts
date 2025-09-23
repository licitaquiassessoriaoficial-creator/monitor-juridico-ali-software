/**
 * Sistema de Notificações Automáticas - Monitor Jurídico
 * Configuração e envio de emails via Gmail SMTP
 */

import nodemailer from 'nodemailer';

// Interface para configuração de email
export interface EmailConfig {
  user: string;
  pass: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

// Configuração do Gmail SMTP
const gmailConfig: EmailConfig = {
  user: 'alisoftwarejuridico@gmail.com',
  pass: 'opqm nemr fobi nvjr', // Senha de app do Gmail
  host: 'smtp.gmail.com',
  port: 587,
  secure: false // TLS
};

// Criar transportador de email
function criarTransportador(config: EmailConfig = gmailConfig) {
  return nodemailer.createTransport({
    host: config.host || 'smtp.gmail.com',
    port: config.port || 587,
    secure: config.secure || false,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Função principal para envio de emails
export async function enviarEmail(
  destinatario: string,
  assunto: string,
  texto: string,
  html?: string
): Promise<boolean> {
  try {
    const transportador = criarTransportador();
    
    const opcoes = {
      from: `"Monitor Jurídico - Ali Software" <${gmailConfig.user}>`,
      to: destinatario,
      subject: assunto,
      text: texto,
      html: html || `<p>${texto}</p>`
    };

    const resultado = await transportador.sendMail(opcoes);
    console.log('✅ Email enviado com sucesso:', resultado.messageId);
    return true;
  } catch (erro) {
    console.error('❌ Erro ao enviar email:', erro);
    return false;
  }
}

// Função para notificar novo processo
export async function enviarNotificacaoProcesso(
  email: string,
  numeroProcesso: string,
  tribunal: string,
  movimentacao: string
): Promise<boolean> {
  const assunto = `🏛️ Nova movimentação - Processo ${numeroProcesso}`;
  
  const texto = `
Nova movimentação detectada no processo ${numeroProcesso}

Tribunal: ${tribunal}
Data: ${new Date().toLocaleString('pt-BR')}
Movimentação: ${movimentacao}

Para mais detalhes, acesse o Monitor Jurídico.

---
Ali Software Jurídico
Monitor Automatizado
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a365d; color: white; padding: 20px; text-align: center;">
        <h1>🏛️ Monitor Jurídico</h1>
        <p>Nova movimentação detectada</p>
      </div>
      
      <div style="padding: 20px; background: #f7fafc;">
        <h2 style="color: #1a365d;">Processo ${numeroProcesso}</h2>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <strong>Tribunal:</strong> ${tribunal}<br>
          <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}<br>
          <strong>Movimentação:</strong> ${movimentacao}
        </div>
        
        <p style="color: #666;">
          Para mais detalhes, acesse o Monitor Jurídico.
        </p>
      </div>
      
      <div style="background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        Ali Software Jurídico - Monitor Automatizado
      </div>
    </div>
  `;

  return await enviarEmail(email, assunto, texto, html);
}

// Função para delegar prazo
export async function delegarPrazo(
  emailDestino: string,
  numeroProcesso: string,
  prazo: string,
  responsavel: string
): Promise<boolean> {
  const assunto = `⏰ Delegação de Prazo - Processo ${numeroProcesso}`;
  
  const texto = `
Você recebeu uma delegação de prazo:

Processo: ${numeroProcesso}
Prazo: ${prazo}
Responsável: ${responsavel}
Data da delegação: ${new Date().toLocaleString('pt-BR')}

Favor verificar o Monitor Jurídico para mais detalhes.

---
Ali Software Jurídico
  `.trim();

  return await enviarEmail(emailDestino, assunto, texto);
}

// Função para testar configuração de email
export async function testarConfiguracaoEmail(): Promise<boolean> {
  console.log('🧪 Testando configuração de email...');
  
  const emailTeste = gmailConfig.user; // Enviar para si mesmo
  const assunto = '✅ Teste - Monitor Jurídico';
  const texto = `
Teste de configuração realizado em ${new Date().toLocaleString('pt-BR')}.

Se você recebeu este email, a configuração está funcionando corretamente!

Sistema: Monitor Jurídico - Ali Software
Configuração: Gmail SMTP
  `.trim();

  return await enviarEmail(emailTeste, assunto, texto);
}

// Exportar configuração para uso externo
export { gmailConfig };

// Função para executar teste se o arquivo for executado diretamente
if (process.argv[1]?.endsWith('notificacoes-automacoes.js')) {
  testarConfiguracaoEmail()
    .then(sucesso => {
      if (sucesso) {
        console.log('✅ Teste de email concluído com sucesso!');
      } else {
        console.log('❌ Falha no teste de email.');
      }
      process.exit(sucesso ? 0 : 1);
    })
    .catch(erro => {
      console.error('❌ Erro no teste:', erro);
      process.exit(1);
    });
}