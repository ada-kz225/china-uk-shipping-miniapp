import type { SqliteDatabase } from "./database.js";

const demoUserId = "usr_demo_primary";
const demoWarehouseId = "wh_cn_demo";
const seedTime = "2026-10-05T09:00:00.000Z";

type SeedShipment = {
  id: string;
  reference: string;
  addressId: string;
  status: string;
  packageId: string;
  finalWeightG: number | null;
  dispatchedAt: string | null;
};

type SeedPackage = {
  id: string;
  tracking: string;
  description: string;
  status: string;
  arrivedAt: string | null;
  weight: number | null;
};

const seedShipments: SeedShipment[] = [
  {
    id: "sh_demo_processing",
    reference: "DEMO-20261005-001",
    addressId: "addr_demo_01",
    status: "WAREHOUSE_PROCESSING",
    packageId: "pkg_demo_13",
    finalWeightG: null,
    dispatchedAt: null
  },
  {
    id: "sh_demo_awaiting_payment",
    reference: "DEMO-20261005-002",
    addressId: "addr_demo_02",
    status: "AWAITING_PAYMENT",
    packageId: "pkg_demo_14",
    finalWeightG: 3200,
    dispatchedAt: null
  },
  {
    id: "sh_demo_paid",
    reference: "DEMO-20261005-003",
    addressId: "addr_demo_03",
    status: "PAID_AWAITING_DISPATCH",
    packageId: "pkg_demo_15",
    finalWeightG: 2800,
    dispatchedAt: null
  },
  {
    id: "sh_demo_transit",
    reference: "DEMO-20261005-004",
    addressId: "addr_demo_04",
    status: "INTERNATIONAL_TRANSIT",
    packageId: "pkg_demo_16",
    finalWeightG: 4100,
    dispatchedAt: "2026-10-01T10:00:00.000Z"
  },
  {
    id: "sh_demo_delivered",
    reference: "DEMO-20261005-005",
    addressId: "addr_demo_05",
    status: "DELIVERED",
    packageId: "pkg_demo_17",
    finalWeightG: 2500,
    dispatchedAt: "2026-09-20T10:00:00.000Z"
  },
  {
    id: "sh_demo_exception",
    reference: "DEMO-20261005-006",
    addressId: "addr_demo_06",
    status: "EXCEPTION",
    packageId: "pkg_demo_18",
    finalWeightG: 3600,
    dispatchedAt: "2026-10-02T10:00:00.000Z"
  }
];

export function seedDemoData(database: SqliteDatabase): void {
  const seed = database.transaction(() => {
    insertUser(database);
    insertWarehouse(database);
    insertAddresses(database);
    insertPackages(database);
    insertShipments(database);
    insertShipmentPackages(database);
    insertQuotes(database);
    insertPayments(database);
    insertTrackingEvents(database);
    insertExceptions(database);
    insertAuditLogs(database);
  });

  seed();
}

function insertUser(database: SqliteDatabase): void {
  database
    .prepare(
      [
        "INSERT OR IGNORE INTO users (",
        "id, external_subject, display_name, warehouse_recipient_code, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      demoUserId,
      "demo-primary-user",
      "演示用户",
      "DEMO-UK-001",
      seedTime,
      seedTime
    );
}

function insertWarehouse(database: SqliteDatabase): void {
  database
    .prepare(
      [
        "INSERT OR IGNORE INTO warehouses (",
        "id, name, recipient_name, phone, address_line, instructions, is_active, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      demoWarehouseId,
      "中国仓（演示）",
      "中英转运仓",
      "00000000000",
      "中国仓演示地址，仅用于作品集数据",
      "下单时请填写个人识别码。",
      1,
      seedTime,
      seedTime
    );
}

function insertAddresses(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO addresses (",
      "id, user_id, recipient_name, phone, postcode, address_line, created_at, updated_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );

  for (let index = 1; index <= 6; index += 1) {
    const addressId = "addr_demo_0" + index;
    statement.run(
      addressId,
      demoUserId,
      "演示收件人",
      "00000000000",
      "SW1A 1AA",
      "英国演示地址 " + index + " 号",
      seedTime,
      seedTime
    );
  }
}

function insertPackages(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO packages (",
      "id, user_id, warehouse_id, domestic_tracking_number, description, status,",
      "arrived_at, weight_g, created_at, updated_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );

  const packages: SeedPackage[] = [
    {
      id: "pkg_demo_01",
      tracking: "DEMO-TRACK-001",
      description: "生活用品（演示）",
      status: "DECLARED",
      arrivedAt: null,
      weight: null
    },
    {
      id: "pkg_demo_02",
      tracking: "DEMO-TRACK-002",
      description: "衣物（演示）",
      status: "ARRIVED_PENDING_MATCH",
      arrivedAt: "2026-10-04T10:00:00.000Z",
      weight: 800
    }
  ];

  for (let index = 3; index <= 12; index += 1) {
    packages.push({
      id: "pkg_demo_" + String(index).padStart(2, "0"),
      tracking: "DEMO-TRACK-" + String(index).padStart(3, "0"),
      description: "可合箱商品 " + (index - 2) + "（演示）",
      status: "READY_FOR_SHIPMENT",
      arrivedAt: "2026-10-03T10:00:00.000Z",
      weight: 500 + index * 10
    });
  }

  for (let index = 13; index <= 18; index += 1) {
    packages.push({
      id: "pkg_demo_" + String(index).padStart(2, "0"),
      tracking: "DEMO-TRACK-" + String(index).padStart(3, "0"),
      description: "已加入转运的商品 " + (index - 12) + "（演示）",
      status: "IN_SHIPMENT",
      arrivedAt: "2026-10-01T10:00:00.000Z",
      weight: 600 + index * 10
    });
  }

  packages.push({
    id: "pkg_demo_19",
    tracking: "DEMO-TRACK-019",
    description: "待核实商品（演示）",
    status: "EXCEPTION",
    arrivedAt: "2026-10-04T11:00:00.000Z",
    weight: null
  });

  for (const item of packages) {
    statement.run(
      item.id,
      demoUserId,
      demoWarehouseId,
      item.tracking,
      item.description,
      item.status,
      item.arrivedAt,
      item.weight,
      seedTime,
      seedTime
    );
  }
}

function insertShipments(database: SqliteDatabase): void {
  const statement = database.prepare(
      [
        "INSERT OR IGNORE INTO shipments (",
        "id, reference, user_id, warehouse_id, address_id, status, submitted_at,",
        "packing_completed_at, final_weight_g, final_chargeable_weight_g, dispatched_at, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );

  for (const shipment of seedShipments) {
    statement.run(
      shipment.id,
      shipment.reference,
      demoUserId,
      demoWarehouseId,
      shipment.addressId,
      shipment.status,
      "2026-09-30T10:00:00.000Z",
      shipment.finalWeightG ? "2026-09-30T12:00:00.000Z" : null,
      shipment.finalWeightG,
      shipment.finalWeightG,
      shipment.dispatchedAt,
      seedTime,
      seedTime
    );
  }
}

function insertShipmentPackages(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO shipment_packages (",
      "id, shipment_id, package_id, locked_at, created_at",
      ") VALUES (?, ?, ?, ?, ?)"
    ].join(" ")
  );

  for (const shipment of seedShipments) {
    statement.run(
      "sp_" + shipment.id,
      shipment.id,
      shipment.packageId,
      "2026-09-30T10:00:00.000Z",
      seedTime
    );
  }
}

function insertQuotes(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO quotes (",
      "id, shipment_id, final_weight_g, chargeable_weight_g, shipping_fee_minor,",
      "service_fee_minor, total_amount_minor, currency, source, created_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );
  const quoteShipments = seedShipments.filter(
    (shipment) => shipment.finalWeightG !== null
  );

  for (const shipment of quoteShipments) {
    const finalWeight = shipment.finalWeightG as number;
    const shippingFee = finalWeight * 2;
    const serviceFee = 200;

    statement.run(
      "quote_" + shipment.id,
      shipment.id,
      finalWeight,
      finalWeight,
      shippingFee,
      serviceFee,
      shippingFee + serviceFee,
      "GBP",
      "MOCK_OPS",
      "2026-09-30T12:05:00.000Z"
    );
  }
}

function insertPayments(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO payments (",
      "id, shipment_id, quote_id, amount_minor, currency, status, provider,",
      "provider_reference, idempotency_key, created_at, completed_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );
  const paymentData = [
    {
      id: "pay_demo_failed",
      shipmentId: "sh_demo_awaiting_payment",
      quoteId: "quote_sh_demo_awaiting_payment",
      status: "FAILED",
      providerReference: "mock-failed-001",
      key: "demo-payment-failed-001",
      completedAt: "2026-09-30T12:08:00.000Z"
    },
    {
      id: "pay_demo_paid",
      shipmentId: "sh_demo_paid",
      quoteId: "quote_sh_demo_paid",
      status: "SUCCEEDED",
      providerReference: "mock-success-001",
      key: "demo-payment-success-001",
      completedAt: "2026-09-30T12:10:00.000Z"
    },
    {
      id: "pay_demo_transit",
      shipmentId: "sh_demo_transit",
      quoteId: "quote_sh_demo_transit",
      status: "SUCCEEDED",
      providerReference: "mock-success-002",
      key: "demo-payment-success-002",
      completedAt: "2026-09-30T12:10:00.000Z"
    },
    {
      id: "pay_demo_delivered",
      shipmentId: "sh_demo_delivered",
      quoteId: "quote_sh_demo_delivered",
      status: "SUCCEEDED",
      providerReference: "mock-success-003",
      key: "demo-payment-success-003",
      completedAt: "2026-09-30T12:10:00.000Z"
    },
    {
      id: "pay_demo_exception",
      shipmentId: "sh_demo_exception",
      quoteId: "quote_sh_demo_exception",
      status: "SUCCEEDED",
      providerReference: "mock-success-004",
      key: "demo-payment-success-004",
      completedAt: "2026-09-30T12:10:00.000Z"
    }
  ];

  for (const payment of paymentData) {
    const amount = database
      .prepare("SELECT total_amount_minor FROM quotes WHERE id = ?")
      .get(payment.quoteId) as { total_amount_minor: number };

    statement.run(
      payment.id,
      payment.shipmentId,
      payment.quoteId,
      amount.total_amount_minor,
      "GBP",
      payment.status,
      "MOCK_PAYMENT",
      payment.providerReference,
      payment.key,
      "2026-09-30T12:06:00.000Z",
      payment.completedAt
    );
  }
}

function insertTrackingEvents(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO tracking_events (",
      "id, shipment_id, event_type, display_message, source, occurred_at, created_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );
  const eventGroups = [
    {
      shipmentId: "sh_demo_transit",
      events: [
        ["DISPATCHED", "已从仓库发出", "2026-10-01T10:00:00.000Z"],
        ["INTERNATIONAL_TRANSIT", "国际运输中", "2026-10-02T10:00:00.000Z"]
      ]
    },
    {
      shipmentId: "sh_demo_delivered",
      events: [
        ["DISPATCHED", "已从仓库发出", "2026-09-20T10:00:00.000Z"],
        ["INTERNATIONAL_TRANSIT", "国际运输中", "2026-09-21T10:00:00.000Z"],
        ["CUSTOMS_CLEARANCE", "清关中", "2026-09-22T10:00:00.000Z"],
        ["UK_LAST_MILE", "英国派送中", "2026-09-23T10:00:00.000Z"],
        ["DELIVERED", "已签收", "2026-09-24T10:00:00.000Z"]
      ]
    },
    {
      shipmentId: "sh_demo_exception",
      events: [
        ["DISPATCHED", "已从仓库发出", "2026-10-02T10:00:00.000Z"],
        ["INTERNATIONAL_TRANSIT", "国际运输中", "2026-10-03T10:00:00.000Z"],
        ["CUSTOMS_CLEARANCE", "清关中", "2026-10-04T10:00:00.000Z"],
        ["UK_LAST_MILE", "英国派送中", "2026-10-05T10:00:00.000Z"]
      ]
    }
  ];

  for (const group of eventGroups) {
    group.events.forEach((event, index) => {
      statement.run(
        "track_" + group.shipmentId + "_" + index,
        group.shipmentId,
        event[0],
        event[1],
        "MOCK_OPS",
        event[2],
        event[2]
      );
    });
  }
}

function insertExceptions(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO exceptions (",
      "id, package_id, shipment_id, type, status, title, description, impact,",
      "required_action, resume_state, is_blocking, created_at, updated_at, resolved_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );

  statement.run(
    "exc_demo_package",
    "pkg_demo_19",
    null,
    "PACKAGE_MATCHING",
    "OPEN",
    "包裹信息待确认",
    "仓库暂时无法确认该包裹的归属。",
    "该包裹暂时不能加入转运单。",
    "请核对国内运单号并补充商品信息。",
    "ARRIVED_PENDING_MATCH",
    1,
    seedTime,
    seedTime,
    null
  );

  statement.run(
    "exc_demo_shipment",
    null,
    "sh_demo_exception",
    "UK_LAST_MILE_DELAY",
    "OPEN",
    "末端派送信息待确认",
    "英国本地派送状态暂未更新，正在核实。",
    "本次转运暂时无法确认签收。",
    "当前无需操作，正在处理。",
    "UK_LAST_MILE",
    1,
    seedTime,
    seedTime,
    null
  );
}

function insertAuditLogs(database: SqliteDatabase): void {
  const statement = database.prepare(
    [
      "INSERT OR IGNORE INTO audit_logs (",
      "id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at",
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  );
  const logs = [
    ["audit_demo_ready", "MOCK_OPS", "PACKAGE_MATCHED", "PACKAGE", "pkg_demo_03"],
    ["audit_demo_quote", "MOCK_OPS", "QUOTE_GENERATED", "SHIPMENT", "sh_demo_awaiting_payment"],
    ["audit_demo_payment", "MOCK_PAYMENT", "PAYMENT_SUCCEEDED", "SHIPMENT", "sh_demo_paid"],
    ["audit_demo_dispatch", "MOCK_OPS", "SHIPMENT_DISPATCHED", "SHIPMENT", "sh_demo_transit"],
    ["audit_demo_exception", "MOCK_OPS", "EXCEPTION_RAISED", "SHIPMENT", "sh_demo_exception"]
  ];

  for (const log of logs) {
    statement.run(
      log[0],
      log[1],
      null,
      log[2],
      log[3],
      log[4],
      JSON.stringify({ source: "seed-demo-data" }),
      seedTime
    );
  }
}
