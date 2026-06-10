import app from './app.js';
import config from './config.js';
import { ensureAttachmentsDir } from './src/api/attachments.js';

const PORT = process.env.PORT || config.port;

ensureAttachmentsDir();

app.listen(PORT, () => {
  console.log(`Server is running @ http://127.0.0.1:${PORT}`);
});
