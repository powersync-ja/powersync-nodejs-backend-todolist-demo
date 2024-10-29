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
 */
router.get('/token', async (req, res) => {
  await ensureKeys();
  const powerSyncKey = keys.privateKey;

  const { user_id = 'UserID ' } = req.query;

  const token = await new SignJWT({})
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
