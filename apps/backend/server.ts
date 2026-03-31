import app from "./src/app";
import { ENV } from "./src/config/env";

app.listen(ENV.PORT, () => {
  console.log(`KK System Backend running on port ${ENV.PORT}`);
});
