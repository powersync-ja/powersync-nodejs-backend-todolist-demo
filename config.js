import 'dotenv/config';

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 6060,
  database: {
    uri: process.env.MONGO_URI
  },
  powersync: {
    url: process.env.POWERSYNC_URL,
    publicKey: process.env.POWERSYNC_PUBLIC_KEY,
    privateKey: process.env.POWERSYNC_PRIVATE_KEY,
    jwtIssuer: process.env.JWT_ISSUER
  }
};

export default config;
