import * as jose from 'jose';
import * as crypto from 'crypto';

export async function generateKeyPair() {
  const alg = 'RS256';
  const kid = `powersync-${crypto.randomBytes(5).toString('hex')}`;

  const { publicKey, privateKey } = await jose.generateKeyPair(alg, {
    extractable: true
  });

  const privateJwk = {
    ...(await jose.exportJWK(privateKey)),
    alg,
    kid
  };
  const publicJwk = {
    ...(await jose.exportJWK(publicKey)),
    alg,
    kid
  };

  const privateBase64 = Buffer.from(JSON.stringify(privateJwk)).toString('base64');
  const publicBase64 = Buffer.from(JSON.stringify(publicJwk)).toString('base64');

  return {
    privateBase64,
    publicBase64
  };
}
