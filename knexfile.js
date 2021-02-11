// Update with your config settings.
const dotenv = require("dotenv");

// setup env
const isProd = process.env.NODE_ENV === "production";
const dotenvConfigPath = isProd ? ".env" : ".env.dev";
dotenv.config({ path: dotenvConfigPath });

module.exports = {
  development: {
    client: "pg",
    connection: {
      port: process.env.DBPORT,
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "migrations",
    },
  },

  production: {
    client: "pg",
    connection: {
      port: process.env.DBPORT,
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "migrations",
    },
  },
};
