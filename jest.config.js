module.exports = {
   preset: "ts-jest",
   setupFilesAfterEnv: ["<rootDir>/frontend/src/setupTests.ts"],
   moduleDirectories: ["node_modules", "frontend/src"],
   moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
   modulePathIgnorePatterns: [".*.scss", "<rootDir>/src-tauri"],
   moduleNameMapper : {
      "\\.scss$": "<rootDir>/frontend/src/styleMock.js",
      "^@/(.*)$": ["<rootDir>/frontend/src/$1"]
   }
};

