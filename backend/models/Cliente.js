const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nome é obrigatório' },
      len: { args: [2, 200], msg: 'Nome deve ter entre 2 e 200 caracteres' }
    }
  },
  tipo: {
    type: DataTypes.ENUM('pessoa_fisica', 'pessoa_juridica'),
    allowNull: false,
    defaultValue: 'pessoa_fisica'
  },
  cpfCnpj: {
    type: DataTypes.STRING(18),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'CPF/CNPJ é obrigatório' }
    }
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: { msg: 'Email deve ter formato válido' }
    }
  },
  telefone: {
    type: DataTypes.STRING,
    validate: {
      is: { 
        args: /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/,
        msg: 'Telefone deve ter formato válido'
      }
    }
  },
  whatsapp: {
    type: DataTypes.STRING,
    validate: {
      is: { 
        args: /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/,
        msg: 'WhatsApp deve ter formato válido'
      }
    }
  },
  endereco: {
    type: DataTypes.TEXT
  },
  cep: {
    type: DataTypes.STRING(10),
    validate: {
      is: { 
        args: /^\d{5}-?\d{3}$/,
        msg: 'CEP deve ter formato válido'
      }
    }
  },
  cidade: {
    type: DataTypes.STRING(100)
  },
  uf: {
    type: DataTypes.STRING(2),
    validate: {
      len: { args: [2, 2], msg: 'UF deve ter 2 caracteres' }
    }
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('ativo', 'inativo', 'prospecto'),
    defaultValue: 'prospecto'
  },
  dataInicioContrato: {
    type: DataTypes.DATE
  },
  valorMensalidade: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Referência ao usuário responsável
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
    { fields: ['cpfCnpj'] },
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['userId'] }
  ]
});

// Métodos de instância
Cliente.prototype.getProcessosCount = async function() {
  const { Processo } = require('./index');
  return Processo.count({ where: { clienteId: this.id } });
};

Cliente.prototype.formatCpfCnpj = function() {
  const doc = this.cpfCnpj.replace(/\D/g, '');
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return this.cpfCnpj;
};

// Métodos de classe
Cliente.findByDocument = function(cpfCnpj) {
  const cleanDoc = cpfCnpj.replace(/\D/g, '');
  return this.findOne({ where: { cpfCnpj: cleanDoc } });
};

Cliente.findActiveClients = function(userId) {
  return this.findAll({ 
    where: { 
      status: 'ativo',
      userId 
    },
    order: [['nome', 'ASC']]
  });
};

module.exports = Cliente;