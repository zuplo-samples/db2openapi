module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
};
