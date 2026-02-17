import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.test.ts'],

            // Keep console output normal, also emit JUnit
            reporters: ['default', 'junit'],
            outputFile: {
                junit: './test-results/vitest/junit.xml',
            },

            // Coverage artifacts go in a tool-owned subfolder
            coverage: {
                reporter: ['text', 'html'],
                reportsDirectory: './test-results/vitest/coverage',

                // Optional: if you want to prevent wiping coverage outputs
                // (I usually keep this true, but here's the lever)
                // clean: false,
            },
        },
    })
)
