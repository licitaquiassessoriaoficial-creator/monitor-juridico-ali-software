const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LogAtividade = sequelize.define('LogAtividade', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  entidade: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entidadeId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  acao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  detalhes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'log_atividades',
  timestamps: false
});

module.exports = LogAtividade;
