const sequelize = require('../config/database');

// Importar modelos
const User = require('./User');
const Cliente = require('./Cliente');
const Processo = require('./Processo');
const Tarefa = require('./Tarefa');
const Financeiro = require('./Financeiro');

// Definir associações

// User associations
User.hasMany(Cliente, { foreignKey: 'userId', as: 'clientes' });
User.hasMany(Processo, { foreignKey: 'userId', as: 'processos' });
User.hasMany(Tarefa, { foreignKey: 'userId', as: 'tarefas' });
User.hasMany(Tarefa, { foreignKey: 'responsavelId', as: 'tarefasResponsavel' });
User.hasMany(Financeiro, { foreignKey: 'userId', as: 'financeiro' });

// Cliente associations
Cliente.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
Cliente.hasMany(Processo, { foreignKey: 'clienteId', as: 'processos' });
Cliente.hasMany(Tarefa, { foreignKey: 'clienteId', as: 'tarefas' });
Cliente.hasMany(Financeiro, { foreignKey: 'clienteId', as: 'financeiro' });

// Processo associations
Processo.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
Processo.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Processo.hasMany(Tarefa, { foreignKey: 'processoId', as: 'tarefas' });
Processo.hasMany(Financeiro, { foreignKey: 'processoId', as: 'financeiro' });

// Tarefa associations
Tarefa.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
Tarefa.belongsTo(User, { foreignKey: 'responsavelId', as: 'responsavel' });
Tarefa.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Tarefa.belongsTo(Processo, { foreignKey: 'processoId', as: 'processo' });

// Financeiro associations
Financeiro.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
Financeiro.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Financeiro.belongsTo(Processo, { foreignKey: 'processoId', as: 'processo' });

// Modelo adicional para Andamentos (histórico de movimentações dos processos)
const Andamento = sequelize.define('Andamento', {
  id: {
    type: sequelize.Sequelize.DataTypes.UUID,
    defaultValue: sequelize.Sequelize.DataTypes.UUIDV4,
    primaryKey: true
  },
  data: {
    type: sequelize.Sequelize.DataTypes.DATE,
    allowNull: false
  },
  descricao: {
    type: sequelize.Sequelize.DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: sequelize.Sequelize.DataTypes.ENUM('decisao', 'despacho', 'sentenca', 'acordao', 'peticao', 'outro'),
    defaultValue: 'outro'
  },
  fonte: {
    type: sequelize.Sequelize.DataTypes.ENUM('manual', 'automatico', 'importacao'),
    defaultValue: 'manual'
  },
  processoId: {
    type: sequelize.Sequelize.DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Processos',
      key: 'id'
    }
  }
}, {
  indexes: [
    { fields: ['processoId'] },
    { fields: ['data'] },
    { fields: ['tipo'] }
  ]
});

// Associações do Andamento
Andamento.belongsTo(Processo, { foreignKey: 'processoId', as: 'processo' });
Processo.hasMany(Andamento, { foreignKey: 'processoId', as: 'andamentos' });

// Modelo para Log de atividades do sistema
const LogAtividade = sequelize.define('LogAtividade', {
  id: {
    type: sequelize.Sequelize.DataTypes.UUID,
    defaultValue: sequelize.Sequelize.DataTypes.UUIDV4,
    primaryKey: true
  },
  acao: {
    type: sequelize.Sequelize.DataTypes.STRING(100),
    allowNull: false
  },
  entidade: {
    type: sequelize.Sequelize.DataTypes.STRING(50),
    allowNull: false
  },
  entidadeId: {
    type: sequelize.Sequelize.DataTypes.UUID
  },
  detalhes: {
    type: sequelize.Sequelize.DataTypes.JSON
  },
  ip: {
    type: sequelize.Sequelize.DataTypes.STRING(45)
  },
  userAgent: {
    type: sequelize.Sequelize.DataTypes.TEXT
  },
  userId: {
    type: sequelize.Sequelize.DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['acao'] },
    { fields: ['entidade'] },
    { fields: ['createdAt'] }
  ]
});

// Associações do Log
LogAtividade.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
User.hasMany(LogAtividade, { foreignKey: 'userId', as: 'logs' });

module.exports = {
  sequelize,
  User,
  Cliente,
  Processo,
  Tarefa,
  Financeiro,
  Andamento,
  LogAtividade
};