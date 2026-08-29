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
import { useNavigate } from "react-router-dom";

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

function DashboardHeader({ title, subtitle, onRefresh, loading, children }) {
  const theme = useTheme();
  return (
    <Box sx={{ animation: "fadeInUp 0.4s ease-out both" }}>
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
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>
      {children}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboard({ data, startDate, setStartDate, endDate, setEndDate, onRefresh, loading }) {
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
      >
        {/* Date range filter */}
        <Grid container spacing={2} sx={{ maxWidth: 560, mt: 1 }}>
          <Grid item xs={6} sm={5}>
            <TextField
              label="Start Date" type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={6} sm={5}>
            <TextField
              label="End Date" type="date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>
        </Grid>
      </DashboardHeader>


      {/* Pass KPI Row */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, display: "block" }}>
          Pass Statistics (Selected Range)
        </Typography>
        <Grid container spacing={2.5}>
          {[
            { title: "Passes in Range", value: data.today_total, color: "#1976D2", icon: "📅" },
            { title: "Active Passes", value: data.active_total, color: "#F59E0B", icon: "⏳" },
            { title: "Completed Passes", value: data.completed_total, color: "#10B981", icon: "✅" },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.title}>
              <StatCard {...s} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Request KPI Row */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, display: "block" }}>
          Request Pipeline (All Time)
        </Typography>
        <Grid container spacing={2.5}>
          {[
            { title: "Total Requests", value: data.total_requests, color: "#6366f1", icon: "📋" },
            { title: "Pending Review", value: data.pending_requests, color: "#f59e0b", icon: "⏳" },
            { title: "Approved", value: data.approved_requests, color: "#10b981", icon: "✅" },
            { title: "Rejected", value: data.rejected_requests, color: "#ef4444", icon: "❌" },
            { title: "Currently Inside", value: data.checked_in_count, color: "#14b8a6", icon: "🏢" },
            { title: "Checked Out", value: data.checked_out_count, color: "#64748b", icon: "🚪" },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={s.title}>
              <StatCard {...s} />
            </Grid>
          ))}
        </Grid>
      </Box>

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

function PassOfficerDashboard({ data, onRefresh, loading }) {
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

function OpsOfficerDashboard({ data, onRefresh, loading }) {
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
        title="Operations Dashboard"
        subtitle="Request review pipeline — approvals, rejections and workload metrics"
        onRefresh={onRefresh}
        loading={loading}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5}>
        {[
          { title: "Pending Ops Review", value: data.pending_ops_review, color: "#f59e0b", icon: "📋", subtitle: "Awaiting your approval" },
          { title: "Under Review", value: data.under_review, color: "#3b82f6", icon: "🔍", subtitle: "Currently being reviewed" },
          { title: "Dept. Pending", value: data.dept_pending, color: "#8b5cf6", icon: "🏢", subtitle: "Awaiting dept. manager" },
          { title: "Approved Today", value: data.approved_today, color: "#10b981", icon: "✅", subtitle: "Approved in last 24h" },
          { title: "Rejected Today", value: data.rejected_today, color: "#ef4444", icon: "❌", subtitle: "Rejected in last 24h" },
          { title: "Total Reviewed", value: data.total_reviewed_all_time, color: "#64748b", icon: "📊", subtitle: "All time total" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={s.title}>
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

function GateOfficerDashboard({ data, onRefresh, loading }) {
  const navigate = useNavigate();
  return (
    <Stack spacing={4}>
      <DashboardHeader
        title="Gate Operations Dashboard"
        subtitle="Today's gate activity — check-ins, check-outs and active visitor status"
        onRefresh={onRefresh}
        loading={loading}
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
// DEPARTMENT MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function DeptManagerDashboard({ data, onRefresh, loading }) {
  const navigate = useNavigate();
  const deptLabel = data.department_name || "Your Department";

  return (
    <Stack spacing={4}>
      <DashboardHeader
        title={`${deptLabel} Dashboard`}
        subtitle={`Department-specific requests and approval status for ${deptLabel}`}
        onRefresh={onRefresh}
        loading={loading}
      />

      {data.department_id == null && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Your account is not linked to a specific department. Showing all requests. Contact an administrator to link your account.
        </Alert>
      )}

      {/* KPI Row */}
      <Grid container spacing={2.5}>
        {[
          { title: "Pending Your Approval", value: data.pending_dept_approval, color: "#f59e0b", icon: "⏳", subtitle: "Awaiting dept. review" },
          { title: "Approved by Dept.", value: data.approved_by_dept, color: "#10b981", icon: "✅", subtitle: "Forwarded to Ops" },
          { title: "Rejected by Dept.", value: data.rejected_by_dept, color: "#ef4444", icon: "❌", subtitle: "Declined" },
          { title: "Requests Today", value: data.today_requests, color: "#0ea5e9", icon: "📅", subtitle: "Submitted today" },
          { title: "Total All Time", value: data.total_requests_all_time, color: "#64748b", icon: "📋", subtitle: "All dept. requests" },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Pipeline Bar */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", borderRadius: 2, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Department Pipeline</Typography>
              {[
                { label: "Pending Approval", value: data.pending_dept_approval, color: "#f59e0b" },
                { label: "Approved & Forwarded", value: data.approved_by_dept, color: "#10b981" },
                { label: "Rejected", value: data.rejected_by_dept, color: "#ef4444" },
              ].map(({ label, value, color }) => {
                const total = Math.max(data.total_requests_all_time || 1, 1);
                return (
                  <Box key={label} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>{label}</Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ color }}>{value}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.round((value / total) * 100))}
                      sx={{ height: 6, borderRadius: 3, bgcolor: `${color}20`,
                        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
                    />
                  </Box>
                );
              })}
              <Divider sx={{ my: 2 }} />
              <Button
                fullWidth variant="outlined"
                onClick={() => navigate("/dept-approvals")}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2,
                  color: "#f59e0b", borderColor: "#f59e0b40",
                  "&:hover": { bgcolor: "#f59e0b10", borderColor: "#f59e0b" } }}
              >
                Open Approval Queue
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <RecentActivityCard
            title={`Recent Activity — ${deptLabel}`}
            items={data.recent_requests || []}
            icon="🕑"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
      const params = {};
      if (user?.role === "admin") {
        params.date_from = startDate;
        params.date_to = endDate;
      }
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

  // ── Dispatch to role-specific view ──
  const commonProps = { data, onRefresh: fetchData, loading };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }} className="page-enter">
      {role === "admin" && (
        <AdminDashboard
          {...commonProps}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      )}
      {role === "pass_officer" && <PassOfficerDashboard {...commonProps} />}
      {role === "operations_officer" && <OpsOfficerDashboard {...commonProps} />}
      {role === "security_gate_officer" && <GateOfficerDashboard {...commonProps} />}
      {role === "department_manager" && <DeptManagerDashboard {...commonProps} />}

      {/* Fallback for unknown roles */}
      {!["admin", "pass_officer", "operations_officer", "security_gate_officer", "department_manager"].includes(role) && (
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
