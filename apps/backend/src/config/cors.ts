import cors from "cors";
import { ENV } from "./env";

export const corsOptions = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (ENV.CORS_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin not allowed."));
  },
  credentials: true,
});
