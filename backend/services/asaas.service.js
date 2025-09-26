// services/asaas.service.js
// Integração com API ASAAS para cobranças, assinaturas e webhooks
const axios = require('axios');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

if (!ASAAS_API_KEY) {
  throw new Error('ASAAS_API_KEY não definida nas variáveis de ambiente');
}

const asaasClient = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  }
});

module.exports = {
  async createCustomer(data) {
    const res = await asaasClient.post('/customers', data);
    return res.data;
  },
  async createSubscription(data) {
    const res = await asaasClient.post('/subscriptions', data);
    return res.data;
  },
  async createPayment(data) {
    const res = await asaasClient.post('/payments', data);
    return res.data;
  },
  async getPaymentStatus(paymentId) {
    const res = await asaasClient.get(`/payments/${paymentId}`);
    return res.data;
  },
  async handleWebhook(payload) {
    // Integração real: atualiza status de assinatura/pagamento no banco
    const { event, payment, subscription } = payload;
    const { Subscription, Payment } = require('../models');

    if (event === 'PAYMENT_RECEIVED' && payment) {
      // Atualiza status do pagamento
      await Payment.update(
        {
          status: payment.status,
          paymentDate: payment.paymentDate || new Date(),
          method: payment.billingType
        },
        { where: { asaasPaymentId: payment.id } }
      );
      // Atualiza status da assinatura vinculada, se houver
      if (payment.subscription) {
        await Subscription.update(
          {
            status: 'active',
            lastPaymentStatus: payment.status,
            nextDueDate: payment.nextDueDate
          },
          { where: { asaasSubscriptionId: payment.subscription } }
        );
      }
    }
    if (event === 'SUBSCRIPTION_ACTIVATED' && subscription) {
      await Subscription.update(
        {
          status: 'active',
          nextDueDate: subscription.nextDueDate
        },
        { where: { asaasSubscriptionId: subscription.id } }
      );
    }
    if (event === 'SUBSCRIPTION_CANCELED' && subscription) {
      await Subscription.update(
        {
          status: 'canceled'
        },
        { where: { asaasSubscriptionId: subscription.id } }
      );
    }
    // Outros eventos podem ser tratados aqui
    return payload;
  }
};
