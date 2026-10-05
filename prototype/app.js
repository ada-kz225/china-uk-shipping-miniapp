(() => {
  "use strict";

  const app = document.querySelector("#app");
  const tabbar = document.querySelector("#tabbar");
  const pageTitle = document.querySelector("#page-title");
  const toast = document.querySelector("#toast");
  const modalRoot = document.querySelector("#modal-root");

  const packageStatus = {
    DECLARED: { title: "已预报，等待送往仓库", short: "待到仓", kind: "neutral" },
    INBOUND_TO_WAREHOUSE: { title: "正在送往仓库", short: "待到仓", kind: "neutral" },
    ARRIVED_PENDING_MATCH: { title: "已到仓，正在确认归属", short: "待确认", kind: "processing" },
    READY_FOR_SHIPMENT: { title: "可合箱", short: "可合箱", kind: "ready" },
    IN_SHIPMENT: { title: "已加入本次转运", short: "已转运", kind: "neutral" },
    EXCEPTION: { title: "需要处理", short: "需处理", kind: "exception" }
  };

  const shipmentStatus = {
    DRAFT: { title: "正在准备本次转运", next: "请确认包裹并填写英国收货地址。", kind: "neutral" },
    SUBMITTED: { title: "已提交，等待仓库处理", next: "当前无需操作，仓库开始处理后会更新。", kind: "processing" },
    WAREHOUSE_PROCESSING: { title: "仓库正在处理", next: "当前无需操作，仓库正在检查、打包和称重。", kind: "processing" },
    AWAITING_PAYMENT: { title: "最终报价已生成，请确认并付款", next: "请核对最终报价后完成付款。", kind: "action" },
    PAYMENT_PROCESSING: { title: "正在确认付款结果", next: "请勿重复操作，正在确认付款结果。", kind: "processing" },
    PAID_AWAITING_DISPATCH: { title: "已付款，等待仓库发出", next: "当前无需操作。仓库确认实际出库后，才会更新运输进度。", kind: "action" },
    DISPATCHED: { title: "已从仓库发出", next: "当前无需操作，等待国际运输事件更新。", kind: "ready" },
    INTERNATIONAL_TRANSIT: { title: "国际运输中", next: "当前无需操作，可查看最新运输进度。", kind: "ready" },
    CUSTOMS_CLEARANCE: { title: "清关中", next: "默认无需操作；如需补充信息会在这里明确说明。", kind: "processing" },
    UK_LAST_MILE: { title: "英国派送中", next: "当前无需操作，等待签收或新的派送进度。", kind: "ready" },
    DELIVERED: { title: "已签收", next: "本次转运已完成。", kind: "delivered" },
    EXCEPTION: { title: "需要处理", next: "请查看问题说明和下一步。", kind: "exception" },
    CANCELLED: { title: "已取消", next: "可查看相关包裹并在需要时重新创建转运单。", kind: "neutral" }
  };

  const packages = [
    {
      id: "p01",
      tracking: "YT20260901001",
      summary: "冬季外套",
      status: "ARRIVED_PENDING_MATCH",
      arrival: "10月8日 14:20",
      note: "仓库已收货，正在确认归属"
    },
    {
      id: "p02",
      tracking: "SF20260902002",
      summary: "生活用品",
      status: "ARRIVED_PENDING_MATCH",
      arrival: "10月8日 11:08",
      note: "仓库已收货，正在确认归属"
    },
    {
      id: "p03",
      tracking: "ZT20260903003",
      summary: "厨房用品",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月6日 10:15",
      weight: "0.8 kg"
    },
    {
      id: "p04",
      tracking: "YT20260904004",
      summary: "零食",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月6日 16:40",
      weight: "1.1 kg"
    },
    {
      id: "p05",
      tracking: "SF20260905005",
      summary: "护肤用品",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月7日 09:25",
      weight: "0.6 kg"
    },
    {
      id: "p06",
      tracking: "JD20260906006",
      summary: "书籍",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月7日 12:05",
      weight: "1.4 kg"
    },
    {
      id: "p07",
      tracking: "YT20260907007",
      summary: "手机配件",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月7日 15:28",
      weight: "0.3 kg"
    },
    {
      id: "p08",
      tracking: "ZT20260908008",
      summary: "衣物",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月8日 09:12",
      weight: "0.9 kg"
    },
    {
      id: "p09",
      tracking: "SF20260909009",
      summary: "文具",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月8日 10:34",
      weight: "0.4 kg"
    },
    {
      id: "p10",
      tracking: "JD20260910010",
      summary: "鞋子",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月8日 13:18",
      weight: "1.2 kg"
    },
    {
      id: "p11",
      tracking: "YT20260911011",
      summary: "小家电",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月9日 09:05",
      weight: "1.6 kg"
    },
    {
      id: "p12",
      tracking: "ZT20260912012",
      summary: "配饰",
      status: "READY_FOR_SHIPMENT",
      arrival: "10月9日 14:42",
      weight: "0.2 kg"
    },
    {
      id: "p13",
      tracking: "SF20260913013",
      summary: "已转运的衣物",
      status: "IN_SHIPMENT",
      arrival: "10月2日 10:10",
      shipmentId: "s01",
      shipmentRef: "ZY20261001"
    },
    {
      id: "p14",
      tracking: "YT20260914014",
      summary: "商品信息待确认",
      status: "EXCEPTION",
      arrival: "10月8日 17:10",
      exception: {
        title: "包裹信息待确认",
        happened: "仓库暂时无法确认该包裹的归属。",
        impact: "该包裹目前不能加入转运单。",
        action: "请核对国内快递单号并补充商品信息。",
        progress: "等待补充信息。",
        support: "如需帮助，请提供国内运单号末四位 0014。"
      }
    },
    {
      id: "p15",
      tracking: "SF20260915015",
      summary: "在途生活用品",
      status: "INBOUND_TO_WAREHOUSE",
      note: "正在送往中国仓"
    }
  ];

  const shipments = [
    {
      id: "s01",
      reference: "ZY20261001",
      status: "SUBMITTED",
      packageIds: ["p13"],
      packageCount: 1,
      createdAt: "10月2日 10:30",
      address: "陈同学，SW1A 1AA，伦敦，示例地址 12 号"
    },
    {
      id: "s02",
      reference: "ZY20261002",
      status: "AWAITING_PAYMENT",
      packageCount: 3,
      packageLabels: ["国内单号 •••• 7302", "国内单号 •••• 7308", "国内单号 •••• 7315"],
      createdAt: "10月6日 13:10",
      address: "李同学，M1 2AB，曼彻斯特，示例地址 8 号",
      quote: {
        finalWeight: "4.2 kg",
        chargeableWeight: "4.2 kg",
        shippingFee: "£28.00",
        serviceFee: "£3.00",
        total: "£31.00",
        createdAt: "10月9日 16:20"
      }
    },
    {
      id: "s03",
      reference: "ZY20261003",
      status: "PAID_AWAITING_DISPATCH",
      packageCount: 2,
      packageLabels: ["国内单号 •••• 6401", "国内单号 •••• 6409"],
      createdAt: "10月5日 11:15",
      address: "王同学，B1 1BB，伯明翰，示例地址 21 号",
      quote: {
        finalWeight: "2.6 kg",
        chargeableWeight: "2.6 kg",
        shippingFee: "£18.00",
        serviceFee: "£2.00",
        total: "£20.00",
        createdAt: "10月8日 15:12"
      }
    },
    {
      id: "s04",
      reference: "ZY20261004",
      status: "INTERNATIONAL_TRANSIT",
      packageCount: 4,
      packageLabels: ["国内单号 •••• 5110", "国内单号 •••• 5116", "国内单号 •••• 5120", "国内单号 •••• 5127"],
      createdAt: "9月27日 09:20",
      address: "周同学，EH1 1YZ，爱丁堡，示例地址 6 号",
      quote: {
        finalWeight: "5.1 kg",
        chargeableWeight: "5.1 kg",
        shippingFee: "£34.00",
        serviceFee: "£3.00",
        total: "£37.00",
        createdAt: "9月29日 18:00"
      }
    },
    {
      id: "s05",
      reference: "ZY20260988",
      status: "DELIVERED",
      packageCount: 2,
      packageLabels: ["国内单号 •••• 3884", "国内单号 •••• 3891"],
      createdAt: "9月12日 11:20",
      address: "赵同学，LS1 4DY，利兹，示例地址 3 号"
    },
    {
      id: "s06",
      reference: "ZY20261006",
      status: "EXCEPTION",
      resumeStatus: "UK_LAST_MILE",
      packageCount: 3,
      packageLabels: ["国内单号 •••• 8902", "国内单号 •••• 8910", "国内单号 •••• 8918"],
      createdAt: "9月30日 15:20",
      address: "孙同学，G1 2FF，格拉斯哥，示例地址 16 号",
      exception: {
        title: "英国派送信息待核实",
        happened: "最新派送事件尚未确认，当前正在核实。",
        impact: "本次转运单暂不能确认签收时间。",
        action: "当前无需操作；如需协助，请使用下方支持信息。",
        progress: "正在处理，等待新的派送事件。",
        support: "如需帮助，请提供转运单号 ZY20261006。"
      }
    }
  ];

  const state = {
    view: "home",
    currentPackageId: null,
    currentShipmentId: null,
    activeFilter: "all",
    selectionMode: false,
    selectedPackageIds: [],
    paymentPending: false
  };

  const timelineOrder = [
    "DISPATCHED",
    "INTERNATIONAL_TRANSIT",
    "CUSTOMS_CLEARANCE",
    "UK_LAST_MILE",
    "DELIVERED"
  ];

  const timelineMeta = {
    DISPATCHED: { title: "已从仓库发出", description: "仓库已确认实际出库。", time: "10月10日 09:20" },
    INTERNATIONAL_TRANSIT: { title: "国际运输中", description: "已进入国际运输阶段。", time: "10月11日 14:05" },
    CUSTOMS_CLEARANCE: { title: "清关中", description: "正在进行清关处理。", time: "10月13日 08:40" },
    UK_LAST_MILE: { title: "英国派送中", description: "已进入英国本地派送阶段。", time: "10月14日 10:15" },
    DELIVERED: { title: "已签收", description: "已收到签收事件，本次转运完成。", time: "10月15日 16:30" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function lastFour(value) {
    return String(value).slice(-4);
  }

  function getPackage(id) {
    return packages.find((item) => item.id === id);
  }

  function getShipment(id) {
    return shipments.find((item) => item.id === id);
  }

  function packagesByStatus(status) {
    return packages.filter((item) => item.status === status);
  }

  function readyPackages() {
    return packagesByStatus("READY_FOR_SHIPMENT");
  }

  function filterPackages(filter) {
    const matches = {
      all: () => true,
      inbound: (item) => ["DECLARED", "INBOUND_TO_WAREHOUSE"].includes(item.status),
      pending: (item) => item.status === "ARRIVED_PENDING_MATCH",
      ready: (item) => item.status === "READY_FOR_SHIPMENT",
      shipped: (item) => item.status === "IN_SHIPMENT",
      exception: (item) => item.status === "EXCEPTION"
    };
    return packages.filter(matches[filter]);
  }

  function getPackageFilterCount(filter) {
    return filterPackages(filter).length;
  }

  function renderStatusChip(meta) {
    return `<span class="status-chip ${meta.kind}">${escapeHtml(meta.short || meta.title)}</span>`;
  }

  function getPageName() {
    const names = {
      home: "首页",
      packageList: "包裹",
      packageDetail: "包裹详情",
      declare: "预报包裹",
      shipmentList: "转运",
      shipmentCreate: "创建转运单",
      shipmentDetail: "转运单详情"
    };
    return names[state.view] || "首页";
  }

  function render(options = {}) {
    pageTitle.textContent = getPageName();
    const views = {
      home: renderHome,
      packageList: renderPackageList,
      packageDetail: renderPackageDetail,
      declare: renderDeclarePackage,
      shipmentList: renderShipmentList,
      shipmentCreate: renderShipmentCreate,
      shipmentDetail: renderShipmentDetail
    };
    app.innerHTML = views[state.view]();
    renderTabbar();
    if (options.preserveScroll) {
      const restoreScroll = () => window.scrollTo(0, options.scrollY || 0);
      if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restoreScroll);
      else restoreScroll();
      return;
    }
    window.scrollTo(0, 0);
  }

  function renderTabbar() {
    const active = state.view === "home" ? "home" : state.view.startsWith("package") || state.view === "declare" ? "packages" : "shipments";
    const items = [
      { key: "home", label: "首页" },
      { key: "packages", label: "包裹" },
      { key: "shipments", label: "转运" }
    ];
    tabbar.innerHTML = items
      .map(
        (item) =>
          `<button class="tab ${active === item.key ? "active" : ""}" data-action="tab" data-tab="${item.key}">${item.label}</button>`
      )
      .join("");
  }

  function renderPageHead(title, backAction) {
    return `<div class="page-head">
      ${backAction ? `<button class="back-button" aria-label="返回" data-action="${backAction}">‹</button>` : ""}
      <h1>${title}</h1>
    </div>`;
  }

  function renderHome() {
    const pendingPayment = shipments.find((item) => item.status === "AWAITING_PAYMENT");
    const packageException = packages.find((item) => item.status === "EXCEPTION");
    const currentJourney = shipments.find((item) => item.status === "INTERNATIONAL_TRANSIT");
    const ready = readyPackages().length;
    const pending = packagesByStatus("ARRIVED_PENDING_MATCH").length;
    const inbound = filterPackages("inbound").length;
    const exceptions = packagesByStatus("EXCEPTION").length;

    return `
      <section class="section">
        <div class="section-title-row">
          <h2 class="section-title">待处理事项</h2>
          <span class="section-subtitle">优先处理会阻塞下一步的问题</span>
        </div>
        ${
          packageException
            ? `<button class="summary-card clickable" data-action="view-package" data-id="${packageException.id}">
                <div class="card-top">
                  <strong>包裹需要处理</strong>
                  ${renderStatusChip(packageStatus.EXCEPTION)}
                </div>
                <p>${escapeHtml(packageException.exception.title)}：${escapeHtml(packageException.exception.action)}</p>
              </button>`
            : ""
        }
        ${
          pendingPayment
            ? `<button class="summary-card clickable" data-action="view-shipment" data-id="${pendingPayment.id}">
                <div class="card-top">
                  <strong>转运单待付款</strong>
                  ${renderStatusChip(shipmentStatus.AWAITING_PAYMENT)}
                </div>
                <p>转运单号 ${pendingPayment.reference} 的最终报价已生成，请确认并付款。</p>
              </button>`
            : `<div class="empty-state">当前没有需要立即处理的事项。</div>`
        }
      </section>

      <section class="section">
        <div class="section-title-row">
          <h2 class="section-title">当前转运</h2>
          <button class="text-button" data-action="tab" data-tab="shipments">查看转运</button>
        </div>
        ${
          currentJourney
            ? `<button class="summary-card clickable" data-action="view-shipment" data-id="${currentJourney.id}">
                <div class="card-top">
                  <strong>转运单号 ${currentJourney.reference}</strong>
                  ${renderStatusChip(shipmentStatus[currentJourney.status])}
                </div>
                <p>国际运输正在进行中。下一步：等待清关或新的运输进度。</p>
              </button>`
            : `<div class="empty-state">暂无进行中的转运单。</div>`
        }
      </section>

      <section class="section">
        <div class="section-title-row">
          <h2 class="section-title">包裹概览</h2>
          <button class="text-button" data-action="tab" data-tab="packages">查看包裹</button>
        </div>
        <div class="card">
          <div class="count-line">
            <button class="count-chip" data-action="open-filter" data-filter="inbound">待到仓 ${inbound}</button>
            <button class="count-chip" data-action="open-filter" data-filter="pending">待确认 ${pending}</button>
          </div>
          <div class="count-line">
            <button class="count-chip" data-action="open-filter" data-filter="ready">可合箱 ${ready}</button>
            <button class="count-chip" data-action="open-filter" data-filter="exception">需处理 ${exceptions}</button>
          </div>
          <div class="button-row single">
            <button class="secondary-button" data-action="open-filter" data-filter="ready">查看可合箱包裹</button>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title-row">
          <h2 class="section-title">中国仓地址</h2>
          <span class="section-subtitle">下单时填写</span>
        </div>
        <div class="card">
          <p>中国仓收件信息含个人识别信息。复制后请在国内电商平台填写。</p>
          <div class="button-row single">
            <button class="secondary-button" data-action="copy-warehouse">复制中国仓地址</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderPackageCard(item) {
    const meta = packageStatus[item.status];
    const associated = item.status === "IN_SHIPMENT" ? `<span>转运单号 ${escapeHtml(item.shipmentRef)}</span>` : "";
    const exception = item.status === "EXCEPTION" ? `<span class="disabled-reason">${escapeHtml(item.exception.title)}</span>` : "";
    return `
      <button class="package-card" data-action="view-package" data-id="${item.id}">
        <div class="card-top">
          <div class="package-main">
            <div class="primary-label">国内单号 •••• ${lastFour(item.tracking)}</div>
            <div class="secondary-label">${escapeHtml(item.summary)}</div>
          </div>
          ${renderStatusChip(meta)}
        </div>
        <div class="package-meta">
          ${item.arrival ? `<span>到仓：${escapeHtml(item.arrival)}</span>` : ""}
          ${item.weight ? `<span>重量：${escapeHtml(item.weight)}</span>` : ""}
          ${associated}
        </div>
        ${exception}
      </button>
    `;
  }

  function renderPackageList() {
    if (state.selectionMode) return renderSelectionMode();
    const filters = [
      { key: "all", label: "全部" },
      { key: "inbound", label: "待到仓" },
      { key: "pending", label: "待确认" },
      { key: "ready", label: "可合箱" },
      { key: "shipped", label: "已转运" },
      { key: "exception", label: "需处理" }
    ];
    const list = filterPackages(state.activeFilter);
    return `
      <div class="page-head">
        <h1>包裹</h1>
        <button class="text-button" data-action="declare">预报包裹</button>
      </div>
      <div class="filters">
        ${filters
          .map(
            (filter) =>
              `<button class="filter ${state.activeFilter === filter.key ? "active" : ""}" data-action="filter-packages" data-filter="${filter.key}">${filter.label} ${getPackageFilterCount(filter.key)}</button>`
          )
          .join("")}
      </div>
      <section class="section">
        <div class="section-title-row">
          <h2 class="section-title">${filters.find((item) => item.key === state.activeFilter).label}包裹</h2>
          <span class="section-subtitle">共 ${list.length} 件</span>
        </div>
        ${
          list.length
            ? list.map(renderPackageCard).join("")
            : `<div class="empty-state">该状态下暂无包裹。</div>`
        }
      </section>
      <div class="sticky-action">
        <div class="count-line">
          <span>仅“可合箱”包裹可被选择</span>
          <span>可合箱 ${readyPackages().length} 件</span>
        </div>
        <button class="primary-button" data-action="start-selection" ${readyPackages().length ? "" : "disabled"}>开始合箱</button>
      </div>
    `;
  }

  function nonSelectableReason(item) {
    if (item.status === "ARRIVED_PENDING_MATCH") return "等待仓库确认";
    if (item.status === "IN_SHIPMENT") return `已加入其他转运单（${escapeHtml(item.shipmentRef)}）`;
    if (item.status === "EXCEPTION") return "包裹存在异常";
    return "等待送往仓库";
  }

  function renderSelectionMode() {
    const selected = state.selectedPackageIds.length;
    const unselected = readyPackages().length - selected;
    return `
      ${renderPageHead("选择本次要转运的包裹", "exit-selection")}
      <div class="selection-hint">只可选择“可合箱”包裹。未选择的可合箱包裹仅提醒，不会阻止你继续创建转运单。</div>
      <section class="section selection-list">
        ${packages
          .map((item) => {
            const selectable = item.status === "READY_FOR_SHIPMENT";
            const checked = state.selectedPackageIds.includes(item.id);
            return `
              <label class="package-card ${selectable ? "" : "disabled"}">
                <input type="checkbox" data-select-package="${item.id}" ${checked ? "checked" : ""} ${selectable ? "" : "disabled"} />
                <div class="package-main">
                  <div class="card-top">
                    <div>
                      <div class="primary-label">国内单号 •••• ${lastFour(item.tracking)}</div>
                      <div class="secondary-label">${escapeHtml(item.summary)}</div>
                    </div>
                    ${renderStatusChip(packageStatus[item.status])}
                  </div>
                  ${selectable ? "" : `<div class="disabled-reason">${nonSelectableReason(item)}</div>`}
                </div>
              </label>
            `;
          })
          .join("")}
      </section>
      <div class="sticky-action">
        <div class="count-line">
          <span>已选择 ${selected} 件</span>
          <span>还有 ${unselected} 件可合箱包裹未选择</span>
        </div>
        <button class="primary-button" data-action="create-shipment" ${selected ? "" : "disabled"}>创建转运单</button>
      </div>
    `;
  }

  function renderPackageDetail() {
    const item = getPackage(state.currentPackageId);
    if (!item) return renderNotFound("未找到该包裹。", "package-list");
    const meta = packageStatus[item.status];
    const relatedShipment = item.shipmentId ? getShipment(item.shipmentId) : null;
    return `
      ${renderPageHead("包裹详情", "package-list")}
      <div class="status-hero">
        <div class="reference">国内单号 •••• ${lastFour(item.tracking)}</div>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="next-action">${
          item.status === "READY_FOR_SHIPMENT"
            ? "这件包裹已确认归属，可在“包裹”页选择加入本次转运。"
            : item.status === "ARRIVED_PENDING_MATCH"
              ? "当前无需操作。完成归属确认后才可合箱。"
              : item.status === "IN_SHIPMENT"
                ? "请查看关联转运单了解后续处理和运输状态。"
                : item.status === "EXCEPTION"
                  ? "请按下方明确指引处理；无法确认时可查看支持信息。"
                  : "当前无需操作，等待新的仓库或国内物流事件。"
        }</p>
      </div>
      ${item.status === "EXCEPTION" ? renderExceptionCard(item.exception, "package", item.id) : ""}
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">包裹信息</h2></div>
        <div class="card">
          <div class="item-row"><span>商品摘要</span><strong>${escapeHtml(item.summary)}</strong></div>
          <div class="item-row"><span>到仓信息</span><span>${escapeHtml(item.arrival || "尚未到仓")}</span></div>
          <div class="item-row"><span>重量</span><span>${escapeHtml(item.weight || "暂未记录")}</span></div>
        </div>
      </section>
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">最近状态</h2></div>
        <div class="card">
          <p>${escapeHtml(item.note || meta.title)}</p>
          <p class="timestamp">最近更新：${escapeHtml(item.arrival || "等待事件更新")}</p>
        </div>
      </section>
      ${
        relatedShipment
          ? `<section class="section"><button class="secondary-button" data-action="view-shipment" data-id="${relatedShipment.id}">查看转运单号 ${relatedShipment.reference}</button></section>`
          : ""
      }
      ${
        item.status === "EXCEPTION"
          ? `<section class="section"><button class="secondary-button" data-action="supplement-info" data-id="${item.id}">补充信息</button></section>`
          : ""
      }
    `;
  }

  function renderDeclarePackage() {
    return `
      ${renderPageHead("预报包裹", "package-list")}
      <p class="helper">填写一次最小信息，便于中国仓后续核对包裹归属。预报不代表包裹已到仓。</p>
      <form id="declare-form" class="form-card">
        <div class="form-field">
          <label for="tracking">国内快递单号 *</label>
          <input id="tracking" name="tracking" placeholder="请输入国内快递单号" autocomplete="off" />
          <div id="tracking-error" class="field-error"></div>
        </div>
        <div class="form-field">
          <label for="summary">商品描述 *</label>
          <textarea id="summary" name="summary" placeholder="例如：冬季外套 / 厨房用品"></textarea>
          <div id="summary-error" class="field-error"></div>
        </div>
        <p class="helper">商品描述用于仓库核对。订单截图在正式产品中可作为补充信息；本低保真原型使用文本模拟。</p>
        <button class="primary-button" type="submit">提交预报</button>
      </form>
    `;
  }

  function renderShipmentCreate() {
    const selectedItems = state.selectedPackageIds.map(getPackage).filter(Boolean);
    const unselected = readyPackages().filter((item) => !state.selectedPackageIds.includes(item.id));
    if (!selectedItems.length) {
      return renderNotFound("请先选择至少 1 件可合箱包裹。", "package-list");
    }
    return `
      ${renderPageHead("确认本次转运", "back-selection")}
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">已选包裹</h2><span class="section-subtitle">共 ${selectedItems.length} 件</span></div>
        <div class="card">
          <ul class="included-list">
            ${selectedItems
              .map(
                (item) =>
                  `<li><span>国内单号 •••• ${lastFour(item.tracking)} · ${escapeHtml(item.summary)}</span><button class="mini-button" data-action="request-remove" data-id="${item.id}">移除</button></li>`
              )
              .join("")}
          </ul>
        </div>
      </section>
      ${
        unselected.length
          ? `<section class="section"><div class="attention-card"><h2>还有 ${unselected.length} 件可合箱包裹未加入本次转运</h2><p>你可以本次继续提交，也可以返回调整选择。</p><button class="mini-button" data-action="back-selection">返回调整</button></div></section>`
          : ""
      }
      <form id="shipment-form" class="form-card">
        <div class="section-title-row"><h2 class="section-title">英国收货地址</h2></div>
        <div class="form-field">
          <label for="recipient">收件人 *</label>
          <input id="recipient" name="recipient" placeholder="请输入收件人姓名" />
          <div id="recipient-error" class="field-error"></div>
        </div>
        <div class="form-field">
          <label for="phone">联系电话 *</label>
          <input id="phone" name="phone" placeholder="请输入联系电话" />
          <div id="phone-error" class="field-error"></div>
        </div>
        <div class="form-field">
          <label for="postcode">邮编 *</label>
          <input id="postcode" name="postcode" placeholder="请输入英国邮编" />
          <div id="postcode-error" class="field-error"></div>
        </div>
        <div class="form-field">
          <label for="address">详细地址 *</label>
          <textarea id="address" name="address" placeholder="请输入详细地址"></textarea>
          <div id="address-error" class="field-error"></div>
        </div>
        <div class="attention-card">
          <h2>提交后</h2>
          <p>将生成本次转运单号；已选包裹将锁定至本次转运；仓库后续处理、称重并生成最终报价。</p>
        </div>
      </form>
      <div class="sticky-action"><button class="primary-button" type="submit" form="shipment-form">提交转运单</button></div>
    `;
  }

  function activeShipmentPriority(item) {
    const priority = {
      EXCEPTION: 1,
      AWAITING_PAYMENT: 2,
      SUBMITTED: 3,
      WAREHOUSE_PROCESSING: 4,
      PAID_AWAITING_DISPATCH: 5,
      DISPATCHED: 6,
      INTERNATIONAL_TRANSIT: 7,
      CUSTOMS_CLEARANCE: 8,
      UK_LAST_MILE: 9,
      DELIVERED: 20,
      CANCELLED: 21
    };
    return priority[item.status] ?? 19;
  }

  function renderShipmentCard(item) {
    const meta = shipmentStatus[item.status];
    return `
      <button class="shipment-card" data-action="view-shipment" data-id="${item.id}">
        <div class="card-top">
          <div class="shipment-main">
            <div class="primary-label">转运单号 ${escapeHtml(item.reference)}</div>
            <div class="secondary-label">包含 ${item.packageCount || item.packageIds?.length || 0} 件包裹</div>
          </div>
          ${renderStatusChip({ ...meta, short: meta.title })}
        </div>
        <div class="package-meta">
          <span>${escapeHtml(meta.next)}</span>
        </div>
      </button>
    `;
  }

  function renderShipmentList() {
    const sorted = [...shipments].sort((a, b) => activeShipmentPriority(a) - activeShipmentPriority(b));
    const ongoing = sorted.filter((item) => !["DELIVERED", "CANCELLED"].includes(item.status));
    const history = sorted.filter((item) => ["DELIVERED", "CANCELLED"].includes(item.status));
    return `
      <div class="page-head"><h1>转运</h1></div>
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">进行中的转运</h2><span class="section-subtitle">优先显示需处理事项</span></div>
        ${ongoing.length ? ongoing.map(renderShipmentCard).join("") : `<div class="empty-state">暂无进行中的转运单。</div>`}
      </section>
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">历史转运</h2></div>
        ${history.length ? history.map(renderShipmentCard).join("") : `<div class="empty-state">暂无历史转运单。</div>`}
      </section>
    `;
  }

  function renderQuote(quote) {
    if (!quote) return "";
    return `
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">最终报价</h2><span class="section-subtitle">模拟数据</span></div>
        <div class="quote-card">
          <div class="quote-row"><span>最终重量</span><strong>${escapeHtml(quote.finalWeight)}</strong></div>
          <div class="quote-row"><span>计费重量</span><strong>${escapeHtml(quote.chargeableWeight)}</strong></div>
          <div class="quote-row"><span>运费</span><span>${escapeHtml(quote.shippingFee)}</span></div>
          <div class="quote-row"><span>服务费</span><span>${escapeHtml(quote.serviceFee)}</span></div>
          <div class="quote-row total"><span>总金额</span><span>${escapeHtml(quote.total)}</span></div>
          <p class="timestamp">报价生成时间：${escapeHtml(quote.createdAt)}</p>
        </div>
      </section>
    `;
  }

  function currentTimelineStatus(item) {
    return item.status === "EXCEPTION" ? item.resumeStatus || "UK_LAST_MILE" : item.status;
  }

  function renderTimeline(item) {
    const current = currentTimelineStatus(item);
    const currentIndex = timelineOrder.indexOf(current);
    if (currentIndex < 0) return "";
    return `
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">运输进度</h2><span class="section-subtitle">模拟事件</span></div>
        <div class="card"><div class="timeline">
          ${timelineOrder
            .map((stage, index) => {
              const meta = timelineMeta[stage];
              const stageClass = index < currentIndex ? "completed" : index === currentIndex ? "current" : "";
              const description =
                index <= currentIndex
                  ? meta.description
                  : "等待新的运输事件。";
              const time = index <= currentIndex ? meta.time : "待更新";
              return `<div class="timeline-item ${stageClass}">
                <span class="timeline-dot"></span>
                <div class="timeline-title">${meta.title}</div>
                <div class="timeline-description">${description} · ${time}</div>
              </div>`;
            })
            .join("")}
        </div></div>
      </section>
    `;
  }

  function shipmentPackageLabels(item) {
    if (item.packageIds?.length) {
      return item.packageIds
        .map(getPackage)
        .filter(Boolean)
        .map((packageItem) => `国内单号 •••• ${lastFour(packageItem.tracking)} · ${escapeHtml(packageItem.summary)}`);
    }
    return item.packageLabels || [];
  }

  function renderExceptionCard(exception, type, id) {
    return `
      <section class="section">
        <div class="exception-card">
          <h2>${escapeHtml(exception.title)}</h2>
          <div class="exception-line"><strong>发生什么</strong><span>${escapeHtml(exception.happened)}</span></div>
          <div class="exception-line"><strong>影响什么</strong><span>${escapeHtml(exception.impact)}</span></div>
          <div class="exception-line"><strong>你需要做什么</strong><span>${escapeHtml(exception.action)}</span></div>
          <div class="exception-line"><strong>当前进展</strong><span>${escapeHtml(exception.progress)}</span></div>
          <div class="exception-line"><strong>需要帮助</strong><span>${escapeHtml(exception.support)}</span></div>
          <button class="mini-button" data-action="support-info" data-entity="${type}" data-id="${id}">查看支持信息</button>
        </div>
      </section>
    `;
  }

  function renderShipmentProcessing(item) {
    if (item.status !== "WAREHOUSE_PROCESSING") return "";
    return `<section class="section"><div class="attention-card"><h2>仓库正在处理</h2><p>仓库正在检查、打包和称重。最终报价生成后会显示在这里。</p><p class="small-note">当前无需操作。</p></div></section>`;
  }

  function renderPaymentAction(item) {
    if (item.status === "AWAITING_PAYMENT") {
      return `<div class="sticky-action"><button class="primary-button" data-action="pay" data-id="${item.id}">确认付款</button></div>`;
    }
    if (item.status === "PAYMENT_PROCESSING") {
      return `<section class="section"><button class="primary-button" disabled>正在确认付款结果</button></section>`;
    }
    if (item.status === "PAID_AWAITING_DISPATCH") {
      return `<section class="section"><div class="attention-card"><h2>付款已成功</h2><p>转运单目前尚未实际离开仓库，当前无需操作。</p><p>下一步：仓库确认实际出库后，才会更新为“已从仓库发出”。</p></div></section>`;
    }
    return "";
  }

  function demoActionFor(item) {
    const actions = {
      SUBMITTED: { label: "模拟仓库开始处理", target: "WAREHOUSE_PROCESSING" },
      WAREHOUSE_PROCESSING: { label: "模拟完成处理并生成报价", target: "AWAITING_PAYMENT" },
      PAID_AWAITING_DISPATCH: { label: "模拟仓库实际出库", target: "DISPATCHED" },
      DISPATCHED: { label: "模拟进入国际运输", target: "INTERNATIONAL_TRANSIT" },
      INTERNATIONAL_TRANSIT: { label: "模拟进入清关", target: "CUSTOMS_CLEARANCE" },
      CUSTOMS_CLEARANCE: { label: "模拟进入英国派送", target: "UK_LAST_MILE" },
      UK_LAST_MILE: { label: "模拟确认签收", target: "DELIVERED" },
      EXCEPTION: { label: "模拟运营处理完成", target: item.resumeStatus || "UK_LAST_MILE" }
    };
    return actions[item.status];
  }

  function renderDemoControl(item) {
    const action = demoActionFor(item);
    if (!action) return "";
    return `
      <section class="section">
        <div class="demo-control">
          <h2>原型演示控制</h2>
          <p class="helper">仅用于模拟仓库、支付或外部运输事件，不是正式用户功能。</p>
          <button class="secondary-button" data-action="advance-shipment" data-id="${item.id}" data-target="${action.target}">${action.label}</button>
        </div>
      </section>
    `;
  }

  function renderShipmentDetail() {
    const item = getShipment(state.currentShipmentId);
    if (!item) return renderNotFound("未找到该转运单。", "shipment-list");
    const meta = shipmentStatus[item.status];
    const labels = shipmentPackageLabels(item);
    const showQuote = ["AWAITING_PAYMENT", "PAYMENT_PROCESSING", "PAID_AWAITING_DISPATCH", "DISPATCHED", "INTERNATIONAL_TRANSIT", "CUSTOMS_CLEARANCE", "UK_LAST_MILE", "DELIVERED"].includes(item.status);
    return `
      ${renderPageHead("转运单详情", "shipment-list")}
      <div class="status-hero">
        <div class="reference">转运单号 ${escapeHtml(item.reference)}</div>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="next-action"><strong>下一步：</strong>${escapeHtml(meta.next)}</p>
      </div>
      ${item.status === "EXCEPTION" ? renderExceptionCard(item.exception, "shipment", item.id) : ""}
      ${renderShipmentProcessing(item)}
      ${showQuote ? renderQuote(item.quote || { finalWeight: "模拟值", chargeableWeight: "模拟值", shippingFee: "模拟值", serviceFee: "模拟值", total: "模拟值", createdAt: "等待报价生成" }) : ""}
      ${renderPaymentAction(item)}
      ${renderTimeline(item)}
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">包含的包裹</h2><span class="section-subtitle">共 ${item.packageCount || labels.length} 件</span></div>
        <div class="card"><ul class="included-list">
          ${labels.length ? labels.map((label) => `<li>${label}</li>`).join("") : `<li>包裹信息将在仓库处理后更新。</li>`}
        </ul></div>
      </section>
      <section class="section">
        <div class="section-title-row"><h2 class="section-title">英国收货地址</h2></div>
        <div class="card"><p>${escapeHtml(item.address || "地址信息待补充。")}</p></div>
      </section>
      ${renderDemoControl(item)}
    `;
  }

  function renderNotFound(message, backAction) {
    return `
      ${renderPageHead("提示", backAction)}
      <div class="empty-state">${escapeHtml(message)}</div>
    `;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function showModal(title, body, actions) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(body)}</p>
          <div class="button-row">
            ${actions
              .map(
                (action) =>
                  `<button class="${action.danger ? "danger-button" : "secondary-button"}" data-action="${action.action}" ${action.id ? `data-id="${action.id}"` : ""}>${escapeHtml(action.label)}</button>`
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function navigate(view, payload = {}) {
    state.view = view;
    state.currentPackageId = payload.packageId ?? state.currentPackageId;
    state.currentShipmentId = payload.shipmentId ?? state.currentShipmentId;
    if (view !== "packageList") state.selectionMode = false;
    render();
  }

  function createQuote() {
    return {
      finalWeight: "7.3 kg",
      chargeableWeight: "7.3 kg",
      shippingFee: "£48.00",
      serviceFee: "£4.00",
      total: "£52.00",
      createdAt: "10月16日 15:30"
    };
  }

  function advanceShipment(id, target) {
    const item = getShipment(id);
    if (!item) return;
    item.status = target;
    if (target === "AWAITING_PAYMENT" && !item.quote) item.quote = createQuote();
    if (target === "DISPATCHED") showToast("已记录仓库实际出库。");
    else if (target === "DELIVERED") showToast("已记录模拟签收事件。");
    else if (target !== "EXCEPTION") showToast("已更新模拟事件。");
    render();
  }

  function handlePackageSelection(event) {
    const checkbox = event.target.closest("[data-select-package]");
    if (!checkbox) return;
    const id = checkbox.dataset.selectPackage;
    if (checkbox.checked) {
      if (!state.selectedPackageIds.includes(id)) state.selectedPackageIds.push(id);
    } else {
      state.selectedPackageIds = state.selectedPackageIds.filter((item) => item !== id);
    }
    render({ preserveScroll: true, scrollY: window.scrollY || 0 });
  }

  function submitDeclaration(form) {
    const tracking = form.tracking.value.trim();
    const summary = form.summary.value.trim();
    document.querySelector("#tracking-error").textContent = tracking ? "" : "请填写国内快递单号。";
    document.querySelector("#summary-error").textContent = summary ? "" : "请填写商品描述。";
    if (!tracking || !summary) return;

    const existing = packages.find((item) => item.tracking.toLowerCase() === tracking.toLowerCase());
    if (existing) {
      document.querySelector("#tracking-error").textContent = "该运单号已预报，无需重复提交。";
      return;
    }

    const created = {
      id: `p${Date.now()}`,
      tracking,
      summary,
      status: "DECLARED",
      note: "已预报，等待国内包裹送往中国仓"
    };
    packages.unshift(created);
    state.currentPackageId = created.id;
    showToast("预报成功，包裹到仓后将进入确认流程。");
    navigate("packageDetail", { packageId: created.id });
  }

  function submitShipment(form) {
    const values = {
      recipient: form.recipient.value.trim(),
      phone: form.phone.value.trim(),
      postcode: form.postcode.value.trim(),
      address: form.address.value.trim()
    };
    let valid = true;
    Object.entries(values).forEach(([key, value]) => {
      const error = document.querySelector(`#${key}-error`);
      const labels = { recipient: "收件人", phone: "联系电话", postcode: "邮编", address: "详细地址" };
      error.textContent = value ? "" : `请填写${labels[key]}。`;
      if (!value) valid = false;
    });
    const selected = state.selectedPackageIds.map(getPackage).filter(Boolean);
    if (!selected.length) {
      showToast("请至少选择 1 件可合箱包裹。");
      return;
    }
    const invalid = selected.find((item) => item.status !== "READY_FOR_SHIPMENT");
    if (invalid) {
      showToast("部分包裹状态已变化，请返回调整后再提交。");
      return;
    }
    if (!valid) return;

    const reference = `ZY2026${String(shipments.length + 7).padStart(4, "0")}`;
    const created = {
      id: `s${Date.now()}`,
      reference,
      status: "SUBMITTED",
      packageIds: selected.map((item) => item.id),
      packageCount: selected.length,
      createdAt: "10月16日 14:10",
      address: `${values.recipient}，${values.postcode}，${values.address}；联系电话：${values.phone}`
    };
    selected.forEach((item) => {
      item.status = "IN_SHIPMENT";
      item.shipmentId = created.id;
      item.shipmentRef = reference;
    });
    shipments.unshift(created);
    state.selectedPackageIds = [];
    state.currentShipmentId = created.id;
    showToast("转运单已提交，等待仓库处理。");
    navigate("shipmentDetail", { shipmentId: created.id });
  }

  function handleAction(action, element) {
    const id = element.dataset.id;
    if (action === "tab") {
      if (element.dataset.tab === "home") navigate("home");
      if (element.dataset.tab === "packages") {
        state.selectionMode = false;
        navigate("packageList");
      }
      if (element.dataset.tab === "shipments") navigate("shipmentList");
    }
    if (action === "package-list") {
      state.selectionMode = false;
      navigate("packageList");
    }
    if (action === "shipment-list") navigate("shipmentList");
    if (action === "view-package") navigate("packageDetail", { packageId: id });
    if (action === "view-shipment") navigate("shipmentDetail", { shipmentId: id });
    if (action === "declare") navigate("declare");
    if (action === "filter-packages") {
      state.activeFilter = element.dataset.filter;
      state.selectionMode = false;
      navigate("packageList");
    }
    if (action === "open-filter") {
      state.activeFilter = element.dataset.filter;
      state.selectionMode = false;
      navigate("packageList");
    }
    if (action === "start-selection") {
      state.activeFilter = "ready";
      state.selectedPackageIds = [];
      state.selectionMode = true;
      navigate("packageList");
    }
    if (action === "exit-selection") {
      state.selectionMode = false;
      navigate("packageList");
    }
    if (action === "back-selection") {
      state.selectionMode = true;
      navigate("packageList");
    }
    if (action === "create-shipment") {
      if (!state.selectedPackageIds.length) {
        showToast("请至少选择 1 件可合箱包裹。");
        return;
      }
      navigate("shipmentCreate");
    }
    if (action === "request-remove") {
      showModal("移除已选包裹？", "该包裹不会出现在本次转运单中。", [
        { label: "取消", action: "close-modal" },
        { label: "移除", action: "confirm-remove", id, danger: true }
      ]);
    }
    if (action === "confirm-remove") {
      state.selectedPackageIds = state.selectedPackageIds.filter((item) => item !== id);
      closeModal();
      navigate("shipmentCreate");
    }
    if (action === "copy-warehouse") {
      const text = "中国仓收件人：中英集运用户；识别编号：UK-0001；电话：13800000000；地址：示例中国仓地址";
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
      showToast("已复制。下单后请返回预报包裹。");
    }
    if (action === "pay") {
      const item = getShipment(id);
      if (!item || state.paymentPending) return;
      state.paymentPending = true;
      item.status = "PAYMENT_PROCESSING";
      render();
      setTimeout(() => {
        item.status = "PAID_AWAITING_DISPATCH";
        state.paymentPending = false;
        showToast("付款成功，等待仓库发出。");
        render();
      }, 700);
    }
    if (action === "advance-shipment") advanceShipment(id, element.dataset.target);
    if (action === "support-info") {
      const item = element.dataset.entity === "package" ? getPackage(id) : getShipment(id);
      showModal("支持信息", item?.exception?.support || "请提供关联单号和当前问题说明。", [{ label: "知道了", action: "close-modal" }]);
    }
    if (action === "supplement-info") {
      showModal("补充信息", "请核对国内快递单号并补充商品信息。提交后将进入核实，不会立即解除问题。", [{ label: "知道了", action: "close-modal" }]);
    }
    if (action === "close-modal") closeModal();
  }

  app.addEventListener("click", (event) => {
    const element = event.target.closest("[data-action]");
    if (element) handleAction(element.dataset.action, element);
  });

  tabbar.addEventListener("click", (event) => {
    const element = event.target.closest("[data-action]");
    if (element) handleAction(element.dataset.action, element);
  });

  modalRoot.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }
    const element = event.target.closest("[data-action]");
    if (element) handleAction(element.dataset.action, element);
  });

  app.addEventListener("change", handlePackageSelection);

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.id === "declare-form") submitDeclaration(event.target);
    if (event.target.id === "shipment-form") submitShipment(event.target);
  });

  render();
})();
