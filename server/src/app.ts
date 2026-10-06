import Fastify, { type FastifyInstance } from "fastify";

import type { AppConfig } from "./config/env.js";
import { createDatabase } from "./db/database.js";
import { runMigrations } from "./db/migrate.js";
import { AuditLogRepository } from "./repositories/audit-log-repository.js";
import { AddressRepository } from "./repositories/address-repository.js";
import { ExceptionRepository } from "./repositories/exception-repository.js";
import { PackageRepository } from "./repositories/package-repository.js";
import { ShipmentRepository } from "./repositories/shipment-repository.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerMockPackageRoutes } from "./routes/mock-packages.js";
import { registerPackageRoutes } from "./routes/packages.js";
import { registerShipmentRoutes } from "./routes/shipments.js";
import { PackageService } from "./services/package-service.js";
import { ShipmentService } from "./services/shipment-service.js";
import { AppError } from "./utils/app-error.js";

export type BuildAppOptions = {
  config: AppConfig;
  logger?: boolean;
};

export async function buildApp(
  options: BuildAppOptions
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false
  });
  const database = createDatabase(options.config.sqliteDbPath);
  runMigrations(database);
  const packageRepository = new PackageRepository(database);
  const shipmentRepository = new ShipmentRepository(database);
  const addressRepository = new AddressRepository(database);
  const exceptionRepository = new ExceptionRepository(database);
  const auditLogRepository = new AuditLogRepository(database);
  const packageService = new PackageService(
    database,
    packageRepository,
    exceptionRepository,
    auditLogRepository
  );
  const shipmentService = new ShipmentService(
    database,
    shipmentRepository,
    packageRepository,
    exceptionRepository,
    addressRepository,
    auditLogRepository
  );

  app.addHook("onClose", async () => {
    database.close();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors.length > 0
            ? { fieldErrors: error.fieldErrors }
            : {})
        }
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "服务暂时不可用，请稍后重试。"
      }
    });
  });

  await registerHealthRoute(app, { database });
  await registerPackageRoutes(app, { packageService });
  await registerShipmentRoutes(app, { shipmentService });

  if (options.config.environment !== "production") {
    await registerMockPackageRoutes(app, {
      packageService,
      demoOpsKey: options.config.demoOpsKey
    });
  }

  return app;
}
