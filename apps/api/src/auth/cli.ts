import { readAuthConfig } from './config.js';
import { createMailer } from './mail.js';
import { migrateAuth } from './migrate.js';
import { inviteIdentity } from './operator.js';
import { provisionRoles } from './provision.js';
import { Pool } from 'pg';

const action = process.argv[2];
try {
  const config = readAuthConfig();
  if (!config) throw new Error('Operator commands require AUTH_ENABLED=true');
  if (action === 'provision') {
    if (!process.env.MIGRATION_DATABASE_URL || !config.businessDatabaseURL)
      throw new Error('Missing operator/business configuration');
    await provisionRoles(
      process.env.MIGRATION_DATABASE_URL,
      config.databaseURL,
      config.businessDatabaseURL,
    );
    console.log(
      'Runtime roles provisioned. Credentials were changed only by this explicit operation.',
    );
  } else if (action === 'identity') {
    if (!process.argv[3]) throw new Error('Expected email');
    const pool = new Pool({ connectionString: config.databaseURL, max: 1 });
    try {
      const result = await pool.query<{ id: string; emailVerified: boolean }>(
        'SELECT id,"emailVerified" FROM identity."user" WHERE lower(email)=lower($1)',
        [process.argv[3]],
      );
      if (!result.rows[0]) throw new Error('Identity not found');
      console.log(JSON.stringify(result.rows[0]));
    } finally {
      await pool.end();
    }
  } else if (action === 'bootstrap') {
    if (
      !process.env.MIGRATION_DATABASE_URL ||
      !process.argv[3] ||
      !process.argv[4]
    )
      throw new Error('Expected verified identity ID and application handle');
    const pool = new Pool({
      connectionString: process.env.MIGRATION_DATABASE_URL,
      max: 1,
    });
    try {
      await pool.query('SELECT business.bootstrap_super($1,$2)', [
        process.argv[3],
        process.argv[4],
      ]);
    } finally {
      await pool.end();
    }
    console.log(
      'Verified operator identity bootstrapped. No password was set.',
    );
  } else if (action === 'migrate') {
    const migrationURL = process.env.MIGRATION_DATABASE_URL;
    if (!migrationURL) throw new Error('MIGRATION_DATABASE_URL is required');
    await migrateAuth(config, migrationURL);
    console.log('Versioned identity and business migrations applied.');
  } else if (action === 'invite') {
    const email = process.argv[3];
    const name = process.argv[4];
    if (!email || !name)
      throw new Error('Usage: auth:invite <email> <display-name>');
    const mailer = createMailer(config.smtp);
    try {
      await inviteIdentity(config, mailer.send, email, name);
    } finally {
      mailer.close();
    }
    console.log(
      'Identity invitation email sent. No tenant or platform privilege was granted.',
    );
  } else {
    throw new Error('Expected migrate or invite');
  }
} catch {
  // Do not expose database URLs, SQL parameters, tokens or SMTP credentials.
  console.error(
    'Authentication operation failed. Check private configuration, database access and SMTP delivery.',
  );
  process.exitCode = 1;
}
