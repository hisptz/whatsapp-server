//@ts-nocheck

import type {Config} from "jest";


const config: Config = {
    preset: 'ts-jest',
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    testEnvironment: "node",
}

export default config;
