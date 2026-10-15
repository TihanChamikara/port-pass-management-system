/**
 * DashboardPage.jsx  –  Role-Based Dashboard
 *
 * Renders a completely different dashboard for each role:
 *   admin                 → Full system overview (KPIs, charts, zone analytics)
 *   pass_officer          → Pass generation hub
 *   operations_officer    → Request approval queue metrics
 *   security_gate_officer → Gate operations view
 *   department_manager    → Department-scoped request view
 */

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, Grid, Stack, Typography, Box,
  useTheme, TextField, Button, Chip, Divider, List,
  ListItem, ListItemText, ListItemAvatar, Avatar, LinearProgress,
  CircularProgress, Alert,
} from "@mui/material";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import QrCodeIcon from "@mui/icons-material/QrCode";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassIcon from "@mui/icons-material/HourglassEmpty";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SecurityIcon from "@mui/icons-material/Security";
import GroupIcon from "@mui/icons-material/Group";
import BarChartIcon from "@mui/icons-material/BarChart";

import api from "../api/api";
import { useAuthStore } from "../features/authStore";
import { PASS_TYPES } from "../utils/passTypes";
import { useNavigate, Navigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function shadeHexColor(color, percent) {
  const hex = color.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex;
  const num = parseInt(normalized, 16);
  const amount = Math.max(-100, Math.min(100, percent));
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount) / 100;
  const r = Math.round((target - ((num >> 16) & 255)) * p) + ((num >> 16) & 255);
  const g = Math.round((target - ((num >> 8) & 255)) * p) + ((num >> 8) & 255);
  const b = Math.round((target - (num & 255)) * p) + (num & 255);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const STATUS_COLOR_MAP = {
  pending_approval: "#f59e0b",
  pending_department_approval: "#8b5cf6",
  under_review: "#3b82f6",
  approved: "#10b981",
  rejected: "#ef4444",
  issued: "#0ea5e9",
  checked_in: "#14b8a6",
  checked_out: "#64748b",
  expired: "#9ca3af",
  cancelled: "#6b7280",
};

function statusLabel(s) {
  return (s || "").split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedNumber({ value = 0, duration = 1.5 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let cur = 0;
    const inc = value / (duration * 10);
    const id = setInterval(() => {
      cur += inc;
      if (cur >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(Math.floor(cur));
    }, 100);
    return () => clearInterval(id);
  }, [value, duration]);
  return <span>{display}</span>;
}

function StatCard({ title, value, color, icon, subtitle }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2,
        border: "none",
        boxShadow: theme.palette.mode === "dark"
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: theme.palette.mode === "dark"
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.12)",
        },
        animation: "fadeInUp 0.5s ease-out both",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>{icon}</Typography>
        </Box>
        <Typography
          variant="h4"
          sx={{ color, fontWeight: 800, fontSize: "2.4rem", lineHeight: 1.1 }}
        >
          <AnimatedNumber value={typeof value === "number" ? value : 0} />
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children, minHeight = 320 }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2,
        border: "none",
        boxShadow: theme.palette.mode === "dark"
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        "&:hover": {
          boxShadow: theme.palette.mode === "dark"
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
        <Typography
          variant="subtitle1"
          sx={{ mb: 3, fontWeight: 700, fontSize: "0.95rem", letterSpacing: 0.3 }}
        >
          {title}
        </Typography>
        <Box sx={{ flex: 1, minHeight }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ title, items, icon }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2,
        border: "none",
        boxShadow: theme.palette.mode === "dark"
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, fontSize: "0.95rem" }}>
          {icon} {title}
        </Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            No recent activity
          </Typography>
        ) : (
          <List dense sx={{ p: 0 }}>
            {items.map((item, i) => (
              <ListItem
                key={item.id || i}
                sx={{
                  px: 1.5, py: 1,
                  borderRadius: 1.5,
                  mb: 0.5,
                  backgroundColor: theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)",
                  "&:hover": {
                    backgroundColor: theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      width: 32, height: 32, fontSize: "0.75rem",
                      bgcolor: STATUS_COLOR_MAP[item.status] || "#64748b",
                    }}
                  >
                    {(item.visitor_name || "V")[0].toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} noWrap component="span">
                      {item.visitor_name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: 0.25 }}>
                        <Chip
                          label={statusLabel(item.status)}
                          size="small"
                          sx={{
                            height: 18, fontSize: "0.65rem", fontWeight: 600,
                            bgcolor: `${STATUS_COLOR_MAP[item.status] || "#64748b"}20`,
                            color: STATUS_COLOR_MAP[item.status] || "#64748b",
                          }}
                        />
                        {item.department_name && (
                          <Typography variant="caption" color="text.disabled" noWrap>
                            {item.department_name}
                          </Typography>
                        )}
                      </Box>
                      {item.status === 'rejected' && (item.rejection_reason || item.operations_comments) && (
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 500, fontSize: "0.72rem", mt: 0.25, display: "block" }}>
                          Rejected by {item.rejected_by || 'Operations Officer'}: &quot;{item.rejection_reason || item.operations_comments}&quot;
                        </Typography>
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

function Pie3DChart({ data, height = 280, isDarkMode }) {
  const depthFill = isDarkMode ? 55 : 40;
  return (
    <Box sx={{ perspective: "1200px", transform: "rotateX(14deg)", transformStyle: "preserve-3d" }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="54%" innerRadius={55} outerRadius={95}
            paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
            {data.map((e, i) => <Cell key={`d${i}`} fill={shadeHexColor(e.color, -depthFill)} />)}
          </Pie>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={93}
            paddingAngle={3} dataKey="value" animationDuration={800} stroke="none"
            label={({ name, value }) => `${name}: ${value}`}
            style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.18))" }}>
            {data.map((e, i) => <Cell key={`f${i}`} fill={e.color} />)}
          </Pie>
          <Tooltip
            formatter={(v) => `${v}`}
            contentStyle={{
              borderRadius: 8, border: "none",
              boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
              backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
              color: isDarkMode ? "#F8FAFC" : "#0F172A",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard header
// ─────────────────────────────────────────────────────────────────────────────

function DashboardHeader({ title, subtitle, onRefresh, loading, children, actionFilters }) {
  const theme = useTheme();
  return (
    <Box sx={{ animation: "fadeInUp 0.4s ease-out both", mb: children ? 0 : 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 1 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.6rem", md: "2.2rem" },
              letterSpacing: "-0.5px",
              background: theme.palette.mode === "dark"
                ? "linear-gradient(135deg,#64B5F6 0%,#81C784 100%)"
                : "linear-gradient(135deg,#0B4F6C 0%,#147A43 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {actionFilters}
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, height: 36 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      {children}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboard({ data, onRefresh, loading, actionFilters }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const axisColor = isDark ? "#F8FAFC" : "#0F172A";
  const gridColor = isDark ? "rgba(148,163,184,0.25)" : "#E5E7EB";
  const tooltipBg = isDark ? "#0F172A" : "#FFFFFF";
  const tooltipText = isDark ? "#F8FAFC" : "#0F172A";

  const [isEditMode, setIsEditMode] = useState(false);
  const [editCapacities, setEditCapacities] = useState({});

  useEffect(() => {
    if (data?.zone_capacities) setEditCapacities({ ...data.zone_capacities });
  }, [data]);

  const handleSave = async () => {
    try {
      await Promise.all(
        Object.entries(editCapacities).map(([zone, cap]) =>
          api.patch(`/api/zones/capacities/${zone}`, { capacity: parseInt(cap, 10) || 0 })
        )
      );
      setIsEditMode(false);
      onRefresh();
    } catch {
      alert("Error saving zone capacities");
    }
  };

  const statusData = [
    { name: "Active", value: data.active_total || 0, color: "#F59E0B" },
    { name: "Completed", value: data.completed_total || 0, color: "#10B981" },
  ].filter((d) => d.value > 0);

  const passTypeData = PASS_TYPES.map((t) => ({
    name: t.label, value: data.pass_type_distribution?.[t.value] ?? 0, color: t.color,
  })).filter((d) => d.value > 0);

  const zoneUtilData = (data.zone_stats || []).map((item) => {
    const capacity = data.zone_capacities?.[item.zone] ?? 0;
    const issued = data.zone_access_distribution?.[item.zone] ?? 0;
    return {
      name: item.zone,
      issued,
      capacity,
      remaining: Math.max(0, capacity - issued),
    };
  });

  const tooltipStyle = {
    borderRadius: 8, border: "none",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
    padding: 12, backgroundColor: tooltipBg, color: tooltipText,
  };

  return (
    <Stack spacing={4}>
      {/* ── COMMAND CENTER HERO ────────────────────────────────────────────── */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #060d1f 0%, #0b1329 60%, #0f1e36 100%)'
          : 'linear-gradient(135deg, #0b1329 0%, #0f1e36 60%, #1e3a5f 100%)',
        borderRadius: 3,
        p: { xs: 2.5, md: 4 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 3,
        boxShadow: '0 8px 32px rgba(11,19,41,0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background watermark */}
        <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.04, pointerEvents: 'none' }}>
          <svg viewBox="0 0 300 300" width="300" height="300">
            <circle cx="150" cy="150" r="120" fill="none" stroke="#fff" strokeWidth="2"/>
            <circle cx="150" cy="150" r="80" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <circle cx="150" cy="150" r="40" fill="none" stroke="#fff" strokeWidth="1"/>
          </svg>
        </Box>

        {/* Left: KPI summary */}
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', background: '#10b981',
              boxShadow: '0 0 8px rgba(16,185,129,0.8)',
              animation: 'status-pulse 2s ease-in-out infinite',
            }}/>
            <Typography sx={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              System Operational
            </Typography>
          </Box>
          <Typography sx={{ color: '#f1f5f9', fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.4rem' }, lineHeight: 1, letterSpacing: '-0.5px', mb: 0.5 }}>
            PORT PASS PRO
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 3 }}>
            Enterprise Command Center — Administrator View
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { label: 'Currently Inside', value: data.checked_in_count || 0, color: '#14b8a6' },
              { label: 'Active Passes', value: data.active_total || 0, color: '#0ea5e9' },
              { label: 'Pending Review', value: data.pending_requests || 0, color: '#f59e0b' },
              { label: 'Today\'s Total', value: data.today_total || 0, color: '#10b981' },
            ].map(kpi => (
              <Box key={kpi.label} sx={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${kpi.color}`,
                borderRadius: 2,
                px: 2, py: 1.5,
                minWidth: 110,
              }}>
                <Typography sx={{ color: kpi.color, fontWeight: 900, fontSize: '1.8rem', lineHeight: 1 }}>
                  <AnimatedNumber value={kpi.value} />
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, mt: 0.3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {kpi.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: 3D CSS Port Gate Visualization (~30% of hero width) */}
        <Box sx={{ flexShrink: 0, display: { xs: 'none', md: 'block' }, perspective: '700px' }}>
          <svg
            viewBox="0 0 260 200"
            style={{
              width: 260,
              transform: 'rotateY(-12deg) rotateX(5deg)',
              filter: 'drop-shadow(0 16px 40px rgba(14,165,233,0.3))',
            }}
            aria-label="Port Security Gate Illustration"
            role="img"
          >
            {/* Gate posts */}
            <rect x="20" y="40" width="18" height="130" fill="#1e3a5f" rx="3"/>
            <rect x="222" y="40" width="18" height="130" fill="#1e3a5f" rx="3"/>
            {/* Top crossbeam */}
            <rect x="14" y="28" width="232" height="18" fill="#0ea5e9" rx="4"/>
            {/* Gate arm left */}
            <rect x="38" y="46" width="88" height="10" fill="#0284c7" rx="3" opacity="0.9"/>
            {/* Gate arm right */}
            <rect x="134" y="46" width="88" height="10" fill="#0284c7" rx="3" opacity="0.9"/>
            {/* Operational lights */}
            <circle cx="29" cy="22" r="5" fill="#10b981"/>
            <circle cx="29" cy="22" r="9" fill="#10b981" opacity="0.2"/>
            <circle cx="231" cy="22" r="5" fill="#10b981"/>
            <circle cx="231" cy="22" r="9" fill="#10b981" opacity="0.2"/>
            {/* Road */}
            <rect x="0" y="168" width="260" height="22" fill="#1e293b" rx="2"/>
            <rect x="108" y="172" width="44" height="6" fill="#f59e0b" rx="2" opacity="0.6"/>
            {/* Security booth */}
            <rect x="192" y="88" width="42" height="70" fill="#1e3a5f" rx="4"/>
            <rect x="198" y="96" width="13" height="9" fill="#7dd3fc" opacity="0.6" rx="1"/>
            <rect x="215" y="96" width="13" height="9" fill="#7dd3fc" opacity="0.6" rx="1"/>
            <rect x="205" y="126" width="14" height="32" fill="#0f172a" rx="2"/>
            {/* Visiting vehicle */}
            <rect x="55" y="132" width="76" height="30" fill="#334155" rx="7"/>
            <rect x="65" y="114" width="56" height="22" fill="#475569" rx="5"/>
            <rect x="70" y="117" width="20" height="12" fill="#7dd3fc" rx="2" opacity="0.45"/>
            <rect x="95" y="117" width="20" height="12" fill="#7dd3fc" rx="2" opacity="0.45"/>
            <circle cx="79" cy="166" r="9" fill="#1e293b"/>
            <circle cx="79" cy="166" r="4.5" fill="#475569"/>
            <circle cx="117" cy="166" r="9" fill="#1e293b"/>
            <circle cx="117" cy="166" r="4.5" fill="#475569"/>
            {/* Floating ID pass card */}
            <g transform="translate(6, 58) rotate(-8)">
              <rect x="0" y="0" width="48" height="32" fill="#0ea5e9" rx="5" opacity="0.95"/>
              <rect x="4" y="4" width="13" height="14" fill="white" rx="2" opacity="0.9"/>
              <rect x="21" y="6" width="23" height="3" fill="white" rx="1" opacity="0.7"/>
              <rect x="21" y="11" width="16" height="2.5" fill="white" rx="1" opacity="0.5"/>
              <rect x="4" y="22" width="40" height="2.5" fill="white" rx="1" opacity="0.4"/>
              <rect x="4" y="27" width="26" height="2" fill="white" rx="1" opacity="0.3"/>
            </g>
            {/* Container stack (port context) */}
            <rect x="2" y="108" width="30" height="20" fill="#1e3a5f" rx="2" opacity="0.7"/>
            <rect x="2" y="86" width="30" height="20" fill="#0ea5e9" rx="2" opacity="0.35"/>
          </svg>
        </Box>
      </Box>

      <DashboardHeader
        title="System Dashboard"
        subtitle="Complete enterprise overview — all KPIs, statistics and activity"
        onRefresh={onRefresh}
        loading={loading}
        actionFilters={actionFilters}
      />

      {/* Key Metrics */}
      <Grid container spacing={2.5}>
        {[
          { title: "Active Passes", value: data.active_total, color: "#F59E0B", icon: "⏳" },
          { title: "Checked Out", value: data.checked_out_count, color: "#64748b", icon: "🚪" },
          { title: "Rejected", value: data.rejected_requests, color: "#ef4444", icon: "❌" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {statusData.length > 0 && (
          <Grid item xs={12} md={6}>
            <ChartCard title="Pass Status Distribution">
              <Pie3DChart data={statusData} isDarkMode={isDark} />
            </ChartCard>
          </Grid>
        )}
        {passTypeData.length > 0 && (
          <Grid item xs={12} md={6}>
            <ChartCard title="Pass Type Distribution">
              <Pie3DChart data={passTypeData} isDarkMode={isDark} />
            </ChartCard>
          </Grid>
        )}
      </Grid>

      {/* Zone Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Zone Activity">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.zone_stats || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="zone" tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: axisColor, paddingTop: 12 }} />
                <Bar dataKey="active" fill="#F59E0B" name="Active" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Zone Utilization">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={zoneUtilData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: axisColor, paddingTop: 12 }} />
                <Bar dataKey="issued" fill="#F59E0B" name="Issued" radius={[6, 6, 0, 0]} />
                <Bar dataKey="remaining" fill="#10B981" name="Remaining" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Zone Capacity Panel */}
      <ChartCard title="Zone Pass Allocation">
        <Stack spacing={2}>
          {/* Edit controls */}
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
            {!isEditMode ? (
              <Button variant="outlined" size="small" startIcon={<EditIcon />}
                onClick={() => setIsEditMode(true)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5 }}>
                Edit Capacities
              </Button>
            ) : (
              <>
                <Button variant="contained" color="success" size="small" startIcon={<SaveIcon />}
                  onClick={handleSave}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5 }}>
                  Save
                </Button>
                <Button variant="outlined" size="small" startIcon={<CancelIcon />}
                  onClick={() => { setIsEditMode(false); setEditCapacities({ ...data.zone_capacities }); }}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5 }}>
                  Cancel
                </Button>
              </>
            )}
          </Box>
          <Grid container spacing={2}>
            {Object.entries(data.zone_capacities || {}).map(([zone, capacity]) => (
              <Grid item xs={12} sm={6} md={3} key={zone}>
                {isEditMode ? (
                  <Box sx={{ p: 2.5, borderRadius: 2, border: "2px solid", borderColor: "primary.main",
                    bgcolor: isDark ? "rgba(100,181,246,0.05)" : "rgba(11,79,108,0.08)",
                    display: "flex", flexDirection: "column", alignItems: "center", minHeight: 130 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", mb: 1.5 }}>
                      {zone}
                    </Typography>
                    <TextField
                      type="number" size="small"
                      value={editCapacities[zone] || 0}
                      onChange={(e) => setEditCapacities({ ...editCapacities, [zone]: e.target.value })}
                      sx={{ width: 90 }}
                      inputProps={{ style: { textAlign: "center", fontSize: "1.4rem", fontWeight: 800 } }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
                    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(11,79,108,0.04)",
                    display: "flex", flexDirection: "column", alignItems: "center", minHeight: 110,
                    transition: "all 0.3s", "&:hover": { transform: "translateY(-3px)", boxShadow: 2 } }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", mb: 1 }}>
                      {zone}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#0B4F6C" }}>
                      {capacity}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">capacity</Typography>
                  </Box>
                )}
              </Grid>
            ))}
          </Grid>
        </Stack>
      </ChartCard>

      {/* Pass Types Summary */}
      <ChartCard title="Pass Types Summary">
        <Grid container spacing={2}>
          {PASS_TYPES.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={item.value}>
              <Box sx={{
                p: 2.5, border: `2px solid ${item.color}`, borderRadius: 2,
                textAlign: "center", bgcolor: `${item.color}08`,
                transition: "all 0.3s", cursor: "default", minHeight: 130,
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                "&:hover": { transform: "translateY(-5px) scale(1.04)", bgcolor: `${item.color}12`, boxShadow: `0 10px 22px ${item.color}25` },
              }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
                  {item.label}
                </Typography>
                <Typography variant="h4" sx={{ color: item.color, fontWeight: 800, lineHeight: 1 }}>
                  <AnimatedNumber value={data.pass_type_distribution?.[item.value] ?? 0} duration={1.2} />
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </ChartCard>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <RecentActivityCard
            title="Recent System Activity"
            items={data.recent_requests || []}
            icon="🕑"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", borderRadius: 2, border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                📊 Request Pipeline
              </Typography>
              {[
                { label: "Pending Review", value: data.pending_requests, color: "#f59e0b" },
                { label: "Approved", value: data.approved_requests, color: "#10b981" },
                { label: "Rejected", value: data.rejected_requests, color: "#ef4444" },
                { label: "Issued", value: data.issued_requests, color: "#0ea5e9" },
                { label: "Checked In", value: data.checked_in_count, color: "#14b8a6" },
              ].map(({ label, value, color }) => {
                const total = data.total_requests || 1;
                const pct = Math.round((value / total) * 100);
                return (
                  <Box key={label} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>{label}</Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ color }}>{value}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: `${color}20`,
                        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
                    />
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASS OFFICER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function PassOfficerDashboard({ data, onRefresh, loading, actionFilters }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const axisColor = isDark ? "#F8FAFC" : "#0F172A";
  const gridColor = isDark ? "rgba(148,163,184,0.25)" : "#E5E7EB";
  const tooltipBg = isDark ? "#0F172A" : "#FFFFFF";

  const passTypeChartData = PASS_TYPES.map((t) => ({
    name: t.label, value: data.pass_type_distribution?.[t.value] ?? 0, color: t.color,
  })).filter((d) => d.value > 0);

  const zoneChartData = Object.entries(data.zone_access_distribution || {}).map(([k, v]) => ({
    zone: k, passes: v,
  }));

  return (
    <Stack spacing={4}>
      <DashboardHeader
        title="Pass Officer Dashboard"
        subtitle="Operational hub — pass issuance, QR generation and active passes"
        onRefresh={onRefresh}
        loading={loading}
        actionFilters={actionFilters}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5}>
        {[
          { title: "Awaiting Pass Issuance", value: data.approved_awaiting_pass, color: "#f59e0b", icon: "⏳", subtitle: "Approved, pass not yet generated" },
          { title: "Passes Issued Today", value: data.passes_issued_today, color: "#0ea5e9", icon: "🎫", subtitle: "Generated today" },
          { title: "Active Passes", value: data.active_passes, color: "#10b981", icon: "✅", subtitle: "Currently valid" },
          { title: "Overdue Passes", value: data.expired_passes, color: "#ef4444", icon: "⌛", subtitle: "Past validity period" },
          { title: "Pending Renewals", value: data.pending_renewals, color: "#8b5cf6", icon: "🔄", subtitle: "Renewal requested" },
          { title: "All-Time Passes", value: data.total_passes_all_time, color: "#64748b", icon: "📁", subtitle: "Total passes ever issued" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {passTypeChartData.length > 0 && (
          <Grid item xs={12} md={6}>
            <ChartCard title="Pass Type Distribution">
              <Pie3DChart data={passTypeChartData} isDarkMode={isDark} />
            </ChartCard>
          </Grid>
        )}
        {zoneChartData.length > 0 && (
          <Grid item xs={12} md={6}>
            <ChartCard title="Passes by Zone">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={zoneChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="zone" tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", backgroundColor: tooltipBg, color: axisColor }} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                  <Bar dataKey="passes" fill="#0ea5e9" name="Passes" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        )}
      </Grid>

      {/* Recent issued */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <RecentActivityCard
            title="Recently Issued Passes"
            items={data.recent_issued || []}
            icon="🎫"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", borderRadius: 2, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
              {[
                { label: "Issue New Pass", icon: <QrCodeIcon />, color: "#0ea5e9", href: "/issue-passes" },
                { label: "View All Passes", icon: <AssignmentIcon />, color: "#6366f1", href: "/passes" },
                { label: "Group Passes", icon: <GroupIcon />, color: "#8b5cf6", href: "/group-passes" },
              ].map(({ label, icon, color, href }) => (
                <Button
                  key={label}
                  fullWidth
                  variant="outlined"
                  startIcon={icon}
                  onClick={() => navigate(href)}
                  sx={{
                    mb: 1.5, textTransform: "none", fontWeight: 600,
                    borderRadius: 2, borderColor: `${color}60`, color,
                    "&:hover": { bgcolor: `${color}10`, borderColor: color },
                  }}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS OFFICER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function OpsOfficerDashboard({ data, onRefresh, loading, actionFilters }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const axisColor = isDark ? "#F8FAFC" : "#0F172A";
  const gridColor = isDark ? "rgba(148,163,184,0.25)" : "#E5E7EB";
  const tooltipBg = isDark ? "#0F172A" : "#FFFFFF";

  const barData = (data.request_stats || []).map((s) => ({ name: s.label, count: s.value, fill: s.color }));

  return (
    <Stack spacing={4}>
      <DashboardHeader
        title="Security Control Room"
        subtitle=""
        onRefresh={onRefresh}
        loading={loading}
        actionFilters={actionFilters}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5}>
        {[
          { title: "Pending Ops Review", value: data.pending_ops_review, color: "#f59e0b", icon: "📋", subtitle: "Awaiting your approval" },
          { title: "Approved Today", value: data.approved_today, color: "#10b981", icon: "✅", subtitle: "Approved in last 24h" },
          { title: "Rejected Today", value: data.rejected_today, color: "#ef4444", icon: "❌", subtitle: "Rejected in last 24h" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Bar chart + breakdown */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Request Workload Overview">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", backgroundColor: tooltipBg, color: axisColor }} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%", borderRadius: 2, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Workload Breakdown</Typography>
              {(data.request_stats || []).map(({ label, value, color }) => {
                const total = Math.max((data.request_stats || []).reduce((s, x) => s + x.value, 0), 1);
                const pct = Math.round((value / total) * 100);
                return (
                  <Box key={label} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>{label}</Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ color }}>{value} ({pct}%)</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: `${color}20`,
                        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
                    />
                  </Box>
                );
              })}
              <Divider sx={{ my: 2 }} />
              <Button
                fullWidth variant="outlined" startIcon={<CheckCircleIcon />}
                onClick={() => navigate("/approve-requests")}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, color: "#10b981", borderColor: "#10b98140",
                  "&:hover": { bgcolor: "#10b98110", borderColor: "#10b981" } }}
              >
                Go to Approval Queue
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <RecentActivityCard
        title="Recent Request Activity"
        items={data.recent_requests || []}
        icon="🕑"
      />
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIP ARRIVALS COMPONENT (Gate Officer)
// ─────────────────────────────────────────────────────────────────────────────

function VipArrivalsCard({ items }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const getLmvLabel = (lmv) => {
    if (lmv === 'both') return 'LMV1 & LMV2';
    return (lmv || 'LMV1').toUpperCase();
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Awaiting Pass';
      case 'issued': return 'Ready for Entry';
      case 'checked_in': return 'On Site';
      case 'checked_out': return 'Exited';
      default: return status.toUpperCase();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#eab308';
      case 'issued': return '#3b82f6';
      case 'checked_in': return '#22c55e';
      case 'checked_out': return '#64748b';
      default: return '#64748b';
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: "none",
        boxShadow: theme.palette.mode === "dark"
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        background: theme.palette.mode === "dark"
          ? "linear-gradient(to bottom, #1e293b, #0f172a)"
          : "linear-gradient(to bottom, #fefce8, #ffffff)",
        borderLeft: "6px solid #eab308",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2.5, fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⭐ Expected VIP Guests Today
        </Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No VIP arrivals expected for today.
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {items.map((item, i) => (
              <ListItem
                key={item.id || i}
                secondaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => navigate(`/gate-control?searchId=${item.id}`)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: 'none',
                        backgroundColor: '#d97706',
                      }
                    }}
                  >
                    Verify Pass
                  </Button>
                }
                sx={{
                  px: 2, py: 1.5,
                  borderRadius: 2,
                  mb: 1,
                  border: theme.palette.mode === 'dark' ? '1px solid #334155' : '1px solid #fef08a',
                  backgroundColor: theme.palette.mode === "dark"
                    ? "rgba(15, 23, 42, 0.6)"
                    : "#fffbeb",
                  "&:hover": {
                    backgroundColor: theme.palette.mode === "dark"
                      ? "rgba(15, 23, 42, 0.9)"
                      : "#fef9c3",
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 42 }}>
                  <Avatar
                    sx={{
                      width: 34, height: 34, fontSize: "0.85rem",
                      bgcolor: '#eab308', color: '#fff',
                      fontWeight: 'bold',
                    }}
                  >
                    👑
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#f8fafc' : '#1e293b' }}>
                        {item.visitor_name}
                      </Typography>
                      <Chip
                        label={getLmvLabel(item.vip_lmv_access)}
                        size="small"
                        sx={{
                          height: 18, fontSize: "0.65rem", fontWeight: 700,
                          bgcolor: "#fef08a", color: "#854d0e",
                          border: "1px solid #fde047"
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        🏢 {item.visitor_organization || 'No Organisation'} {item.vehicle_number ? ` • 🚗 ${item.vehicle_number}` : ''}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                        <Chip
                          label={getStatusLabel(item.status)}
                          size="small"
                          sx={{
                            height: 18, fontSize: "0.65rem", fontWeight: 700,
                            bgcolor: `${getStatusColor(item.status)}15`,
                            color: getStatusColor(item.status),
                            border: `1px solid ${getStatusColor(item.status)}30`
                          }}
                        />
                        <Typography variant="caption" color="text.disabled">
                          Scheduled: {new Date(item.requested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE OFFICER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function GateOfficerDashboard({ data, onRefresh, loading, actionFilters }) {
  const navigate = useNavigate();
  return (
    <Stack spacing={4}>
      <DashboardHeader
        title="Gate Operations Dashboard"
        subtitle="Today's gate activity — check-ins, check-outs and active visitor status"
        onRefresh={onRefresh}
        loading={loading}
        actionFilters={actionFilters}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5}>
        {[
          { title: "Expected Visitors Today", value: data.expected_today, color: "#6366f1", icon: "📅", subtitle: "Approved for today" },
          { title: "Currently Inside", value: data.currently_inside, color: "#14b8a6", icon: "🏢", subtitle: "Checked in, not yet out" },
          { title: "Checked In Today", value: data.checked_in_today, color: "#10b981", icon: "🟢", subtitle: "Entered today" },
          { title: "Checked Out Today", value: data.checked_out_today, color: "#64748b", icon: "🚪", subtitle: "Exited today" },
          { title: "Active Passes", value: data.active_passes, color: "#0ea5e9", icon: "🎫", subtitle: "Valid passes now" },
          { title: "Denied Entries", value: data.denied_entries, color: "#ef4444", icon: "⛔", subtitle: "Rejected total" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* VIP Arrivals */}
      <VipArrivalsCard items={data.vip_arrivals || []} />

      {/* Activity Lists */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
              {[
                { label: "Scan QR / Check-In", icon: <QrCodeIcon />, color: "#10b981", href: "/gate-control" },
                { label: "View Active Passes", icon: <SecurityIcon />, color: "#0ea5e9", href: "/passes" },
              ].map(({ label, icon, color, href }) => (
                <Button
                  key={label} fullWidth variant="outlined" startIcon={icon}
                  onClick={() => navigate(href)}
                  sx={{ mb: 1.5, textTransform: "none", fontWeight: 600, borderRadius: 2,
                    borderColor: `${color}60`, color,
                    "&:hover": { bgcolor: `${color}10`, borderColor: color } }}
                >
                  {label}
                </Button>
              ))}
              <Divider sx={{ my: 2 }} />
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
                Use the <strong>Gate Control</strong> page to scan QR codes for visitor check-in and check-out.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <RecentActivityCard
                title="Recent Check-Ins"
                items={data.recent_checkins || []}
                icon="🟢"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RecentActivityCard
                title="Recent Check-Outs"
                items={data.recent_checkouts || []}
                icon="🔴"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MANAGER DASHBOARD — SPATIAL UI
// ─────────────────────────────────────────────────────────────────────────────

// ── Spatial shared primitives ────────────────────────────────────────────────

function SpatialCard({ children, sx = {}, hover = true, ...props }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        background: isDark
          ? "rgba(15,23,42,0.7)"
          : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.9)",
        borderRadius: "20px",
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 8px 32px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        ...(hover && {
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,1)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.14)"
              : "1px solid rgba(255,255,255,1)",
          },
        }),
        "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

function SpatialKPI({ title, value, color, icon, subtitle, accentGlyph }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <SpatialCard sx={{ p: 2.5, position: "relative", overflow: "hidden", height: "100%" }}>
      {/* Ambient glow blob */}
      <Box sx={{
        position: "absolute", top: -24, right: -24, width: 90, height: 90,
        borderRadius: "50%", background: color, opacity: isDark ? 0.12 : 0.09,
        filter: "blur(28px)", pointerEvents: "none",
      }} />
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: "11px",
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem",
          }}>
            {icon}
          </Box>
          {accentGlyph && (
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color, letterSpacing: "1px", textTransform: "uppercase", mt: 0.5 }}>
              {accentGlyph}
            </Typography>
          )}
        </Box>
        <Typography sx={{ color, fontWeight: 900, fontSize: "2.4rem", lineHeight: 1, letterSpacing: "-1px" }}>
          <AnimatedNumber value={typeof value === "number" ? value : 0} />
        </Typography>
        <Typography sx={{
          fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px",
          color: isDark ? "rgba(203,213,225,0.75)" : "rgba(71,85,105,0.8)", mt: 0.5,
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: "0.7rem", color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)", mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </SpatialCard>
  );
}

function SpatialHero({ deptLabel, pendingCount, isDark, onRefresh, loading, actionFilters }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const hasUrgent = pendingCount > 0;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <SpatialCard hover={false} sx={{
      p: { xs: 2.5, md: 3.5 },
      background: isDark
        ? "linear-gradient(135deg, rgba(14,26,54,0.9) 0%, rgba(15,23,42,0.85) 60%, rgba(10,18,38,0.9) 100%)"
        : "linear-gradient(135deg, rgba(11,19,41,0.92) 0%, rgba(15,40,80,0.88) 60%, rgba(7,26,60,0.9) 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient blobs */}
      <Box sx={{ position: "absolute", top: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: "#0ea5e9", opacity: 0.07, filter: "blur(60px)", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", bottom: -40, right: 80, width: 180, height: 180, borderRadius: "50%", background: "#8b5cf6", opacity: 0.06, filter: "blur(50px)", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", top: 30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "#10b981", opacity: 0.06, filter: "blur(44px)", pointerEvents: "none" }} />
      {/* Subtle grid */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          {/* Status pill */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: hasUrgent ? "#f59e0b" : "#10b981", boxShadow: hasUrgent ? "0 0 8px rgba(245,158,11,0.8)" : "0 0 8px rgba(16,185,129,0.8)" }} />
            <Typography sx={{ color: hasUrgent ? "#f59e0b" : "#10b981", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" }}>
              {hasUrgent ? `${pendingCount} request${pendingCount > 1 ? "s" : ""} require attention` : "Department activity is normal"}
            </Typography>
          </Box>
          <Typography sx={{ color: "#f1f5f9", fontWeight: 900, fontSize: { xs: "1.5rem", md: "2rem" }, lineHeight: 1.1, letterSpacing: "-0.5px", mb: 0.5 }}>
            {greeting}, Manager
          </Typography>
          <Typography sx={{ color: "rgba(148,163,184,0.85)", fontSize: "0.9rem", mb: 2 }}>
            Here's what's happening with your department's visitor requests.
          </Typography>
          {/* Dept badge */}
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 1, px: 1.5, py: 0.7,
            background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)",
            borderRadius: "10px",
          }}>
            <Typography sx={{ fontSize: "0.85rem" }}>🏢</Typography>
            <Typography sx={{ color: "#7dd3fc", fontWeight: 700, fontSize: "0.82rem" }}>{deptLabel}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5 }}>
          <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.75rem", fontWeight: 500 }}>{dateStr}</Typography>
          {actionFilters}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#e2e8f0", textTransform: "none", fontWeight: 600, borderRadius: "10px",
                px: 2, fontSize: "0.8rem", height: 32,
                "&:hover": { background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)" },
              }}
            >
              ↻ Refresh
            </Button>
            <Button
              size="small"
              onClick={() => navigate("/dept-approvals")}
              sx={{
                background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.35)",
                color: "#fbbf24", textTransform: "none", fontWeight: 700, borderRadius: "10px",
                px: 2, fontSize: "0.8rem", height: 32,
                "&:hover": { background: "rgba(245,158,11,0.28)", border: "1px solid rgba(245,158,11,0.5)" },
              }}
            >
              ⚡ Open Queue
            </Button>
          </Box>
        </Box>
      </Box>
    </SpatialCard>
  );
}

function SpatialPipeline({ data, isDark }) {
  const stages = [
    { label: "Submitted", key: null, color: "#6366f1", icon: "📥", value: data.total_requests_all_time, desc: "All time" },
    { label: "Pending", key: "pending_dept_approval", color: "#f59e0b", icon: "⏳", value: data.pending_dept_approval, desc: "Awaiting review" },
    { label: "Approved", key: "approved_by_dept", color: "#10b981", icon: "✅", value: data.approved_by_dept, desc: "Forwarded" },
    { label: "Rejected", key: "rejected_by_dept", color: "#ef4444", icon: "❌", value: data.rejected_by_dept, desc: "Declined" },
    { label: "Security", key: null, color: "#0ea5e9", icon: "🛡️", value: null, desc: "Ops verification" },
    { label: "Completed", key: null, color: "#8b5cf6", icon: "🏁", value: null, desc: "Pass issued" },
  ];

  return (
    <SpatialCard hover={false} sx={{ p: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.3px", mb: 3, color: isDark ? "#e2e8f0" : "#1e293b" }}>
        🔄 Department Pipeline
      </Typography>
      <Box sx={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0,
        overflowX: "auto", pb: 1,
      }}>
        {stages.map((stage, idx) => (
          <Box key={stage.label} sx={{ display: "flex", alignItems: "center" }}>
            {/* Node */}
            <Box sx={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
              minWidth: 80,
              transition: "all 0.2s",
            }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: "14px",
                background: stage.value != null
                  ? `${stage.color}20`
                  : isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                border: stage.value != null
                  ? `1.5px solid ${stage.color}50`
                  : isDark ? "1.5px solid rgba(255,255,255,0.1)" : "1.5px solid rgba(15,23,42,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: stage.value != null ? `0 4px 16px ${stage.color}25` : "none",
                transition: "all 0.3s",
                "&:hover": stage.value != null ? { transform: "scale(1.1)", boxShadow: `0 8px 24px ${stage.color}35` } : {},
              }}>
                {stage.icon}
              </Box>
              <Typography sx={{
                fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px",
                color: stage.value != null ? stage.color : (isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.5)"),
              }}>
                {stage.label}
              </Typography>
              {stage.value != null ? (
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: stage.color, lineHeight: 1 }}>
                  {stage.value}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.6rem", color: isDark ? "rgba(148,163,184,0.4)" : "rgba(100,116,139,0.4)" }}>
                  {stage.desc}
                </Typography>
              )}
            </Box>
            {/* Connector */}
            {idx < stages.length - 1 && (
              <Box sx={{
                width: { xs: 16, sm: 28, md: 36 }, height: 2,
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))"
                  : "linear-gradient(90deg, rgba(15,23,42,0.08), rgba(15,23,42,0.04))",
                borderRadius: 1, mx: 0.5, flexShrink: 0,
              }} />
            )}
          </Box>
        ))}
      </Box>
    </SpatialCard>
  );
}

function SpatialActivityTimeline({ items, deptLabel, isDark }) {
  const statusIcon = (s) => {
    if (s === "approved" || s === "pending_approval") return "✅";
    if (s === "rejected") return "❌";
    if (s === "pending_department_approval") return "⏳";
    if (s === "issued") return "🎫";
    if (s === "checked_in") return "🏢";
    if (s === "checked_out") return "🚪";
    return "📋";
  };
  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <SpatialCard hover={false} sx={{ p: 3, height: "100%" }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.3px", mb: 2.5, color: isDark ? "#e2e8f0" : "#1e293b" }}>
        🕑 Recent Activity — {deptLabel}
      </Typography>
      {items.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography sx={{ fontSize: "2rem", mb: 1.5 }}>🌿</Typography>
          <Typography sx={{ fontWeight: 700, color: isDark ? "#94a3b8" : "#64748b", mb: 0.5 }}>All quiet here</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)" }}>
            No recent activity for this department.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: "relative" }}>
          {/* Timeline line */}
          <Box sx={{
            position: "absolute", left: 15, top: 8, bottom: 8, width: 1.5,
            background: isDark
              ? "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.02))"
              : "linear-gradient(to bottom, rgba(15,23,42,0.1), rgba(15,23,42,0.02))",
            borderRadius: 1,
          }} />
          <Stack spacing={1}>
            {items.slice(0, 8).map((item, i) => (
              <Box key={item.id || i} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                {/* Node */}
                <Box sx={{
                  width: 32, height: 32, borderRadius: "10px", flexShrink: 0,
                  background: `${STATUS_COLOR_MAP[item.status] || "#64748b"}18`,
                  border: `1.5px solid ${STATUS_COLOR_MAP[item.status] || "#64748b"}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", position: "relative", zIndex: 1,
                }}>
                  {statusIcon(item.status)}
                </Box>
                {/* Content */}
                <Box sx={{
                  flex: 1, p: 1.5, borderRadius: "12px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.025)",
                  border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(15,23,42,0.06)",
                  transition: "all 0.2s",
                  "&:hover": {
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                  },
                }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: isDark ? "#e2e8f0" : "#1e293b" }} noWrap>
                      {item.visitor_name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)", flexShrink: 0, ml: 1 }}>
                      {timeAgo(item.created_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                    <Box sx={{
                      px: 0.9, py: 0.2, borderRadius: "6px",
                      background: `${STATUS_COLOR_MAP[item.status] || "#64748b"}18`,
                      fontSize: "0.62rem", fontWeight: 700,
                      color: STATUS_COLOR_MAP[item.status] || "#64748b",
                      letterSpacing: "0.3px",
                    }}>
                      {statusLabel(item.status)}
                    </Box>
                    {item.visitor_purpose && (
                      <Typography sx={{ fontSize: "0.68rem", color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)" }} noWrap>
                        · {item.visitor_purpose}
                      </Typography>
                    )}
                  </Box>
                  {item.status === "rejected" && (item.rejection_reason || item.operations_comments) && (
                    <Typography sx={{ fontSize: "0.68rem", color: "#ef4444", mt: 0.5, fontWeight: 500 }}>
                      {item.rejection_reason || item.operations_comments}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </SpatialCard>
  );
}

function SpatialStatusChart({ data, isDark }) {
  const chartData = [
    { name: "Pending", value: data.pending_dept_approval || 0, color: "#f59e0b" },
    { name: "Approved", value: data.approved_by_dept || 0, color: "#10b981" },
    { name: "Rejected", value: data.rejected_by_dept || 0, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <SpatialCard hover={false} sx={{ p: 3, height: "100%" }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.3px", mb: 2.5, color: isDark ? "#e2e8f0" : "#1e293b" }}>
        📊 Request Status
      </Typography>
      {total === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography sx={{ color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)", fontSize: "0.85rem" }}>
            No data yet
          </Typography>
        </Box>
      ) : (
        <>
          {/* Donut via SVG + CSS */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={78}
                  paddingAngle={3} dataKey="value"
                  animationDuration={800} stroke="none"
                >
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => `${v}`}
                  contentStyle={{
                    borderRadius: 10, border: "none",
                    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    fontSize: "0.8rem", fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          {/* Legend */}
          <Stack spacing={1}>
            {chartData.map(d => (
              <Box key={d.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "3px", background: d.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.75rem", color: isDark ? "rgba(203,213,225,0.8)" : "rgba(71,85,105,0.9)" }}>
                    {d.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: d.color }}>
                  {d.value} <Typography component="span" sx={{ fontSize: "0.65rem", fontWeight: 500, color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.6)" }}>
                    ({Math.round((d.value / total) * 100)}%)
                  </Typography>
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </SpatialCard>
  );
}

function SpatialQuickActions({ navigate, isDark }) {
  const actions = [
    { label: "New Visitor Request", desc: "Submit a new request", icon: "➕", color: "#0ea5e9", href: "/visitor-request" },
    { label: "Approval Queue", desc: "Review pending requests", icon: "⏳", color: "#f59e0b", href: "/dept-approvals" },
    { label: "Group Passes", desc: "Issue group visitor passes", icon: "👥", color: "#8b5cf6", href: "/group-passes" },
  ];
  return (
    <SpatialCard hover={false} sx={{ p: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.3px", mb: 2, color: isDark ? "#e2e8f0" : "#1e293b" }}>
        ⚡ Quick Actions
      </Typography>
      <Stack spacing={1.5}>
        {actions.map(a => (
          <Box
            key={a.label}
            onClick={() => navigate(a.href)}
            sx={{
              display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5,
              borderRadius: "13px", cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
              border: isDark ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${a.color}20`,
              transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
              "&:hover": {
                background: `${a.color}12`,
                border: `1px solid ${a.color}35`,
                transform: "translateX(4px)",
                boxShadow: `0 4px 16px ${a.color}15`,
              },
              "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
            }}
          >
            <Box sx={{
              width: 36, height: 36, borderRadius: "10px",
              background: `${a.color}18`, border: `1px solid ${a.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0,
            }}>
              {a.icon}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: isDark ? "#e2e8f0" : "#1e293b" }}>
                {a.label}
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.7)" }}>
                {a.desc}
              </Typography>
            </Box>
            <Typography sx={{ ml: "auto", color: a.color, fontSize: "1rem", opacity: 0.6 }}>→</Typography>
          </Box>
        ))}
      </Stack>
    </SpatialCard>
  );
}

function DeptManagerDashboard({ data, onRefresh, loading, actionFilters }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const deptLabel = data.department_name || "Your Department";

  return (
    <Box sx={{ position: "relative" }}>
      {/* Background ambient blobs */}
      <Box sx={{
        position: "fixed", top: "10%", left: "5%", width: 400, height: 400,
        borderRadius: "50%", background: "#0ea5e9",
        opacity: isDark ? 0.025 : 0.018, filter: "blur(100px)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <Box sx={{
        position: "fixed", bottom: "15%", right: "8%", width: 350, height: 350,
        borderRadius: "50%", background: "#8b5cf6",
        opacity: isDark ? 0.022 : 0.015, filter: "blur(90px)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <Box sx={{
        position: "fixed", top: "50%", right: "25%", width: 250, height: 250,
        borderRadius: "50%", background: "#10b981",
        opacity: isDark ? 0.018 : 0.012, filter: "blur(80px)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>

        {/* ── No department warning ── */}
        {data.department_id == null && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Your account is not linked to a specific department. Showing all requests. Contact an administrator to link your account.
          </Alert>
        )}

        {/* ── Hero ── */}
        <SpatialHero
          deptLabel={deptLabel}
          pendingCount={data.pending_dept_approval || 0}
          isDark={isDark}
          onRefresh={onRefresh}
          loading={loading}
          actionFilters={actionFilters}
        />

        {/* ── KPI Cards ── */}
        <Grid container spacing={2}>
          {[
            { title: "Pending Your Approval", value: data.pending_dept_approval, color: "#f59e0b", icon: "⏳", subtitle: "Awaiting dept. review", accentGlyph: "URGENT" },
            { title: "Approved by Dept.", value: data.approved_by_dept, color: "#10b981", icon: "✅", subtitle: "Forwarded to Ops" },
            { title: "Rejected by Dept.", value: data.rejected_by_dept, color: "#ef4444", icon: "❌", subtitle: "Declined" },
            { title: "Requests Today", value: data.today_requests, color: "#0ea5e9", icon: "📅", subtitle: "Submitted today" },
            { title: "Total All Time", value: data.total_requests_all_time, color: "#6366f1", icon: "📋", subtitle: "All dept. requests" },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={s.title}>
              <SpatialKPI {...s} />
            </Grid>
          ))}
        </Grid>

        {/* ── Department Pipeline ── */}
        <SpatialPipeline data={data} isDark={isDark} />

        {/* ── Main Content Row: Activity + Chart + Quick Actions ── */}
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={5}>
            <SpatialActivityTimeline
              items={data.recent_requests || []}
              deptLabel={deptLabel}
              isDark={isDark}
            />
          </Grid>
          <Grid item xs={12} md={3.5}>
            <SpatialStatusChart data={data} isDark={isDark} />
          </Grid>
          <Grid item xs={12} md={3.5}>
            <SpatialQuickActions navigate={navigate} isDark={isDark} />
          </Grid>
        </Grid>

        {/* ── Approval Queue CTA ── */}
        <SpatialCard hover={false} sx={{
          p: { xs: 2.5, md: 3 },
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2,
          background: isDark
            ? "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(15,23,42,0.7) 100%)"
            : "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.72) 100%)",
          border: isDark ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(245,158,11,0.25)",
        }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: "1.1rem" }}>⏳</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: isDark ? "#fbbf24" : "#b45309" }}>
                Approval Queue
              </Typography>
              {data.pending_dept_approval > 0 && (
                <Box sx={{
                  px: 1, py: 0.2, borderRadius: "8px",
                  background: "#f59e0b", color: "#fff",
                  fontSize: "0.7rem", fontWeight: 800,
                }}>
                  {data.pending_dept_approval}
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: "0.82rem", color: isDark ? "rgba(203,213,225,0.75)" : "rgba(71,85,105,0.9)" }}>
              {data.pending_dept_approval > 0
                ? `${data.pending_dept_approval} visitor request${data.pending_dept_approval > 1 ? "s are" : " is"} waiting for your department approval.`
                : "You're all caught up — no visitor requests are waiting for your approval."}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate("/dept-approvals")}
            sx={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff", textTransform: "none", fontWeight: 700,
              borderRadius: "12px", px: 3, py: 1.2, boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
              "&:hover": { background: "linear-gradient(135deg, #d97706, #b45309)", boxShadow: "0 8px 24px rgba(245,158,11,0.5)" },
            }}
          >
            Go to Approval Queue →
          </Button>
        </SpatialCard>

      </Stack>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range state — only admin uses this
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);



  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        date_from: startDate,
        date_to: endDate
      };
      const { data: responseData } = await api.get("/api/dashboard/summary", { params });
      setData(responseData);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setError(err.response?.data?.detail || err.message || "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.role, startDate, endDate]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData]);

  // ── Loading state — Skeleton ──
  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Hero skeleton */}
        <Box sx={{ height: 200, borderRadius: 3, mb: 4 }} className="skeleton skeleton-card" />
        {/* KPI skeleton row */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[1,2,3,4,5,6].map(i => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Box sx={{ height: 110, borderRadius: 2 }} className="skeleton skeleton-card" />
            </Grid>
          ))}
        </Grid>
        {/* Chart skeleton row */}
        <Grid container spacing={3}>
          {[1,2].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Box sx={{ height: 280, borderRadius: 2 }} className="skeleton skeleton-card" />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", flexDirection: "column", gap: 2, p: 4 }}>
        <Typography variant="h5" color="error" fontWeight={700}>Error Loading Dashboard</Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">{error}</Typography>
        <Button variant="contained" onClick={fetchData} sx={{ textTransform: "none", fontWeight: 600 }}>Retry</Button>
      </Box>
    );
  }

  if (!data) return null;

  const role = data.role || user?.role;

  const actionFilters = (
    <Box sx={{ 
      display: 'flex', gap: 1, alignItems: 'center', 
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)', 
      backdropFilter: 'blur(10px)',
      px: 1.5, py: 0.5, borderRadius: 2, 
      border: '1px solid', borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' 
    }}>
      <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
        
      </Typography>
      <TextField
        type="date" value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        size="small"
        sx={{ width: 125, '& .MuiOutlinedInput-root': { height: 30, fontSize: '0.8rem', '& fieldset': { border: 'none' } }, '& input': { color: 'inherit' } }}
      />
      <Typography sx={{ opacity: 0.5, fontWeight: 600 }}>-</Typography>
      <TextField
        type="date" value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        size="small"
        sx={{ width: 125, '& .MuiOutlinedInput-root': { height: 30, fontSize: '0.8rem', '& fieldset': { border: 'none' } }, '& input': { color: 'inherit' } }}
      />
    </Box>
  );

  // ── Dispatch to role-specific view ──
  const commonProps = { data, onRefresh: fetchData, loading, actionFilters };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }} className="page-enter">
      {role === "department_coordinator" && <Navigate to="/coordinator-dashboard" replace />}
      {role === "admin" && <AdminDashboard {...commonProps} />}
      {role === "pass_officer" && <PassOfficerDashboard {...commonProps} />}
      {role === "operations_officer" && <OpsOfficerDashboard {...commonProps} />}
      {role === "security_gate_officer" && <GateOfficerDashboard {...commonProps} />}
      {role === "department_manager" && <DeptManagerDashboard {...commonProps} />}

      {/* Fallback for unknown roles */}
      {!["admin", "pass_officer", "operations_officer", "security_gate_officer", "department_manager", "department_coordinator"].includes(role) && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <Alert severity="info" sx={{ borderRadius: 2, maxWidth: 480 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Dashboard Not Configured</Typography>
            <Typography variant="body2">
              No dashboard is configured for role: <strong>{role}</strong>. Please contact your administrator.
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
}
