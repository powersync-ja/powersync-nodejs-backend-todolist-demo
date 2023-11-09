import express from "express";
import jose from "jose";
import config from "../../config.js";

const router = express.Router();

/**
 * Get the JWT token that PowerSync will use to authenticate the user
 */
router.get("/token", async (req, res) => {
    const decodedPrivateKey= new Buffer.from(config.powersync.privateKey, 'base64');
    const powerSyncPrivateKey = JSON.parse(new TextDecoder().decode(decodedPrivateKey));
    const powerSyncKey = (await jose.importJWK(powerSyncPrivateKey));

    const token = await new jose.SignJWT({})
        .setProtectedHeader({
            alg: powerSyncPrivateKey.alg,
            kid: powerSyncPrivateKey.kid,
        })
        .setSubject(user.id)
        .setIssuedAt()
        .setIssuer(supabaseUrl)
        .setAudience(config.powersync.url)
        .setExpirationTime('5m')
        .sign(powerSyncKey);
    res.send({
        token: token,
        powersync_url: config.powersync.url
    });
});

/**
 * This is the JWKS endpoint PowerSync uses to handle authentication
 */
router.get("/keys", (req, res) => {
    const decodedPublicKey= new Buffer.from(config.powersync.publicKey, 'base64');
    const powerSyncPublicKey = JSON.parse(new TextDecoder().decode(decodedPublicKey));
    res.send({
        keys: [
            powerSyncPublicKey
        ]
    });
});

export { router as authRouter }
