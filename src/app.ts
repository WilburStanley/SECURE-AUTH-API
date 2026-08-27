import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { protectedRouter } from "./routes/protected.routes.js";
import { globalLimiter } from "./middleware/rateLimiters.js";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use("/auth", authRouter);
app.use("/public", publicRouter);
app.use("/protected", protectedRouter);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));