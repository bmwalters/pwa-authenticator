import typescript from "@rollup/plugin-typescript"

export default {
  input: "src/worker/service-worker.ts",
  output: {
    format: "iife",
    file: "build/service-worker.js",
  },
  plugins: [typescript({ tsconfig: "src/worker/tsconfig.json" })],
}
