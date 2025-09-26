const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function seedAdminUser() {
  const email = 'alisoftwarejuridico@gmail.com';
  const senha = '23092019';
  const hash = await bcrypt.hash(senha, 10);
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email,
      senha: hash,
      nome: 'Admin Global',
      role: 'admin',
      isAdmin: true
    });
    console.log('Usuário admin criado:', email);
  } else {
    await user.update({ senha: hash, role: 'admin', isAdmin: true });
    console.log('Usuário admin atualizado:', email);
  }
}

seedAdminUser().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });