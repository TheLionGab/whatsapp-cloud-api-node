import "dotenv/config";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";

const config = loadConfig();
const logger = createLogger();
const app = createApp({ config, logger });

app.listen(config.port, () => {
  logger.info(`whatsapp-business-api ouvindo em :${config.port}`);
});
