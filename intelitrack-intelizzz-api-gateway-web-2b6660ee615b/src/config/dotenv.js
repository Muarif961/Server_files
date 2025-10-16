const path = require('path');
const Dotenv = require('dotenv');

const environment = process.env.NODE_ENV ? '.' + process.env.NODE_ENV : '';
const envPath = path.join(__dirname, `../../.env${environment}`);

Dotenv.config({ path: envPath });

module.exports = Dotenv;