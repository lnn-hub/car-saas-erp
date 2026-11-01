import { execSync } from 'node:child_process';
import { Client } from 'pg';

// Тестийн санг бүрэн цэвэрлээд migration-уудыг (production-тэй яг адилаар, `npm run migrate`) ажиллуулна
export default async function setup() {
  const url = process.env.DATABASE_URL!;
  const dbName = new URL(url).pathname.slice(1);
  if (!/test|ci/i.test(dbName)) throw new Error(`Тестийн сангийн нэрэнд "test" эсвэл "ci" байх ёстой: ${dbName}`);

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();

  execSync('npm run -s migrate', { env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
}
