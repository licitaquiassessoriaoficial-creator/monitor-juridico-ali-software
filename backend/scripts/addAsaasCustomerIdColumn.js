const sqlite3 = require('sqlite3').verbose();
const dbPath = __dirname + '/../database/ali_software.db';

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('ALTER TABLE User ADD COLUMN asaasCustomerId TEXT', (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Coluna asaasCustomerId já existe.');
      } else {
        console.error('Erro ao adicionar coluna:', err.message);
      }
    } else {
      console.log('Coluna asaasCustomerId adicionada com sucesso!');
    }
    db.close();
  });
});
