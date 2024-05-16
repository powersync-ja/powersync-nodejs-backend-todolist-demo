import 'dotenv/config';

const config = {
  port: 6000,
  database: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    name: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD
  },
  powersync: {
    url: process.env.POWERSYNC_URL,
    publicKey: process.env.POWERSYNC_PUBLIC_KEY,
    privateKey: process.env.POWERSYNC_PRIVATE_KEY,
    jwtIssuer: process.env.JWT_ISSUER
  }
};

export default config;
