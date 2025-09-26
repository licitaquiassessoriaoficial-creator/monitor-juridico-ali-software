// routes/billing.js
const express = require('express');
const router = express.Router();
const asaas = require('../services/asaas.service');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

// Criar assinatura ASAAS
router.post('/subscribe', async (req, res) => {
  try {
    // Log do corpo recebido para debug
    const logReq = {
      type: 'requestBody',
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync(path.join(__dirname, '../billing-error.log'), JSON.stringify(logReq) + '\n');
    console.log('DEBUG /subscribe body:', req.body);

    const { userId, plan, customerData } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Cria cliente ASAAS se necessário
    let asaasCustomerId = user.asaasCustomerId;
    if (!asaasCustomerId) {
      try {
        const customer = await asaas.createCustomer(customerData);
        asaasCustomerId = customer.id;
        user.asaasCustomerId = asaasCustomerId;
        await user.save();
      } catch (asaasErr) {
        const logData = {
          type: 'createCustomer',
          error: asaasErr.response?.data || asaasErr.message,
          payload: customerData,
          timestamp: new Date().toISOString()
        };
        fs.appendFileSync(path.join(__dirname, '../billing-error.log'), JSON.stringify(logData) + '\n');
        console.error('Erro ao criar cliente ASAAS:', logData);
        return res.status(500).json({ error: 'Erro ao criar cliente ASAAS', details: asaasErr.response?.data || asaasErr.message });
      }
    }

    // Cria assinatura
    let subscription;
    try {
      subscription = await asaas.createSubscription({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: plan.value,
        cycle: 'MONTHLY',
        description: plan.name
      });
    } catch (asaasErr) {
      const logData = {
        type: 'createSubscription',
        error: asaasErr.response?.data || asaasErr.message,
        payload: {
          customer: asaasCustomerId,
          billingType: 'PIX',
          value: plan.value,
          cycle: 'MONTHLY',
          description: plan.name
        },
        timestamp: new Date().toISOString()
      };
      fs.appendFileSync(path.join(__dirname, '../billing-error.log'), JSON.stringify(logData) + '\n');
      console.error('Erro ao criar assinatura ASAAS:', logData);
      return res.status(500).json({ error: 'Erro ao criar assinatura ASAAS', details: asaasErr.response?.data || asaasErr.message });
    }

    // Salva no banco
    await Subscription.create({
      userId,
      asaasCustomerId,
      asaasSubscriptionId: subscription.id,
      plan: plan.name,
      status: subscription.status,
      nextDueDate: subscription.nextDueDate
    });

    res.json({ success: true, subscription });
  } catch (err) {
    console.error('Erro inesperado na rota /subscribe:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook ASAAS
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    await asaas.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultar status de pagamento
router.get('/payment/:id', async (req, res) => {
  try {
    const payment = await asaas.getPaymentStatus(req.params.id);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
