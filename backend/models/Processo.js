const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Processo = sequelize.define('Processo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numero: {
    type: DataTypes.STRING(25),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Número do processo é obrigatório' },
      is: { 
        args: /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/,
        msg: 'Número deve seguir o formato padrão CNJ'
      }
    }
  },
  tribunal: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Tribunal é obrigatório' },
      isIn: { 
        args: [['TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 'TJGO', 'TJPE', 'TJCE', 'TJBA', 'TJDF', 'STF', 'STJ', 'TST', 'TSE']],
        msg: 'Tribunal deve ser válido'
      }
    }
  },
  vara: {
    type: DataTypes.STRING(100)
  },
  assunto: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Assunto é obrigatório' }
    }
  },
  valorCausa: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('ativo', 'suspenso', 'arquivado', 'julgado', 'transitado'),
    defaultValue: 'ativo'
  },
  instancia: {
    type: DataTypes.ENUM('primeira', 'segunda', 'terceira', 'especial', 'extraordinaria'),
    defaultValue: 'primeira'
  },
  natureza: {
    type: DataTypes.ENUM('conhecimento', 'execucao', 'cautelar', 'monitoria', 'especial'),
    defaultValue: 'conhecimento'
  },
  polo: {
    type: DataTypes.ENUM('ativo', 'passivo', 'interessado'),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Polo é obrigatório' }
    }
  },
  parteContraria: {
    type: DataTypes.STRING(200)
  },
  advogadoContrario: {
    type: DataTypes.STRING(200)
  },
  dataDistribuicao: {
    type: DataTypes.DATE
  },
  dataUltimoAndamento: {
    type: DataTypes.DATE
  },
  ultimoAndamento: {
    type: DataTypes.TEXT
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  monitoramento: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Referências
  clienteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Clientes',
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
    { fields: ['numero'] },
    { fields: ['tribunal'] },
    { fields: ['status'] },
    { fields: ['clienteId'] },
    { fields: ['userId'] },
    { fields: ['dataDistribuicao'] },
    { fields: ['dataUltimoAndamento'] }
  ]
});

// Métodos de instância
Processo.prototype.formatNumero = function() {
  return this.numero;
};

Processo.prototype.getDaysWithoutMovement = function() {
  if (!this.dataUltimoAndamento) return null;
  const now = new Date();
  const lastMovement = new Date(this.dataUltimoAndamento);
  const diffTime = Math.abs(now - lastMovement);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Processo.prototype.getAndamentosCount = async function() {
  const { Andamento } = require('./index');
  return Andamento.count({ where: { processoId: this.id } });
};

// Métodos de classe
Processo.findByNumero = function(numero) {
  const cleanNumber = numero.replace(/\D/g, '');
  const formattedNumber = cleanNumber.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
  return this.findOne({ where: { numero: formattedNumber } });
};

Processo.findActiveProcesses = function(userId) {
  return this.findAll({ 
    where: { 
      status: 'ativo',
      userId 
    },
    order: [['dataUltimoAndamento', 'DESC']]
  });
};

Processo.findByTribunal = function(tribunal, userId) {
  return this.findAll({ 
    where: { 
      tribunal,
      userId 
    },
    order: [['dataDistribuicao', 'DESC']]
  });
};

module.exports = Processo;