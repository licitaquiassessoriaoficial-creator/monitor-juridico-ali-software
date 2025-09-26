const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nome é obrigatório' },
      len: { args: [2, 100], msg: 'Nome deve ter entre 2 e 100 caracteres' }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Email é obrigatório' },
      isEmail: { msg: 'Email deve ter formato válido' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Senha é obrigatória' },
      len: { args: [6, 100], msg: 'Senha deve ter pelo menos 6 caracteres' }
    }
  },
  phone: {
    type: DataTypes.STRING,
    validate: {
      is: { 
        args: /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/,
        msg: 'Telefone deve ter formato válido'
      }
    }
  },
  oab: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'OAB é obrigatória' },
      is: {
        args: /^(\d{4,6})-?([A-Z]{2})$/,
        msg: 'OAB deve ter 4-6 dígitos seguidos de UF, ex: 123456-SP'
      },
      len: { args: [5, 20], msg: 'OAB deve ter entre 5 e 20 caracteres' }
    }
  },
  uf: {
    type: DataTypes.STRING(2),
    validate: {
      len: { args: [0, 2], msg: 'UF deve ter 2 caracteres' }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'advogado', 'secretario', 'cliente'),
    defaultValue: 'advogado',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastLoginAt: {
    type: DataTypes.DATE
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
  },
  planType: {
    type: DataTypes.ENUM('trial', 'basic', 'professional', 'enterprise'),
    defaultValue: 'trial'
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  asaasCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do cliente na plataforma ASAAS'
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Métodos de instância
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

User.prototype.isTrialExpired = function() {
  return this.trialEndsAt && new Date() > this.trialEndsAt;
};

// Métodos de classe
User.findByEmail = function(email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findActiveUsers = function() {
  return this.findAll({ where: { isActive: true } });
};

module.exports = User;