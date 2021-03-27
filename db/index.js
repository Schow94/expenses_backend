// const pg = require("pg");
const { Client } = require("pg");
require("dotenv").config();

// pg.defaults.ssl = true;
console.log("URL: ", process.env.DATABASE_URL);
console.log("SECRET", process.env.SECRET);
const client = new Client({
	ssl: { rejectUnauthorized: false },
	// I don't have this psql db on this computer - Would need to set that up
	// connectionString:
	// 	"postgres://zzeksrgsrlvlen:c5ca174b5930c5a57d797050b00028cb94d187e78a9ffb2a51f22d5aa2d50cf7@ec2-3-211-48-92.compute-1.amazonaws.com:5432/dce5qveo956pt4",
	// connectionString:
	// 	process.env.DATABASE_URL || "postgres://localhost/expenses_db",
	connectionString: process.env.DATABASE_URL,
});

client.connect();

module.exports = client;
