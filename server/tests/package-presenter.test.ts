import { describe, expect, it } from "vitest";

import { PackageStatus, type Package } from "../src/domain/index.js";
import { presentPackage } from "../src/presenters/package-presenter.js";

const basePackage: Omit<Package, "status"> = {
  id: "pkg-test",
  userId: "user-test",
  warehouseId: "warehouse-test",
  domesticTrackingNumber: "TEST-001",
  description: "测试商品",
  arrivedAt: null,
  weightG: null,
  version: 1,
  createdAt: "2026-10-06T00:00:00.000Z",
  updatedAt: "2026-10-06T00:00:00.000Z"
};

describe("Package presenter", () => {
  it("maps every internal package state to Chinese user-facing content", () => {
    for (const status of Object.values(PackageStatus)) {
      const result = presentPackage({
        ...basePackage,
        status
      });

      expect(result.status).toBe(status);
      expect(result.statusLabel).not.toBe(status);
      expect(result.statusLabel).not.toEqual("");
      expect(result.statusDescription).not.toEqual("");
      expect(result.availableActions.length).toBeGreaterThan(0);
    }
  });
});
