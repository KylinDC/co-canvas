import {
  defineWorkersProject,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersProject(async () => {
  const migrationsPath = 'drizzle'
  const migrations = await readD1Migrations(migrationsPath)

  return {
    test: {
      globals: true,
      setupFiles: ['./worker/test-setup.ts'],
      coverage: {
        enable: true,
        provider: 'istanbul',
        include: ['worker/**/*.{ts}'],
      },
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            // Make migrations available to tests
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
      include: ['worker/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules/**/*', 'src/**/*'],
    },
  }
})
