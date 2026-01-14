import express from 'express';
import { SignJWT, importJWK } from 'jose';
import config from '../../config.js';
import { generateKeyPair } from '../utils/generate-key.js';
const router = express.Router();

/**
 * Imported Jose keys
 */
const keys = {
  privateKey: null,
  publicKey: null
};

/**
 * Generates a key pair if none is available on the ENV
 */
async function ensureKeys() {
  // Keys are loaded already
  if (keys.privateKey) {
    return;
  }

  const { powersync } = config;
  const base64Keys = {
    private: powersync.privateKey,
    public: powersync.publicKey
  };

  if (!base64Keys.private) {
    // Key is not present in ENV
    console.warn(
      `Private key has not been supplied in process.env.POWERSYNC_PRIVATE_KEY. A temporary key pair will be generated.`
    );
    const generated = await generateKeyPair();
    base64Keys.private = generated.privateBase64;
    base64Keys.public = generated.publicBase64;
  }

  const decodedPrivateKey = Buffer.from(base64Keys.private, 'base64');
  const powerSyncPrivateKey = JSON.parse(new TextDecoder().decode(decodedPrivateKey));
  keys.privateKey = {
    alg: powerSyncPrivateKey.alg,
    kid: powerSyncPrivateKey.kid,
    key: await importJWK(powerSyncPrivateKey)
  };

  const decodedPublicKey = Buffer.from(base64Keys.public, 'base64');
  keys.publicKey = JSON.parse(new TextDecoder().decode(decodedPublicKey));
}

/**
 * Get the JWT token that PowerSync will use to authenticate the user
 * Provide an optional user_id in the url params query string to use as the subject of the token
 * If no id is provided, "UserID" is used as the subject
 */
router.get('/token', async (req, res) => {
  const { user_id = 'UserID ' } = req.query;
  
  const token = await generateToken(user_id, {});
  res.send({
    token: token,
    powersync_url: config.powersync.url
  });
});

/**
 * Get the JWT token that PowerSync will use to authenticate the user
 * Provide a payload in the body of the request as a JSON object to set custom claims in the JWT
 * If no payload is provided, an empty object is used as the claims payload
 */
router.post('/token', async (req, res) => {
  const { user_id = 'UserID ' } = req.query;
  const payload = req.body || {};

  const token = await generateToken(user_id, payload);
  res.send({
    token: token,
    powersync_url: config.powersync.url
  });
});

/**
 * This is the JWKS endpoint PowerSync uses to handle authentication
 */
router.get('/keys', async (req, res) => {
  await ensureKeys();
  const powerSyncPublicKey = keys.publicKey;
  res.send({
    keys: [powerSyncPublicKey]
  });
});

export { router as authRouter };

/**
 * Generates a JWT token for the given user_id and payload
 * @param {string} user_id - The subject of the JWT
 * @param {Object} payload - The payload of the JWT
 * @returns {Promise<string>} The generated JWT token
 */
const generateToken = async (user_id, payload) => {
  await ensureKeys();
  const powerSyncKey = keys.privateKey;
  const token = await new SignJWT(payload)
    .setProtectedHeader({
      alg: powerSyncKey.alg,
      kid: powerSyncKey.kid
    })
    .setSubject(user_id)
    .setIssuedAt()
    .setIssuer(config.powersync.jwtIssuer)
    .setAudience(config.powersync.url)
    .setExpirationTime('5m')
    .sign(powerSyncKey.key);

  return token;
};