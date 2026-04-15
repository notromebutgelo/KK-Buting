import app from "./app";
import { ENV } from "./config/env";

app.listen(Number(ENV.PORT), ENV.HOST, () => {
  console.log(`Backend listening on ${ENV.HOST}:${ENV.PORT}`);
  console.log(`Local health check: http://localhost:${ENV.PORT}/health`);
});
