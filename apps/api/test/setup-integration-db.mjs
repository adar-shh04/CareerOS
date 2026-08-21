import { Client } from 'pg';

const cleanup = process.argv.includes('--cleanup');

// Connection to the default careeros database to run administrative commands
const client = new Client({
  connectionString: 'postgresql://careeros:careeros@localhost:5432/careeros'
});

async function run() {
  await client.connect();

  if (cleanup) {
    console.log('Dropping database careeros_integration...');
    // Terminate existing connections first
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'careeros_integration'
        AND pid <> pg_backend_pid();
    `);
    await client.query('DROP DATABASE IF EXISTS careeros_integration;');
    console.log('Database dropped.');
  } else {
    console.log('Ensuring database careeros_integration exists...');
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'careeros_integration'`);
    if (result.rowCount === 0) {
      await client.query('CREATE DATABASE careeros_integration;');
      console.log('Database created.');
    } else {
      console.log('Database already exists.');
    }
  }

  await client.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
