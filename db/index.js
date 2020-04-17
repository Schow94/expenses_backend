const { Client } = require('pg');

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || 'postgres://localhost/expenses_db',
});

client.connect();

module.exports = client;
