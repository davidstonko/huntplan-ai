module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  // 2026-05-02 (V2.4 audit, iter 14): ignore .claude/worktrees so jest
  // doesn't run agent-spawned worktree copies of every test file.
  // node_modules is the standard ignore. backend/ has its own pytest
  // suite — not a jest target.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
    '/backend/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@react-native-documents/picker$': '<rootDir>/__mocks__/@react-native-documents/picker.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
