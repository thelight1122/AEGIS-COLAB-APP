import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.test.ts'],

            // Reporters
            reporters: ['default', 'junit'],

            // Structured output location
            outputFile: {
                junit: './test-results/junit.xml',
            },

            // Optional: coverage output (safe to keep even if not used yet)
            coverage: {
                reporter: ['text', 'html'],
                reportsDirectory: './test-results/coverage',
            },
        },
    })
)
