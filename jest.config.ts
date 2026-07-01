import type { Config } from "jest";

const config: Config = {
  // Collect from all source files so uncovered code shows up in the report
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "pages/api/**/*.ts",
    "pages/auth/**/*.tsx",
    "locales/**/*.ts",
    "!**/*.d.ts",
  ],
  // Thresholds set at current baseline — raise incrementally as coverage grows
  coverageThreshold: {
    global: { statements: 37, branches: 32, functions: 26, lines: 38 },
  },

  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: ["<rootDir>/__tests__/lib/**/*.test.ts", "<rootDir>/__tests__/api/**/*.test.ts"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
    },
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/__tests__/ui/**/*.test.tsx"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
      moduleNameMapper: {
        "^@/.*\\.module\\.css$": "<rootDir>/__mocks__/styleMock.js",
        "^@/(.*)$": "<rootDir>/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;
