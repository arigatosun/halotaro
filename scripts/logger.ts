// logger.ts
import fs from "fs";
import util from "util";
import path from "path";

class Logger {
  private logFile: fs.WriteStream;
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;

  constructor(filename: string) {
    const logPath = path.join(process.cwd(), filename);
    this.logFile = fs.createWriteStream(logPath, { flags: "a" });
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;

    console.log(`Log file will be saved at: ${logPath}`);
  }

  setup() {
    console.log = (...args: any[]) => {
      const message = util.format.apply(null, args) + "\n";
      this.logFile.write(message);
      this.originalConsoleLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = util.format.apply(null, args) + "\n";
      this.logFile.write("ERROR: " + message);
      this.originalConsoleError.apply(console, args);
    };

    process.on("exit", () => {
      this.logFile.end();
    });
  }
}

export const logger = new Logger("salonboard_integration.log");
