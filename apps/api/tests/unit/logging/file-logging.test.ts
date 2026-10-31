import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import DailyRotateFile from "winston-daily-rotate-file";
import { createLogger } from "../../../src/infrastructure/logging/createLogger";

test("writes redacted events to the appropriate rotating files", async () => {
  const root =
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Temp", "opencode")
      : tmpdir();
  const directory = await mkdtemp(join(root, "ayllu-logger-"));
  const logger = createLogger({
    environment: "test",
    level: "info",
    fileEnabled: true,
    filePath: directory,
    maxFiles: "14d",
    maxSize: "20m",
  });
  const files = logger.transports.filter(
    (transport): transport is DailyRotateFile =>
      transport instanceof DailyRotateFile,
  );
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    const finished = files.map((transport) => once(transport, "finish"));
    logger.close();
    await Promise.all(finished);
  };

  try {
    // Keep the real file transports; avoid console output during the test.
    for (const transport of [...logger.transports]) {
      if (!(transport instanceof DailyRotateFile)) logger.remove(transport);
    }
    expect(files).toHaveLength(2);
    for (const transport of files) {
      expect(transport.options).toMatchObject({
        maxFiles: "14d",
        maxSize: "20m",
      });
    }
    logger.info("file.info", { password: "private-password" });
    logger.error("file.error", { nested: { token: "private-token" } });
    await close();

    const names = await readdir(directory);
    const readEvents = async (prefix: string) => {
      const matching = names.filter(
        (name) => name.startsWith(prefix) && name.endsWith(".log"),
      );
      expect(matching.length).toBeGreaterThan(0);
      const contents = (
        await Promise.all(
          matching.map((name) => readFile(join(directory, name), "utf8")),
        )
      ).join("\n");
      expect(contents).not.toContain("private-password");
      expect(contents).not.toContain("private-token");
      return contents
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    };
    const application = await readEvents("application-");
    const errors = await readEvents("error-");
    expect(application.map((event) => event.message)).toEqual([
      "file.info",
      "file.error",
    ]);
    expect(application[0].password).toBe("[REDACTED]");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      message: "file.error",
      nested: { token: "[REDACTED]" },
    });
  } finally {
    await close();
    await rm(directory, { recursive: true, force: true });
  }
});
