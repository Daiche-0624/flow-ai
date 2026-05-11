"use client"
import { useState, useEffect, useCallback } from "react";

// ─── Types & Initial Data ────────────────────────────────────────────────────

const INITIAL_STAFF = [
  { id: "s1", name: "田中", role: "調理", skills: ["調理", "ホール"], status: "active" },
  { id: "s2", name: "佐藤", role: "バリスタ", skills: ["バリスタ", "レジ"], status: "active" },
  { id: "s3", name: "鈴木", role: "ホール", skills: ["ホール", "接客"], status: "active" },
  { id: "s4", name: "山田", role: "レジ", skills: ["レジ", "ホール"], status: "break" },
  { id: "s5", name: "伊藤", role: "ホール", skills: ["ホール", "バリスタ", "レジ"], status: "active" },
];

const INITIAL_TASKS = [
  { id: "t1", title: "ドリンク注文 #34", category: "ドリンク", priority: "high", status: "pending", assignedTo: null, delay: 3, createdAt: Date.now() - 480000 },
  { id: "t2", title: "フード提供 #29", category: "フード", priority: "high", status: "in_progress", assignedTo: "s1", delay: 0, createdAt: Date.now() - 720000 },
  { id: "t3", title: "テーブル清掃 #7", category: "清掃", priority: "medium", status: "pending", assignedTo: "s3", delay: 0, createdAt: Date.now() - 180000 },
  { id: "t4", title: "レジ精算 #12", category: "レジ", priority: "medium", status: "pending", assignedTo: null, delay: 2, createdAt: Date.now() - 300000 },
  { id: "t5", title: "ドリンク注文 #35", category: "ドリンク", priority: "low", status: "pending", assignedTo: null, delay: 0, createdAt: Date.now() - 60000 },
];

const CATEGORY_ICON = { ドリンク: "☕", フード: "🍽", 清掃: "🧹", レジ: "🧾", 接客: "🤝", その他: "📋" };
const ROLES = ["バリスタ", "調理", "ホール", "レジ", "マネージャー"];
const CATEGORIES = ["ドリンク", "フード", "清掃", "レジ", "接客", "その他"];

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildPrompt(staff, tasks) {
  const activeStaff = staff.filter(s => s.status !== "off");
  const pendingTasks = tasks.filter(t => t.status !== "done");
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sorted = [...pendingTasks].sort((a, b) => {
    const delayDiff = b.delay - a.delay;
    if (delayDiff !== 0) return delayDiff;
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return `あなたはカフェの現場マネージャーを支援するAIアシスタントです。
以下の現在の状況を分析し、最適なタスク配分を提案してください。

## スタッフ状況
${activeStaff.map(s => `- ${s.name}（メイン役割: ${s.role}、対応可能スキル: ${s.skills.join("・")}、状態: ${s.status === "active" ? "稼働中" : "休憩中"}）`).join("\n")}

## 対応が必要なタスク（優先度順）
${sorted.map(t => `- [${t.id}] ${t.title}（カテゴリ: ${t.category}、優先度: ${t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}、遅延: ${t.delay}分、現担当: ${t.assignedTo ? activeStaff.find(s => s.id === t.assignedTo)?.name ?? "不明" : "未割当"}）`).join("\n")}

## 配分ルール
1. スタッフのスキルに合ったタスクのみ割り当てる
2. 休憩中のスタッフは割り当て対象外
3. 1スタッフに同時3件以上は割り当てない
4. 遅延中・未割当の高優先タスクを最優先で解消する
5. 負荷をできるだけ均等に分散する

## 出力形式（JSONのみ・他のテキスト不要）
{"assignments":[{"taskId":"タスクID","staffId":"スタッフID","reason":"日本語で20字以内の理由"}],"summary":"変更内容の要約を1〜2文で"}`;
}

// ─── API Call ────────────────────────────────────────────────────────────────

async function callClaudeAPI(staff: any[], tasks: any[]) {
  const response = await fetch('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff, tasks }),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Badge({ type, children }) {
  const styles = {
    red: { background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" },
    amber: { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" },
    green: { background: "#D1FAE5", color: "#065F46", border: "1px solid #A7F3D0" },
    blue: { background: "#DBEAFE", color: "#1E40AF", border: "1px solid #BFDBFE" },
    gray: { background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
  };
  return (
    <span style={{ ...styles[type], fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 500, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, type = "default" }) {
  const color = type === "danger" ? "#DC2626" : type === "success" ? "#059669" : type === "warning" ? "#D97706" : "#111827";
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", flex: 1 }}>
      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function TaskCard({ task, staff, highlight, onCycle }) {
  const assignee = staff.find(s => s.id === task.assignedTo);
  const isDelayed = task.delay > 0;
  const isHighlight = highlight === task.id;

  const borderColor = isHighlight ? "#3B82F6" : isDelayed ? "#FCA5A5" : "#E5E7EB";
  const bg = isHighlight ? "#EFF6FF" : isDelayed ? "#FFF5F5" : "#fff";

  return (
    <div
      onClick={() => onCycle(task.id)}
      style={{
        border: `1.5px solid ${borderColor}`, borderRadius: 10, padding: "10px 12px",
        marginBottom: 6, cursor: "pointer", background: bg,
        transition: "all 0.15s", userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: isDelayed ? "#DC2626" : isHighlight ? "#1D4ED8" : "#111827" }}>
          {CATEGORY_ICON[task.category]} {task.title}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {task.priority === "high" && <Badge type="red">高</Badge>}
          {task.priority === "medium" && <Badge type="amber">中</Badge>}
          {task.priority === "low" && <Badge type="gray">低</Badge>}
          {isDelayed && <Badge type="red">+{task.delay}分遅延</Badge>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#6B7280" }}>
          担当: {assignee ? assignee.name : "未割当"}
        </span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>
          {task.status === "pending" ? "待機中" : task.status === "in_progress" ? "進行中" : "完了"}
        </span>
      </div>
    </div>
  );
}

function StaffCard({ member, highlight, onToggle }) {
  const isHighlight = highlight === member.id;
  const statusColors = {
    active: { border: "#86EFAC", bg: "#F0FDF4", dot: "#16A34A" },
    break: { border: "#D1D5DB", bg: "#F9FAFB", dot: "#9CA3AF" },
  };
  const colors = statusColors[member.status] || statusColors.break;

  return (
    <div
      onClick={() => onToggle(member.id)}
      style={{
        border: `1.5px solid ${isHighlight ? "#3B82F6" : colors.border}`,
        background: isHighlight ? "#EFF6FF" : colors.bg,
        borderRadius: 10, padding: "10px 8px", textAlign: "center",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
        opacity: member.status === "break" ? 0.75 : 1,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13,
        background: isHighlight ? "#BFDBFE" : member.status === "active" ? "#BBF7D0" : "#E5E7EB",
        color: isHighlight ? "#1E40AF" : member.status === "active" ? "#14532D" : "#6B7280",
      }}>
        {member.name[0]}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{member.name}</div>
      <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 5 }}>{member.role}</div>
      {member.status === "active"
        ? <Badge type="green">稼働中</Badge>
        : <Badge type="gray">休憩中</Badge>}
    </div>
  );
}

function AISuggestionPanel({ suggestion, staff, tasks, onAccept, onReject }) {
  if (!suggestion) return null;

  return (
    <div style={{
      border: "2px solid #3B82F6", borderRadius: 14, overflow: "hidden",
      marginBottom: 12, background: "#fff",
      boxShadow: "0 4px 24px rgba(59,130,246,0.12)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid #DBEAFE", background: "#EFF6FF",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>AI 最適化提案</span>
        </div>
        <Badge type="blue">今すぐ対応推奨</Badge>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{
          background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8,
          padding: "10px 12px", fontSize: 12, color: "#0C4A6E", lineHeight: 1.7, marginBottom: 12,
        }}>
          {suggestion.summary}
        </div>

        {suggestion.assignments.map((a, i) => {
          const task = tasks.find(t => t.id === a.taskId);
          const member = staff.find(s => s.id === a.staffId);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 6,
              fontSize: 11,
            }}>
              <Badge type="blue">{member?.name ?? "?"}</Badge>
              <span style={{ color: "#94A3B8" }}>→</span>
              <Badge type="amber">{task?.title ?? "?"}</Badge>
              <span style={{ color: "#64748B", marginLeft: "auto", textAlign: "right" }}>{a.reason}</span>
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button
            onClick={onAccept}
            style={{
              padding: "9px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
              background: "#059669", color: "#fff", border: "none", transition: "background 0.15s",
            }}
            onMouseOver={e => e.target.style.background = "#047857"}
            onMouseOut={e => e.target.style.background = "#059669"}
          >
            ✓ 承認して適用
          </button>
          <button
            onClick={onReject}
            style={{
              padding: "9px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
              background: "#fff", color: "#6B7280", border: "1px solid #D1D5DB", transition: "background 0.15s",
            }}
            onMouseOver={e => e.target.style.background = "#F9FAFB"}
            onMouseOut={e => e.target.style.background = "#fff"}
          >
            ✕ 却下
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ドリンク");
  const [priority, setPriority] = useState("medium");

  const inputStyle = {
    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8,
    border: "1px solid #D1D5DB", outline: "none", background: "#fff",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24, width: 320,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>タスクを追加</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>タスク名</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: ドリンク注文 #36" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>カテゴリ</div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>優先度</div>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
            <option value="high">高 — 今すぐ対応が必要</option>
            <option value="medium">中 — 近いうちに対応</option>
            <option value="low">低 — 余裕があるときに</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => { if (title.trim()) { onAdd({ title: title.trim(), category, priority }); onClose(); } }}
            style={{ padding: 10, fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "#111827", color: "#fff", cursor: "pointer" }}
          >
            追加する
          </button>
          <button
            onClick={onClose}
            style={{ padding: 10, fontSize: 12, borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function AddStaffModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("ホール");

  const inputStyle = {
    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8,
    border: "1px solid #D1D5DB", outline: "none", background: "#fff", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>スタッフを追加</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>名前</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 中村" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>役割</div>
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => { if (name.trim()) { onAdd({ name: name.trim(), role }); onClose(); } }}
            style={{ padding: 10, fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "#111827", color: "#fff", cursor: "pointer" }}
          >
            追加する
          </button>
          <button
            onClick={onClose}
            style={{ padding: 10, fontSize: 12, borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function FlowAI() {
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [highlightStaff, setHighlightStaff] = useState(null);
  const [highlightTask, setHighlightTask] = useState(null);
  const [doneCount, setDoneCount] = useState(14);
  const [modal, setModal] = useState(null); // "addTask" | "addStaff" | null
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "history"

  // ── Metrics ──
  const activeTasks = tasks.filter(t => t.status !== "done");
  const delayedTasks = tasks.filter(t => t.delay > 0 && t.status !== "done");
  const activeStaffCount = staff.filter(s => s.status === "active").length;
  const isBusy = delayedTasks.length >= 2;

  // ── Task actions ──
  const cycleTaskStatus = useCallback((id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = { pending: "in_progress", in_progress: "done", done: "pending" };
      const newStatus = next[t.status];
      if (newStatus === "done") setDoneCount(c => c + 1);
      return { ...t, status: newStatus, delay: newStatus === "done" ? 0 : t.delay };
    }));
  }, []);

  const addTask = useCallback(({ title, category, priority }) => {
    setTasks(prev => [...prev, {
      id: `t${Date.now()}`, title, category, priority,
      status: "pending", assignedTo: null, delay: 0, createdAt: Date.now(),
    }]);
  }, []);

  // ── Staff actions ──
  const toggleStaffStatus = useCallback((id) => {
    setStaff(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, status: s.status === "active" ? "break" : "active" };
    }));
  }, []);

  const addStaff = useCallback(({ name, role }) => {
    setStaff(prev => [...prev, {
      id: `s${Date.now()}`, name, role,
      skills: [role], status: "active",
    }]);
  }, []);

  // ── AI ──
  const requestAI = useCallback(async () => {
    setIsLoadingAI(true);
    setAiError(null);
    setActiveSuggestion(null);
    setHighlightStaff(null);
    setHighlightTask(null);

    try {
      const result = await callClaudeAPI(staff, tasks);
      const suggestion = {
        id: `sg${Date.now()}`,
        assignments: result.assignments,
        summary: result.summary,
        createdAt: Date.now(),
        status: "pending",
      };
      setActiveSuggestion(suggestion);
      if (result.assignments.length > 0) {
        setHighlightStaff(result.assignments[0].staffId);
        setHighlightTask(result.assignments[0].taskId);
      }
    } catch (err) {
      setAiError("AI提案の取得に失敗しました。APIキーをご確認ください。");
    } finally {
      setIsLoadingAI(false);
    }
  }, [staff, tasks]);

  const acceptSuggestion = useCallback(() => {
    if (!activeSuggestion) return;
    setTasks(prev => prev.map(task => {
      const change = activeSuggestion.assignments.find(a => a.taskId === task.id);
      if (!change) return task;
      return { ...task, assignedTo: change.staffId, status: "in_progress", delay: 0 };
    }));
    setSuggestions(prev => [{ ...activeSuggestion, status: "accepted" }, ...prev]);
    setActiveSuggestion(null);
    setHighlightStaff(null);
    setHighlightTask(null);
  }, [activeSuggestion]);

  const rejectSuggestion = useCallback(() => {
    if (!activeSuggestion) return;
    setSuggestions(prev => [{ ...activeSuggestion, status: "rejected" }, ...prev]);
    setActiveSuggestion(null);
    setHighlightStaff(null);
    setHighlightTask(null);
  }, [activeSuggestion]);

  // ── Styles ──
  const btnStyle = {
    padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8,
    cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: 5,
    transition: "all 0.15s",
  };

  const panelStyle = {
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden",
  };

  const tabStyle = (active) => ({
    padding: "6px 16px", fontSize: 12, fontWeight: active ? 600 : 400,
    borderRadius: 8, cursor: "pointer", border: "none",
    background: active ? "#111827" : "transparent",
    color: active ? "#fff" : "#6B7280",
    transition: "all 0.15s",
  });

  return (
    <div style={{ fontFamily: "'DM Sans', 'Hiragino Sans', sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#111827" }}>

     {/* ── Header ── */}
<div style={{
  background: "#fff", borderBottom: "1px solid #E5E7EB",
  padding: "10px 16px", display: "flex", alignItems: "center", 
  justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30,
  flexWrap: "wrap", gap: 8,
}}>
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>FlowAI</div>
    {isBusy && (
      <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600, border: "1px solid #FECACA" }}>
        ⚡ 混雑中
      </span>
    )}
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
    <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 10, padding: 3 }}>
      <button style={tabStyle(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>ダッシュボード</button>
      <button style={tabStyle(activeTab === "history")} onClick={() => setActiveTab("history")}>履歴 {suggestions.length > 0 && `(${suggestions.length})`}</button>
    </div>
    <button
      onClick={requestAI}
      disabled={isLoadingAI}
      style={{
        ...btnStyle,
        background: isLoadingAI ? "#E5E7EB" : "#111827",
        color: isLoadingAI ? "#9CA3AF" : "#fff",
        cursor: isLoadingAI ? "not-allowed" : "pointer",
        fontSize: 11,
      }}
    >
      {isLoadingAI ? <>◌ 分析中...</> : <>✦ AI最適化</>}
    </button>
  </div>
</div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>

        {/* ── Metrics ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <MetricCard label="アクティブタスク" value={activeTasks.length} />
          <MetricCard label="稼働スタッフ" value={activeStaffCount} type="success" />
          <MetricCard label="遅延タスク" value={delayedTasks.length} type={delayedTasks.length > 0 ? "danger" : "default"} />
          <MetricCard label="本日完了" value={doneCount} />
        </div>

        {/* ── AI Error ── */}
        {aiError && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
            padding: "12px 16px", marginBottom: 12, fontSize: 12, color: "#991B1B",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            {aiError}
            <button onClick={() => setAiError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* ── AI Loading ── */}
        {isLoadingAI && (
          <div style={{
            border: "2px solid #93C5FD", borderRadius: 14, padding: 16, marginBottom: 12,
            background: "#EFF6FF", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ fontSize: 20 }}>✦</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", marginBottom: 2 }}>AI が現場を分析中...</div>
              <div style={{ fontSize: 11, color: "#3B82F6" }}>スタッフのスキルとタスクの優先度を照合しています</div>
            </div>
          </div>
        )}

        {/* ── AI Suggestion ── */}
        {activeSuggestion && !isLoadingAI && (
          <AISuggestionPanel
            suggestion={activeSuggestion}
            staff={staff}
            tasks={tasks}
            onAccept={acceptSuggestion}
            onReject={rejectSuggestion}
          />
        )}

        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>

            {/* ── Task Board ── */}
            <div style={panelStyle}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderBottom: "1px solid #F3F4F6",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>タスクボード</span>
                <button
                  onClick={() => setModal("addTask")}
                  style={{ ...btnStyle, background: "#F3F4F6", color: "#374151", padding: "5px 12px" }}
                >
                  + 追加
                </button>
              </div>
              <div style={{ padding: "12px 14px", maxHeight: 400, overflowY: "auto" }}>
                {activeTasks.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, padding: "24px 0" }}>
                    タスクがありません 🎉
                  </div>
                ) : (
                  activeTasks.map(t => (
                    <TaskCard key={t.id} task={t} staff={staff} highlight={highlightTask} onCycle={cycleTaskStatus} />
                  ))
                )}
                <div style={{ fontSize: 10, color: "#D1D5DB", textAlign: "center", marginTop: 6 }}>
                  タップでステータス変更
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Staff Grid */}
              <div style={panelStyle}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderBottom: "1px solid #F3F4F6",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>スタッフ稼働状況</span>
                  <button
                    onClick={() => setModal("addStaff")}
                    style={{ ...btnStyle, background: "#F3F4F6", color: "#374151", padding: "5px 12px" }}
                  >
                    + 追加
                  </button>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {staff.map(m => (
                      <StaffCard key={m.id} member={m} highlight={highlightStaff} onToggle={toggleStaffStatus} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "#D1D5DB", textAlign: "center", marginTop: 8 }}>
                    タップで稼働 ↔ 休憩を切り替え
                  </div>
                </div>
              </div>

              {/* Mini history */}
              <div style={panelStyle}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>最近の提案</span>
                </div>
                <div>
                  {suggestions.length === 0 ? (
                    <div style={{ padding: "16px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
                      まだ提案はありません
                    </div>
                  ) : (
                    suggestions.slice(0, 4).map(sg => (
                      <div key={sg.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                        borderBottom: "1px solid #F9FAFB", fontSize: 11,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: sg.status === "accepted" ? "#059669" : "#9CA3AF",
                          flexShrink: 0,
                        }} />
                        <span style={{ flex: 1, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sg.summary}
                        </span>
                        {sg.status === "accepted"
                          ? <Badge type="green">承認</Badge>
                          : <Badge type="gray">却下</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div style={panelStyle}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>AI提案履歴</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>過去のAI最適化提案と結果の一覧</div>
            </div>
            {suggestions.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                まだ提案がありません。<br />
                <span style={{ fontSize: 12 }}>「AI最適化を実行」ボタンを押して最初の提案を取得してください。</span>
              </div>
            ) : (
              suggestions.map((sg, i) => (
                <div key={sg.id} style={{
                  padding: "16px 20px", borderBottom: i < suggestions.length - 1 ? "1px solid #F3F4F6" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 3 }}>{sg.summary}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {new Date(sg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {sg.status === "accepted" ? <Badge type="green">承認</Badge> : <Badge type="gray">却下</Badge>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {sg.assignments.map((a, j) => {
                      const member = staff.find(s => s.id === a.staffId);
                      const task = tasks.find(t => t.id === a.taskId);
                      return (
                        <span key={j} style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 99,
                          background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB",
                        }}>
                          {member?.name} → {task?.title ?? a.taskId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === "addTask" && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} />}
      {modal === "addStaff" && <AddStaffModal onClose={() => setModal(null)} onAdd={addStaff} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }
      `}</style>
    </div>
  );
}
