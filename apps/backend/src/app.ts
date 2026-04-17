import express from "express";
import { corsOptions } from "./config/cors";
import { errorHandler } from "./middleware/errorHandle";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import profilingRoutes from "./modules/profiling/profiling.routes";
import digitalIdRoutes from "./modules/digital-id/digitalId.routes";
import merchantsRoutes from "./modules/merchants/merchants.routes";
import pointsRoutes from "./modules/points/points.routes";
import qrRoutes from "./modules/qr/qr.routes";
import adminRoutes from "./modules/admin/admin.routes";
import rewardsRoutes from "./modules/rewards/rewards.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import vouchersRoutes from "./modules/vouchers/vouchers.routes";
import promotionsRoutes from "./modules/promotions/promotions.routes";

const app = express();

app.use(corsOptions);
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/profiling", profilingRoutes);
app.use("/api/digital-id", digitalIdRoutes);
app.use("/api/merchants", merchantsRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/vouchers", vouchersRoutes);
app.use("/api/promotions", promotionsRoutes);

app.use(errorHandler);

export default app;
