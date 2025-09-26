// models/Subscription.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  asaasCustomerId: { type: DataTypes.STRING, allowNull: false },
  asaasSubscriptionId: { type: DataTypes.STRING, allowNull: false },
  plan: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  nextDueDate: { type: DataTypes.DATE, allowNull: true },
  lastPaymentStatus: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true
});

module.exports = Subscription;
