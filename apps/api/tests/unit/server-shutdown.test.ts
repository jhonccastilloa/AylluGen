import type { Server } from "node:http";
import App from "../../src/server";
import type { IContainerControllers } from "../../src/composition/container";
import type { ILogger } from "../../src/shared/logging/Logger";

jest.mock("../../src/presentation/routes", () => ({
  createRoutes: () => require("express").Router(),
}));
jest.mock("../../src/infrastructure/openapi", () => ({ openApiSpec: {} }));

describe("server shutdown", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function setup() {
    jest.useFakeTimers();
    const logger: ILogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(),
    };
    const shutdown = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const app = new App({} as IContainerControllers, logger, shutdown);
    let drained!: (error?: Error) => void;
    const close = jest.fn((callback: typeof drained) => {
      drained = callback;
    });
    jest
      .spyOn(app.getApp(), "listen")
      .mockReturnValue({ close } as unknown as Server);
    const on = jest.spyOn(process, "on").mockReturnValue(process);
    const exit = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    app.listen();
    const signal = (name: string) => {
      const listener = on.mock.calls.find(([event]) => event === name)![1];
      listener();
    };
    return { shutdown, close, exit, signal, drain: () => drained() };
  }

  it("waits for HTTP and database cleanup, ignoring repeated signals", async () => {
    const { shutdown, close, exit, signal, drain } = setup();
    let disconnect!: () => void;
    shutdown.mockReturnValue(
      new Promise<void>((resolve) => {
        disconnect = resolve;
      }),
    );

    signal("SIGTERM");
    signal("SIGINT");
    expect(close).toHaveBeenCalledTimes(1);
    expect(shutdown).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();

    drain();
    await Promise.resolve();
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();

    disconnect();
    await Promise.resolve();
    expect(exit).toHaveBeenCalledWith(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("exits with failure if active requests prevent shutdown for 30 seconds", () => {
    const { shutdown, exit, signal } = setup();
    signal("SIGTERM");
    jest.advanceTimersByTime(30_000);
    expect(exit).toHaveBeenCalledWith(1);
    expect(shutdown).not.toHaveBeenCalled();
  });

  it("exits with failure when database cleanup fails", async () => {
    const { shutdown, exit, signal, drain } = setup();
    shutdown.mockRejectedValue(new Error("disconnect failed"));
    signal("SIGINT");
    drain();
    await Promise.resolve();
    await Promise.resolve();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
