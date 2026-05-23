import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure"
  }
});
