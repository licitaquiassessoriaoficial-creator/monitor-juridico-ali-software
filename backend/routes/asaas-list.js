const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');

router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.findAll({ attributes: ['id', 'asaasPaymentId', 'status', 'value', 'dueDate', 'paymentDate', 'method'] });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({ attributes: ['id', 'asaasSubscriptionId', 'asaasCustomerId', 'plan', 'status', 'nextDueDate', 'lastPaymentStatus'] });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;