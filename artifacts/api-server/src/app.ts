import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "path";
import { fileURLToPath } from "url";

app.use("/api", router);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Assuming the build structure puts api-server/dist and bros/dist next to each other, or we reference it via workspace layout
  // In Docker, we will place the frontend in /app/public and backend in /app/dist
  const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, "../../../bros/dist/public");
  
  app.use(express.static(publicDir));
  
  // Catch-all route for client-side routing
  app.get(/.*/, (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicDir, "index.html"));
    }
  });
}

export default app;
