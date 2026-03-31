import cors from "cors";
import { ENV } from "./env";

export const corsOptions = cors({
  origin: [ENV.CLIENT_URL, "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
});
