const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function seedAdminUser() {
  const email = 'alisoftwarejuridico@gmail.com';
  const password = '23092019';
  const hash = await bcrypt.hash(password, 12);
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email,
      password: hash,
      name: 'Admin Global',
      role: 'admin',
      isActive: true
    });
    console.log('Usuário admin criado:', email);
  } else {
    await user.update({ password: hash, role: 'admin', isActive: true });
    console.log('Usuário admin atualizado:', email);
  }
}

seedAdminUser().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });