module.exports = {
   preset: "ts-jest",
   clearMocks: true,
   testEnvironment: "jsdom",
   setupFilesAfterEnv: ["<rootDir>/frontend/src/setupTests.ts"],
   moduleDirectories: ["node_modules", "frontend/src"],
   moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
   modulePathIgnorePatterns: [".*.scss"], // "<rootDir>/src-tauri"],
   moduleNameMapper : {
      "\\.scss$": "<rootDir>/frontend/styleMock.js",
      "^@/(.*)$": ["<rootDir>/frontend/src/$1"],

      // Prevent jest from trying to transform those d3 modules.
      "d3(.*)": "<rootDir>/node_modules/d3$1/dist/d3$1.js",
   },
   collectCoverageFrom: [
      '**/*.{js,jsx,ts,tsx}',
      '!**/node_modules/**',
   ],
};

