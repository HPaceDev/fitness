import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as schema from './schema.js'

/**
 * Подключение к базе.
 * DATABASE_URL задан — PostgreSQL (продакшен).
 * Не задан — встроенный PGlite в каталоге ./data (локальная разработка и тесты),
 * тот же SQL, те же миграции.
 */
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../drizzle')

export type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>

export async function connect(): Promise<{ db: Db; kind: 'postgres' | 'pglite' }> {
  const url = process.env.DATABASE_URL
  if (url) {
    const pool = new pg.Pool({ connectionString: url })
    const db = drizzlePg(pool, { schema })
    await migratePg(db, { migrationsFolder })
    return { db, kind: 'postgres' }
  }
  const dataDir = process.env.PGLITE_DIR ?? path.resolve(process.cwd(), 'data/pg')
  fs.mkdirSync(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder })
  return { db, kind: 'pglite' }
}

export { schema }
