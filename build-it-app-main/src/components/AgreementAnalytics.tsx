import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Clock, CheckCircle2, PenLine, AlertTriangle, Users, TrendingUp, Activity } from "lucide-react";

interface KPIData {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: string;
  trendPositive?: boolean;
}

interface ChartData {
  title: string;
  subtitle: string;
  data: any[];
  dataKey: string;
  unit?: string;
  color: string;
}

const EXEC_TIME_DATA = [
  { month: "Aug", days: 14 }, { month: "Sep", days: 11 }, { month: "Oct", days: 8 },
  { month: "Nov", days: 12 }, { month: "Dec", days: 6 }, { month: "Jan", days: 9 }, { month: "Feb", days: 5 },
];
const COMPLETION_DATA = [
  { month: "Aug", rate: 72 }, { month: "Sep", rate: 78 }, { month: "Oct", rate: 85 },
  { month: "Nov", rate: 80 }, { month: "Dec", rate: 91 }, { month: "Jan", rate: 88 }, { month: "Feb", rate: 94 },
];
const AMENDMENT_DATA = [
  { month: "Aug", count: 3 }, { month: "Sep", count: 5 }, { month: "Oct", count: 2 },
  { month: "Nov", count: 4 }, { month: "Dec", count: 1 }, { month: "Jan", count: 6 }, { month: "Feb", count: 2 },
];
const STATUS_DISTRIBUTION = [
  { name: "Executed", value: 12, color: "hsl(152, 58%, 38%)" },
  { name: "Pending", value: 5, color: "hsl(38, 92%, 50%)" },
  { name: "Draft", value: 3, color: "hsl(220, 9%, 46%)" },
  { name: "Amended", value: 4, color: "hsl(216, 45%, 48%)" },
  { name: "Disputed", value: 1, color: "hsl(0, 72%, 51%)" },
];
const COLLABORATOR_NETWORK = [
  { name: "Jordan Rivers", agreements: 8, role: "Songwriter" },
  { name: "Marcus Webb", agreements: 6, role: "Composer" },
  { name: "Aisha Nkosi", agreements: 5, role: "Songwriter" },
  { name: "Nova Thomas", agreements: 4, role: "Topliner" },
  { name: "Sofia Vega", agreements: 3, role: "Composer" },
  { name: "DJ Phantom", agreements: 3, role: "Composer" },
  { name: "T-Knox", agreements: 2, role: "Beatmaker" },
  { name: "Lydia Voss", agreements: 2, role: "Lyricist" },
];

export default function AgreementAnalytics() {
  const totalAgreements = STATUS_DISTRIBUTION.reduce((s, d) => s + d.value, 0);
  const avgExecTime = Math.round(EXEC_TIME_DATA.reduce((s, d) => s + d.days, 0) / EXEC_TIME_DATA.length);
  const latestCompletionRate = COMPLETION_DATA[COMPLETION_DATA.length - 1].rate;
  const totalAmendments = AMENDMENT_DATA.reduce((s, d) => s + d.count, 0);
  const disputeRate = Math.round((STATUS_DISTRIBUTION.find((d) => d.name === "Disputed")!.value / totalAgreements) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Split sheet execution, amendment, and collaborator insights.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
          <KPICard icon={Clock} label="Avg. Execution" value={`${avgExecTime}d`} trend="-2d from last month" trendPositive />
          <KPICard icon={CheckCircle2} label="Completion" value={`${latestCompletionRate}%`} trend="+6% from last month" trendPositive />
          <KPICard icon={PenLine} label="Amendments" value={String(totalAmendments)} trend="23 this year" />
          <KPICard icon={AlertTriangle} label="Dispute Rate" value={`${disputeRate}%`} trend="1 active" trendPositive={false} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
          <ChartCard title="Avg. Time to Execution" subtitle="Days from creation to fully signed">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={EXEC_TIME_DATA} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} unit="d" width={30} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(value: number) => [`${value} days`, "Avg. Time"]} />
                <Bar dataKey="days" fill="hsl(216, 45%, 35%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Signature Completion Rate" subtitle="Percentage of split sheets fully signed">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={COMPLETION_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} unit="%" domain={[60, 100]} width={35} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(value: number) => [`${value}%`, "Completion Rate"]} />
                <Line type="monotone" dataKey="rate" stroke="hsl(152, 58%, 38%)" strokeWidth={2.5} dot={{ fill: "hsl(152, 58%, 38%)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Amendment Frequency" subtitle="Amendments per month">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={AMENDMENT_DATA} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(value: number) => [`${value}`, "Amendments"]} />
                <Bar dataKey="count" fill="hsl(216, 45%, 48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Status Distribution" subtitle="Current state of all split sheets">
            <div className="flex items-center gap-4 md:gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={STATUS_DISTRIBUTION} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                    {STATUS_DISTRIBUTION.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {STATUS_DISTRIBUTION.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                    <span className="text-xs font-bold tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Collaborator Network */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-border flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Collaborator Network</span>
            <span className="text-xs text-muted-foreground ml-auto">{COLLABORATOR_NETWORK.length}</span>
          </div>
          <div className="divide-y divide-border">
            {COLLABORATOR_NETWORK.map((collab) => (
              <div key={collab.name} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {collab.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{collab.name}</div>
                  <div className="text-xs text-muted-foreground">{collab.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 md:w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(collab.agreements / COLLABORATOR_NETWORK[0].agreements) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-6 text-right">{collab.agreements}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, trend, trendPositive }: { icon: React.ElementType; label: string; value: string; trend: string; trendPositive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-5">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        <span className="text-[10px] md:text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-bold tabular-nums">{value}</div>
      <div className={`text-[10px] md:text-[11px] mt-1 md:mt-1.5 font-medium ${
        trendPositive === true ? "text-[hsl(var(--split-verified))]" : trendPositive === false ? "text-destructive" : "text-muted-foreground"
      }`}>
        {trend}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="mb-3 md:mb-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}
