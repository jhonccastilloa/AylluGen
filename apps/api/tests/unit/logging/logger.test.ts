import Transport from "winston-transport";
import { createLogger } from "../../../src/infrastructure/logging/createLogger";

test("filters levels and sanitizes child metadata before transport", () => {
  const entries: Record<string, unknown>[] = [];
  class Capture extends Transport {
    log(info: Record<string, unknown>, callback: () => void) {
      entries.push(info);
      callback();
    }
  }
  const logger = createLogger({
    environment: "test",
    level: "info",
    fileEnabled: false,
    filePath: "./logs",
    maxFiles: "14d",
    maxSize: "20m",
  });
  logger.clear().add(new Capture());
  const child = logger.child({ requestId: "request-1", token: "child-secret" });
  const data = {
    password: "secret",
    nested: { authorization: "Bearer secret" },
  };
  child.debug("hidden");
  child.info("visible", data);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    requestId: "request-1",
    token: "[REDACTED]",
    password: "[REDACTED]",
    nested: { authorization: "[REDACTED]" },
    message: "visible",
  });
  expect(data.password).toBe("secret");
  logger.close();
});

test.each([
  ["LOG_LEVEL", "invalid"],
  ["LOG_FILE_MAX_FILES", "invalid"],
  ["LOG_FILE_MAX_SIZE", "500"],
])("central config rejects invalid %s", (key, value) => {
  const previous = process.env[key];
  process.env[key] = value;
  try {
    expect(() =>
      jest.isolateModules(() => {
        require("../../../src/shared/constants/config");
      }),
    ).toThrow(key);
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});
