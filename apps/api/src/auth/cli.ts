import { readAuthConfig } from './config.js';
import { createMailer } from './mail.js';
import { migrateAuth } from './migrate.js';
import { inviteIdentity } from './operator.js';

const config = readAuthConfig();
if (!config) throw new Error('Operator commands require AUTH_ENABLED=true');
const action = process.argv[2];
try {
  if (action === 'migrate') {
    const migrationURL = process.env.MIGRATION_DATABASE_URL;
    if (!migrationURL) throw new Error('MIGRATION_DATABASE_URL is required');
    await migrateAuth(config, migrationURL);
    console.log('Identity schema migrated; runtime role is restricted to identity DML.');
  } else if (action === 'invite') {
    const email = process.argv[3];
    const name = process.argv[4];
    if (!email || !name) throw new Error('Usage: auth:invite <email> <display-name>');
    const mailer = createMailer(config.smtp);
    try { await inviteIdentity(config, mailer.send, email, name); }
    finally { mailer.close(); }
    console.log('Identity invitation email sent. No tenant or platform privilege was granted.');
  } else { throw new Error('Expected migrate or invite'); }
} catch {
  // Do not expose database URLs, SQL parameters, tokens or SMTP credentials.
  console.error('Authentication operation failed. Check private configuration, database access and SMTP delivery.');
  process.exitCode = 1;
}
