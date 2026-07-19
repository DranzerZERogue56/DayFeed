/**
 * Node-only unit tests for the pure logic layers (src/db, src/lib, src/utils).
 * expo-sqlite / expo-crypto are mapped to better-sqlite3 / node:crypto mocks so
 * the real SQL and migrations run in-memory without a device or the RN runtime.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/test/mocks/expo-sqlite.ts',
    '^expo-crypto$': '<rootDir>/test/mocks/expo-crypto.ts',
  },
};
