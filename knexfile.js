// Update with your config settings.
const dotenv = require("dotenv");

// setup env
const dotEnvConfigs = {
  production: ".env",
  development: ".env.dev",
  stage: ".env.stage",
};
const dotenvConfigPath = dotEnvConfigs[process.env.NODE_ENV || "development"];
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

  stage: {
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
