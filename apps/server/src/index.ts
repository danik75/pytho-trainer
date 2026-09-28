import { join } from 'node:path';
import dotenv from 'dotenv';
import { loadConfig } from './config';

dotenv.config({ path: join(__dirname, '../../../.env') });
import { createDbClient } from './db/client';
import { runMigrations } from './db/migrate';
import { ensureLocalUser } from './db/repositories/users';
import { buildApp } from './app';

const config = loadConfig();
const db = createDbClient(config.dbPath);
runMigrations(db);
ensureLocalUser(db);

const app = buildApp(db);

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
