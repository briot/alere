module.exports = {
   preset: "ts-jest",
   setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
   moduleDirectories: ["node_modules", "."],
   moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
   modulePathIgnorePattern: [".*.scss"],
   moduleNameMapper : {
      "\\.scss$": "<rootDir>/styleMock.js",
      "^@/(.*)$": ["<rootDir>/src/$1"]
   }
};

