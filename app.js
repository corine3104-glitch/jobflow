const STORAGE_KEY = "jobflow-data-v1";

const defaultData = {
  applications: [
    {
      id: crypto.randomUUID(),
      company: "ABC科技",
      position: "社内SE",
      department: "IT",
      jobType: "社内SE",
      channel: "LinkedIn",
      jdLink: "https://example.com/jd/abc",
      applyDate: "2026-03-01",
      stage: "一面",
      contact: "田中先生",
      contactInfo: "tanaka@example.com",
      nextActionDate: "2026-03-12",
      note: "准备网络故障处理案例"
    }
  ],
  materials: [
    {
      id: crypto.randomUUID(),
      name: "履历书-IT方向",
      type: "履历书",
      version: "v1.2",
      suitableRole: "社内SE / IT事务",
      modifiedDate: "2026-02-28",
      usedCompanies: "ABC科技, XYZ咨询",
      note: "突出项目管理经历"
    }
  ],
  interviews: [
    {
      id: crypto.randomUUID(),
      company: "ABC科技",
      position: "社内SE",
      round: "一面",
      date: "2026-03-14",
      mode: "线上",
      interviewer: "佐藤",
      questions: "请描述你处理故障的流程",
      review: "结构清晰但案例不够量化",
      result: "待定",
      nextStep: "补充量化成果"
    }
  ]
};

let state = loadData();
let currentForm = null;
let editingId = null;

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function init() {
  bindNavigation();
  bindFilters();
  bindDialog();
  bindActions();
  renderAll();
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((n) => n.classList.remove("active"));
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.page).classList.add("active");
    });
  });
}

function bindFilters() {
  ["searchInput", "filterCompany", "filterType", "filterStage", "filterChannel"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderApplications);
  });
}

function bindActions() {
  document.getElementById("addApplicationBtn").addEventListener("click", () => openForm("applications"));
  document.getElementById("addMaterialBtn").addEventListener("click", () => openForm("materials"));
  document.getElementById("addInterviewBtn").addEventListener("click", () => openForm("interviews"));
}

function bindDialog() {
  const dialog = document.getElementById("recordDialog");
  document.getElementById("cancelBtn").addEventListener("click", () => dialog.close());
  document.getElementById("recordForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = collectFormValues();
    if (editingId) {
      const row = state[currentForm].find((x) => x.id === editingId);
      Object.assign(row, payload);
    } else {
      state[currentForm].push({ id: crypto.randomUUID(), ...payload });
    }
    saveData();
    dialog.close();
    renderAll();
  });
}

function renderAll() {
  renderDashboard();
  renderApplications();
  renderMaterials();
  renderInterviews();
  renderAnalytics();
}

function renderDashboard() {
  const total = state.applications.length;
  const docPass = state.applications.filter((a) => ["一面", "二面", "最终面", "Offer"].includes(a.stage)).length;
  const interviewCount = state.interviews.length;
  const offerCount = state.applications.filter((a) => a.stage === "Offer").length;

  const cards = [
    ["投递总数", total],
    ["书类通过率", total ? `${Math.round((docPass / total) * 100)}%` : "0%"],
    ["面试数量", interviewCount],
    ["Offer数量", offerCount]
  ];

  document.getElementById("statsCards").innerHTML = cards
    .map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join("");

  const today = new Date();
  const weekLater = new Date();
  weekLater.setDate(today.getDate() + 7);

  const todo = state.applications
    .filter((a) => a.nextActionDate && new Date(a.nextActionDate) <= weekLater)
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));

  document.getElementById("todoList").innerHTML = todo.length
    ? todo.map((a) => `<li>${a.nextActionDate} · ${a.company} / ${a.position}（${a.stage}）</li>`).join("")
    : "<li>暂无待办</li>";

  const upcoming = state.interviews
    .filter((i) => i.date && new Date(i.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  document.getElementById("upcomingList").innerHTML = upcoming.length
    ? upcoming.map((i) => `<li>${i.date} · ${i.company} ${i.round}（${i.mode}）</li>`).join("")
    : "<li>暂无即将面试</li>";

  const recent = [...state.applications].sort((a, b) => b.applyDate.localeCompare(a.applyDate)).slice(0, 5);
  document.getElementById("recentApplications").innerHTML = recent.length
    ? recent.map((a) => `<li>${a.applyDate} · ${a.company} / ${a.position}（${a.channel}）</li>`).join("")
    : "<li>暂无记录</li>";
}

function renderApplications() {
  const q = (id) => document.getElementById(id).value.trim().toLowerCase();
  const search = q("searchInput");
  const company = q("filterCompany");
  const type = q("filterType");
  const stage = q("filterStage");
  const channel = q("filterChannel");

  const rows = state.applications.filter((a) => {
    const hitSearch = !search || `${a.company} ${a.position}`.toLowerCase().includes(search);
    const hitCompany = !company || a.company.toLowerCase().includes(company);
    const hitType = !type || a.jobType.toLowerCase() === type;
    const hitStage = !stage || a.stage.toLowerCase() === stage;
    const hitChannel = !channel || a.channel.toLowerCase().includes(channel);
    return hitSearch && hitCompany && hitType && hitStage && hitChannel;
  });

  document.getElementById("applicationTableBody").innerHTML = rows
    .map(
      (a) => `
    <tr>
      <td>${a.company}</td><td>${a.position}</td><td>${a.jobType}</td><td>${a.applyDate}</td><td>${a.stage}</td><td>${a.nextActionDate || "-"}</td>
      <td>
        <button onclick="showDetail('${a.id}')">详情</button>
        <button onclick="editRecord('applications','${a.id}')">编辑</button>
        <button onclick="deleteRecord('applications','${a.id}')">删除</button>
      </td>
    </tr>`
    )
    .join("");
}

window.showDetail = (id) => {
  const app = state.applications.find((a) => a.id === id);
  const materials = state.materials.filter((m) => (m.usedCompanies || "").includes(app.company));
  const interviews = state.interviews.filter((i) => i.company === app.company && i.position === app.position);
  const box = document.getElementById("applicationDetail");
  box.classList.remove("hidden");
  box.innerHTML = `
    <h3>投递详情：${app.company} / ${app.position}</h3>
    <p><b>部门：</b>${app.department || "-"} | <b>渠道：</b>${app.channel} | <b>联系人：</b>${app.contact || "-"} (${app.contactInfo || "-"})</p>
    <p><b>JD：</b><a href="${app.jdLink}" target="_blank">${app.jdLink || "-"}</a></p>
    <p><b>备注：</b>${app.note || "-"}</p>
    <h4>使用材料版本</h4>
    <ul class="list">${materials.length ? materials.map((m) => `<li>${m.name} (${m.version})</li>`).join("") : "<li>无</li>"}</ul>
    <h4>面试记录</h4>
    <ul class="list">${interviews.length ? interviews.map((i) => `<li>${i.date} ${i.round} - ${i.result}</li>`).join("") : "<li>无</li>"}</ul>
  `;
};

function renderMaterials() {
  document.getElementById("materialTableBody").innerHTML = state.materials
    .map(
      (m) => `
    <tr>
      <td>${m.name}</td><td>${m.type}</td><td>${m.version}</td><td>${m.suitableRole || "-"}</td><td>${m.modifiedDate || "-"}</td><td>${m.usedCompanies || "-"}</td>
      <td><button onclick="editRecord('materials','${m.id}')">编辑</button><button onclick="deleteRecord('materials','${m.id}')">删除</button></td>
    </tr>`
    )
    .join("");
}

function renderInterviews() {
  document.getElementById("interviewTableBody").innerHTML = state.interviews
    .map(
      (i) => `
    <tr>
      <td>${i.company}</td><td>${i.position}</td><td>${i.round}</td><td>${i.date}</td><td>${i.mode}</td><td>${i.result || "-"}</td>
      <td><button onclick="editRecord('interviews','${i.id}')">编辑</button><button onclick="deleteRecord('interviews','${i.id}')">删除</button></td>
    </tr>`
    )
    .join("");
}

function renderAnalytics() {
  const total = state.applications.length;
  const interviews = state.interviews.length;
  const offers = state.applications.filter((a) => a.stage === "Offer").length;
  const passRate = total ? Math.round((offers / total) * 100) : 0;

  document.getElementById("analyticsSummary").innerHTML = `
    <li>投递数量：${total}</li>
    <li>面试数量：${interviews}</li>
    <li>Offer数量：${offers}</li>
    <li>整体通过率：${passRate}%</li>
  `;

  const grouped = state.applications.reduce((acc, a) => {
    if (!acc[a.jobType]) acc[a.jobType] = { total: 0, passed: 0 };
    acc[a.jobType].total += 1;
    if (["一面", "二面", "最终面", "Offer"].includes(a.stage)) acc[a.jobType].passed += 1;
    return acc;
  }, {});

  document.getElementById("typeBars").innerHTML = Object.entries(grouped)
    .map(([type, stat]) => {
      const rate = Math.round((stat.passed / stat.total) * 100);
      return `<div class="bar"><div>${type}：${rate}% (${stat.passed}/${stat.total})</div><div class="bar-track"><div class="bar-fill" style="width:${rate}%"></div></div></div>`;
    })
    .join("") || "暂无数据";
}

window.deleteRecord = (kind, id) => {
  if (!confirm("确定删除？")) return;
  state[kind] = state[kind].filter((x) => x.id !== id);
  saveData();
  renderAll();
};

window.editRecord = (kind, id) => {
  openForm(kind, state[kind].find((x) => x.id === id));
};

function openForm(kind, data = null) {
  currentForm = kind;
  editingId = data?.id || null;
  const fields = getSchema(kind);
  document.getElementById("dialogTitle").textContent = `${data ? "编辑" : "新增"}${kindLabel(kind)}`;
  document.getElementById("formFields").innerHTML = fields
    .map((f) => {
      const value = data?.[f.name] ?? "";
      const cls = f.full ? "full" : "";
      if (f.type === "textarea") {
        return `<div class="${cls}"><label>${f.label}</label><textarea name="${f.name}" rows="3">${value}</textarea></div>`;
      }
      return `<div class="${cls}"><label>${f.label}</label><input type="${f.type || "text"}" name="${f.name}" value="${value}" /></div>`;
    })
    .join("");
  document.getElementById("recordDialog").showModal();
}

function collectFormValues() {
  const payload = {};
  const fd = new FormData(document.getElementById("recordForm"));
  for (const [k, v] of fd.entries()) payload[k] = String(v).trim();
  return payload;
}

function kindLabel(kind) {
  return { applications: "投递", materials: "材料", interviews: "面试" }[kind];
}

function getSchema(kind) {
  const schemas = {
    applications: [
      { name: "company", label: "公司名" },
      { name: "position", label: "职位名" },
      { name: "department", label: "部门" },
      { name: "jobType", label: "岗位类型" },
      { name: "channel", label: "招聘渠道" },
      { name: "jdLink", label: "JD链接" },
      { name: "applyDate", label: "投递日期", type: "date" },
      { name: "stage", label: "当前阶段" },
      { name: "contact", label: "联系人" },
      { name: "contactInfo", label: "联系方式" },
      { name: "nextActionDate", label: "下次行动日期", type: "date" },
      { name: "note", label: "备注", type: "textarea", full: true }
    ],
    materials: [
      { name: "name", label: "材料名称" },
      { name: "type", label: "材料类型" },
      { name: "version", label: "版本号" },
      { name: "suitableRole", label: "适用岗位" },
      { name: "modifiedDate", label: "最后修改日期", type: "date" },
      { name: "usedCompanies", label: "使用过的公司" },
      { name: "note", label: "备注", type: "textarea", full: true }
    ],
    interviews: [
      { name: "company", label: "公司" },
      { name: "position", label: "岗位" },
      { name: "round", label: "面试轮次" },
      { name: "date", label: "面试日期", type: "date" },
      { name: "mode", label: "面试形式" },
      { name: "interviewer", label: "面试官" },
      { name: "questions", label: "面试问题", type: "textarea", full: true },
      { name: "review", label: "回答复盘", type: "textarea", full: true },
      { name: "result", label: "面试结果" },
      { name: "nextStep", label: "下一步行动" }
    ]
  };
  return schemas[kind];
}

init();
