const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Financeiro = sequelize.define('Financeiro', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tipo: {
    type: DataTypes.ENUM('receita', 'despesa'),
    allowNull: false
  },
  categoria: {
    type: DataTypes.ENUM(
      'honorarios', 'sucumbencia', 'reembolso', 'mensalidade', 'entrada',
      'aluguel', 'salario', 'despesas_operacionais', 'marketing', 'tecnologia', 'outros'
    ),
    allowNull: false
  },
  descricao: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Descrição é obrigatória' }
    }
  },
  valor: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: { args: [0.01], msg: 'Valor deve ser maior que zero' }
    }
  },
  dataVencimento: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dataPagamento: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'parcial'),
    defaultValue: 'pendente'
  },
  formaPagamento: {
    type: DataTypes.ENUM('dinheiro', 'pix', 'boleto', 'cartao_credito', 'cartao_debito', 'transferencia', 'cheque'),
    allowNull: true
  },
  numeroDocumento: {
    type: DataTypes.STRING(100)
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  recorrente: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tipoRecorrencia: {
    type: DataTypes.ENUM('mensal', 'bimestral', 'trimestral', 'semestral', 'anual'),
    allowNull: true
  },
  proximaCobranca: {
    type: DataTypes.DATE
  },
  // Integração com PIX/Boleto
  codigoBarras: {
    type: DataTypes.TEXT
  },
  qrCodePix: {
    type: DataTypes.TEXT
  },
  chavePix: {
    type: DataTypes.STRING(100)
  },
  idIntegracao: {
    type: DataTypes.STRING(100) // ID da transação na Asaas/Gerencianet
  },
  linkPagamento: {
    type: DataTypes.TEXT
  },
  // Referências
  clienteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clientes',
      key: 'id'
    }
  },
  processoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Processos',
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
  }
}, {
  indexes: [
    { fields: ['tipo'] },
    { fields: ['status'] },
    { fields: ['dataVencimento'] },
    { fields: ['dataPagamento'] },
    { fields: ['clienteId'] },
    { fields: ['processoId'] },
    { fields: ['userId'] },
    { fields: ['idIntegracao'] }
  ]
});

// Métodos de instância
Financeiro.prototype.isVencido = function() {
  if (this.status === 'pago' || this.status === 'cancelado') return false;
  return new Date() > new Date(this.dataVencimento);
};

Financeiro.prototype.isVenceHoje = function() {
  if (this.status === 'pago' || this.status === 'cancelado') return false;
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  return hoje.toDateString() === vencimento.toDateString();
};

Financeiro.prototype.getDiasAtraso = function() {
  if (!this.isVencido()) return 0;
  const hoje = new Date();
  const vencimento = new Date(this.dataVencimento);
  const diffTime = hoje - vencimento;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Financeiro.prototype.marcarPago = function(formaPagamento, observacoes) {
  this.status = 'pago';
  this.dataPagamento = new Date();
  if (formaPagamento) this.formaPagamento = formaPagamento;
  if (observacoes) this.observacoes = observacoes;
  return this.save();
};

Financeiro.prototype.gerarProximaCobranca = function() {
  if (!this.recorrente || !this.tipoRecorrencia) return null;
  
  const baseDate = this.proximaCobranca || this.dataVencimento;
  const proximaData = new Date(baseDate);
  
  switch (this.tipoRecorrencia) {
    case 'mensal':
      proximaData.setMonth(proximaData.getMonth() + 1);
      break;
    case 'bimestral':
      proximaData.setMonth(proximaData.getMonth() + 2);
      break;
    case 'trimestral':
      proximaData.setMonth(proximaData.getMonth() + 3);
      break;
    case 'semestral':
      proximaData.setMonth(proximaData.getMonth() + 6);
      break;
    case 'anual':
      proximaData.setFullYear(proximaData.getFullYear() + 1);
      break;
  }
  
  return proximaData;
};

// Métodos de classe
Financeiro.calcularReceitas = function(userId, dataInicio, dataFim) {
  const whereClause = {
    userId,
    tipo: 'receita',
    status: 'pago'
  };
  
  if (dataInicio && dataFim) {
    whereClause.dataPagamento = {
      [sequelize.Sequelize.Op.between]: [dataInicio, dataFim]
    };
  }
  
  return this.sum('valor', { where: whereClause });
};

Financeiro.calcularDespesas = function(userId, dataInicio, dataFim) {
  const whereClause = {
    userId,
    tipo: 'despesa',
    status: 'pago'
  };
  
  if (dataInicio && dataFim) {
    whereClause.dataPagamento = {
      [sequelize.Sequelize.Op.between]: [dataInicio, dataFim]
    };
  }
  
  return this.sum('valor', { where: whereClause });
};

Financeiro.findVencendoHoje = function(userId) {
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
        [sequelize.Sequelize.Op.not]: 'pago'
      }
    },
    order: [['dataVencimento', 'ASC']]
  });
};

Financeiro.findVencidos = function(userId) {
  const hoje = new Date();
  
  return this.findAll({
    where: {
      userId,
      dataVencimento: {
        [sequelize.Sequelize.Op.lt]: hoje
      },
      status: {
        [sequelize.Sequelize.Op.notIn]: ['pago', 'cancelado']
      }
    },
    order: [['dataVencimento', 'ASC']]
  });
};

module.exports = Financeiro;