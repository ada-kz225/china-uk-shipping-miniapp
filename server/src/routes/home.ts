import type { FastifyInstance } from "fastify";

import { presentHome } from "../presenters/home-presenter.js";
import { HomeService } from "../services/home-service.js";
import { getCurrentDemoUserId } from "./request-context.js";

type HomeRouteOptions = {
  homeService: HomeService;
};

export async function registerHomeRoute(
  app: FastifyInstance,
  options: HomeRouteOptions
): Promise<void> {
  app.get("/home", async (request) => {
    const userId = getCurrentDemoUserId(request);
    return { data: presentHome(options.homeService.getHome(userId)) };
  });
}
