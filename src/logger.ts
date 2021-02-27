import logger from "winston";
import { format } from "winston";

logger.add(
  new logger.transports.Console({
    // format: logger.format.cli(),
    format: format.combine(format.cli(), format.simple()),
    level: process.env.LOG_LEVEL?.toLocaleLowerCase() || "info",
  }),
);

export const log = logger;
