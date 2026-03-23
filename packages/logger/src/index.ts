import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

const targets: pino.TransportTargetOptions[] = [
  {
    target: "pino-opentelemetry-transport",
    level: process.env.LOG_LEVEL || "info",
    options: {},
  },
];

if (isDevelopment) {
  targets.push({
    target: "pino-pretty",
    level: process.env.LOG_LEVEL || "info",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss.l o",
      ignore: "pid,hostname,req,rpc",
    },
  });
} else {
  targets.push({
    target: "pino-pretty",
    level: process.env.LOG_LEVEL || "info",
    options: { destination: 1 },
  });
}

const transport = pino.transport({ targets });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
  },
  transport
);

export type Logger = pino.Logger;
