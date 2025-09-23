export async function sendEmail(userId: string, evento: any): Promise<void> {
  // TODO: integrar SMTP (SendGrid, Mailgun, AWS SES, etc.)
  console.log("[EMAIL] 📧", {
    userId,
    fonte: evento.fonte,
    processo: evento.processo,
    movimento: evento.movimento,
    timestamp: new Date().toISOString()
  });
}

export async function sendWhats(userId: string, evento: any): Promise<void> {
  // TODO: integrar WhatsApp Business API (Meta, Twilio, etc.)
  console.log("[WHATSAPP] 📱", {
    userId,
    fonte: evento.fonte,
    processo: evento.processo,
    movimento: evento.movimento,
    timestamp: new Date().toISOString()
  });
}