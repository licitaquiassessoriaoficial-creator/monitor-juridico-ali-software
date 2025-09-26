// models/Payment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  asaasPaymentId: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  paymentDate: { type: DataTypes.DATE, allowNull: true },
  method: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true
});

module.exports = Payment;
