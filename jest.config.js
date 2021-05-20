module.exports = {
   preset: "ts-jest",
   setupFilesAfterEnv: ["<rootDir>/frontend/src/setupTests.ts"],
   moduleDirectories: ["node_modules", "frontend"],
   moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
   modulePathIgnorePatterns: [".*.scss"],
   moduleNameMapper : {
      "\\.scss$": "<rootDir>/frontend/styleMock.js",
      "^@/(.*)$": ["<rootDir>/frontend/src/$1"]
   }
};

