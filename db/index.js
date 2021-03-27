const pg = require("pg");
const { Client } = require("pg");
require("dotenv").config();

pg.defaults.ssl = true;
console.log("URL: ", process.env.DATABASE_URL);
console.log("SECRET", process.env.SECRET);
const client = new Client({
	ssl: true,
	// I don't have this psql db on this computer - Would need to set that up
	// connectionString:
	connectionString:
		process.env.DATABASE_URL || "postgres://localhost/expenses_db",
});

client.connect();

module.exports = client;
