const { Client } = require('pg');

const client = new Client({
  connectionString:
    process.env.DATABASEURL || 'postgres://localhost/expenses_db',
});

client.connect();

module.exports = client;
