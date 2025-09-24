const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tarefa = sequelize.define('Tarefa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Título é obrigatório' },
      len: { args: [3, 200], msg: 'Título deve ter entre 3 e 200 caracteres' }
    }
  },
  descricao: {
    type: DataTypes.TEXT
  },
  tipo: {
    type: DataTypes.ENUM('prazo', 'reuniao', 'ligacao', 'email', 'documento', 'audiencia', 'outro'),
    defaultValue: 'outro'
  },
  prioridade: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'urgente'),
    defaultValue: 'media'
  },
  status: {
    type: DataTypes.ENUM('pendente', 'em_andamento', 'concluida', 'cancelada', 'adiada'),
    defaultValue: 'pendente'
  },
  dataVencimento: {
    type: DataTypes.DATE
  },
  dataInicio: {
    type: DataTypes.DATE
  },
  dataConclusao: {
    type: DataTypes.DATE
  },
  tempoEstimado: {
    type: DataTypes.INTEGER, // em minutos
    defaultValue: 60
  },
  tempoGasto: {
    type: DataTypes.INTEGER, // em minutos
    defaultValue: 0
  },
  lembrete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tempoLembrete: {
    type: DataTypes.INTEGER, // minutos antes do vencimento
    defaultValue: 60
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  // Referências
  processoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Processos',
      key: 'id'
    }
  },
  clienteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clientes',
      key: 'id'
    }
  },
  responsavelId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  lembreteEnviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  indexes: [
    { fields: ['dataVencimento'] },
    { fields: ['status'] },
    { fields: ['prioridade'] },
    { fields: ['responsavelId'] },
    { fields: ['userId'] },
    { fields: ['processoId'] },
    { fields: ['clienteId'] }
  ]
});

// Métodos de instância
Tarefa.prototype.isVencida = function() {
  if (!this.dataVencimento) return false;
  return new Date() > new Date(this.dataVencimento) && this.status !== 'concluida';
};

Tarefa.prototype.isVenceHoje = function() {
  if (!this.dataVencimento) return false;
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  return hoje.toDateString() === vencimento.toDateString() && this.status !== 'concluida';
};

Tarefa.prototype.getDiasRestantes = function() {
  if (!this.dataVencimento) return null;
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  const diffTime = vencimento - hoje;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Tarefa.prototype.marcarConcluida = function() {
  this.status = 'concluida';
  this.dataConclusao = new Date();
  return this.save();
};

Tarefa.prototype.calcularProgresso = function() {
  if (this.status === 'concluida') return 100;
  if (this.status === 'cancelada') return 0;
  if (this.status === 'em_andamento') return 50;
  return 0;
};

// Métodos de classe
Tarefa.findVencendoHoje = function(userId) {
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  
  return this.findAll({
    where: {
      userId,
      dataVencimento: {
        [sequelize.Sequelize.Op.between]: [inicioDia, fimDia]
      },
      status: {
        [sequelize.Sequelize.Op.not]: 'concluida'
      }
    },
    order: [['dataVencimento', 'ASC']]
  });
};

Tarefa.findVencidas = function(userId) {
  const hoje = new Date();
  
  return this.findAll({
    where: {
      userId,
      dataVencimento: {
        [sequelize.Sequelize.Op.lt]: hoje
      },
      status: {
        [sequelize.Sequelize.Op.not]: 'concluida'
      }
    },
    order: [['dataVencimento', 'ASC']]
  });
};

Tarefa.findByStatus = function(status, userId) {
  return this.findAll({
    where: { status, userId },
    order: [['dataVencimento', 'ASC']]
  });
};

module.exports = Tarefa;