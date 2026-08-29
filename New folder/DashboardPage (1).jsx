import { Card, CardContent, Grid2, Stack, Typography, Box, useTheme, TextField, Button } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

import api from "../api/client";
import { fetchDashboardSummary } from "../features/dashboard/dashboardApi";
import { PASS_TYPES } from "../utils/passTypes";

const STATUS_COLORS = { active: "#F59E0B", completed: "#10B981" };
const ZONE_PASS_COUNTS = [
  { zone: "Zone 1", passes: 75 },
  { zone: "Zone 2", passes: 78 },
  { zone: "Zone 3", passes: 79 },
  { zone: "Zone 4", passes: 50 },
];

function shadeHexColor(color, percent) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  const num = Number.parseInt(normalized, 16);
  const amount = Math.max(-100, Math.min(100, percent));
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount) / 100;
  const red = Math.round((target - ((num >> 16) & 255)) * p) + ((num >> 16) & 255);
  const green = Math.round((target - ((num >> 8) & 255)) * p) + ((num >> 8) & 255);
  const blue = Math.round((target - (num & 255)) * p) + (num & 255);
  return `#${(0x1000000 + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

function Pie3DChart({ data, height = 300, isDarkMode }) {
  const depthFill = isDarkMode ? 58 : 42;
  const frontShadow = isDarkMode ? "0 10px 28px rgba(0,0,0,0.45)" : "0 8px 20px rgba(15,23,42,0.18)";

  return (
    <Box sx={{ perspective: "1200px", transform: "rotateX(16deg)", transformStyle: "preserve-3d" }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="54%"
            innerRadius={60}
            outerRadius={102}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`depth-${index}`} fill={shadeHexColor(entry.color, -depthFill)} />
            ))}
          </Pie>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            animationDuration={800}
            animationEasing="ease-out"
            stroke="none"
            style={{ filter: `drop-shadow(${frontShadow})` }}
          >
            {data.map((entry, index) => (
              <Cell key={`front-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value} passes`}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
              padding: "8px 12px",
              backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
              color: isDarkMode ? "#F8FAFC" : "#0F172A",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Animated number counter component
function AnimatedNumber({ value, duration = 1.5 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startValue = 0;
    const increment = value / (duration * 10);
    const interval = setInterval(() => {
      startValue += increment;
      if (startValue >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(startValue));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

function StatCard({ title, value, color, icon }) {
  const theme = useTheme();
  return (
    <Card 
      sx={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "none",
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' 
          ? "0 2px 8px rgba(0,0,0,0.3)" 
          : "0 2px 8px rgba(0,0,0,0.08)",
        animation: "fadeInUp 0.6s ease-out",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: theme.palette.mode === 'dark'
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.12)",
          transform: "translateY(-4px)",
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 600, 
                fontSize: "0.875rem", 
                letterSpacing: 0.5,
                fontFamily: "'Poppins', 'Inter', sans-serif",
                textTransform: "uppercase"
              }}
            >
              {title}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "2.5rem", lineHeight: 1, ml: 1 }}>
            {icon}
          </Typography>
        </Box>
        <Typography 
          variant="h4" 
          sx={{ 
            color, 
            fontWeight: 800, 
            fontSize: "2.5rem", 
            lineHeight: 1.2,
            fontFamily: "'Poppins', 'Inter', sans-serif"
          }}
        >
          <AnimatedNumber value={value} />
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  const theme = useTheme();
  return (
    <Card 
      sx={{ 
        height: "100%",
        border: "none",
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark'
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        animation: "fadeInUp 0.6s ease-out",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        perspective: "1000px",
        "&:hover": {
          boxShadow: theme.palette.mode === 'dark'
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.12)",
          transform: "translateZ(10px) rotateX(2deg)",
        }
      }}
    >
      <CardContent sx={{ 
        p: 3, 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        perspective: "1000px"
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 3, 
            fontWeight: 700, 
            fontSize: "1rem", 
            letterSpacing: 0.3,
            fontFamily: "'Poppins', 'Inter', sans-serif"
          }}
        >
          {title}
        </Typography>
        <Box sx={{ 
          flex: 1,
          perspective: "1000px",
          transformStyle: "preserve-3d"
        }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const axisLabelColor = theme.palette.mode === 'dark' ? '#F8FAFC' : '#0F172A';
  const axisLineColor = theme.palette.mode === 'dark' ? '#94A3B8' : '#475569';
  const gridColor = theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.25)' : '#E5E7EB';
  const tooltipBg = theme.palette.mode === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipText = theme.palette.mode === 'dark' ? '#F8FAFC' : '#0F172A';
  const [summary, setSummary] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCapacities, setEditCapacities] = useState({});

  const fetchData = async () => {
    try {
      // Fetch current user
      const userResponse = await api.get("/auth/me");
      setCurrentUser(userResponse.data);

      const { data } = await api.get("/dashboard/summary", {
        params: {
          date_from: startDate,
          date_to: endDate,
        },
      });
      setSummary(data);
      // Initialize edit capacities with current values
      const capacities = {};
      if (data.zone_capacities) {
        Object.entries(data.zone_capacities).forEach(([zone, capacity]) => {
          capacities[zone] = capacity;
        });
      }
      setEditCapacities(capacities);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      if (error.response?.status === 401) {
        // Fall back to using dashboardApi if auth lookup fails
        fetchDashboardSummary(startDate, endDate).then(setSummary);
      }
    }
  };

  const handleSaveCapacities = async () => {
    try {
      // Save all edited capacities
      const updates = Object.entries(editCapacities).map(([zone, capacity]) => 
        api.patch(`/zones/capacities/${zone}`, { capacity: parseInt(capacity, 10) || 0 })
      );
      
      const results = await Promise.all(updates);
      const allSuccess = results.every((response) => response.status >= 200 && response.status < 300);
      
      if (allSuccess) {
        setIsEditMode(false);
        fetchData(); // Refresh the data
      } else {
        alert("Error saving zone capacities");
      }
    } catch (error) {
      console.error("Error saving capacities:", error);
      alert("Error saving zone capacities");
    }
  };

  useEffect(() => {
    fetchData();
    
    // Add animation keyframes and custom fonts
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap');
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translate3d(0, 20px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      * {
        font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }, [startDate, endDate]);

  if (!summary) {
    return <Typography>Loading dashboard...</Typography>;
  }

  // Status data for pie chart
  const statusData = [
    { name: "Active", value: summary.active_total, color: STATUS_COLORS.active },
    { name: "Completed", value: summary.completed_total, color: STATUS_COLORS.completed },
  ];

  // Pass type data for pie chart
  const passTypeData = PASS_TYPES.map((type) => ({
    name: type.label,
    value: summary.pass_type_distribution?.[type.value] ?? 0,
    color: type.color,
  })).filter((item) => item.value > 0);

  const izedStatusData = statusData.map((item) => ({
    ...item,
    color: item.color,
  }));

  const izedPassTypeData = passTypeData.map((item) => ({
    ...item,
    color: item.color,
  }));

  const zoneLabels = {
    "Zone 1": "Zone 1",
    "Zone 2": "Zone 2",
    "Zone 3": "Zone 3",
    "Zone 4": "Zone 4",
  };

  const zoneUtilizationData = summary.zone_stats.map((item) => {
    const capacity = summary.zone_capacities?.[item.zone] ?? 0;
    const issued = summary.zone_access_distribution?.[item.zone] ?? 0;
    const utilization = capacity > 0 ? Math.round((issued / capacity) * 100) : 0;

    return {
      name: item.zone,
      issued,
      capacity,
      utilization,
      remaining: Math.max(0, capacity - issued),
    };
  });

  return (
    <Stack spacing={4} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header with Date Filters */}
      <Box sx={{ animation: "fadeInUp 0.6s ease-out 0.1s both" }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 800, 
            mb: 2.5, 
            fontSize: { xs: "1.75rem", md: "2.5rem" },
            fontFamily: "'Poppins', 'Inter', sans-serif",
            letterSpacing: "-0.5px",
            background: theme.palette.mode === 'dark'
              ? "linear-gradient(135deg, #64B5F6 0%, #81C784 100%)"
              : "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            fontWeight: 400, 
            fontSize: "0.95rem", 
            letterSpacing: 0.3,
            fontFamily: "'Poppins', 'Inter', sans-serif",
            mb: 2.5
          }}
        >
          Real-time pass and zone statistics
        </Typography>

        {/* Date Range Filter */}
        <Grid2 container spacing={2} sx={{ maxWidth: "600px" }}>
          <Grid2 size={{ xs: 6, sm: 5 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ 
                fontFamily: "'Poppins', 'Inter', sans-serif",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 4px 16px rgba(11, 79, 108, 0.15)",
                  },
                },
                "& .MuiInputBase-input": {
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                },
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 5 }}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ 
                fontFamily: "'Poppins', 'Inter', sans-serif",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 4px 16px rgba(11, 79, 108, 0.15)",
                  },
                },
                "& .MuiInputBase-input": {
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                },
              }}
            />
          </Grid2>
        </Grid2>
      </Box>

      {/* KPI Cards */}
      <Grid2 container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard 
            title="Passes in Range" 
            value={summary.today_total} 
            color="#1976D2"
            icon="📅"
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard 
            title="Active Passes" 
            value={summary.active_total} 
            color="#F59E0B"
            icon="⏳"
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard 
            title="Completed Passes" 
            value={summary.completed_total} 
            color="#10B981"
            icon="✓"
          />
        </Grid2>
      </Grid2>

      {/* Charts Section */}
      <Grid2 container spacing={{ xs: 2.5, sm: 3, md: 3 }}>
        {/* Status Overview */}
        {statusData.filter(d => d.value > 0).length > 0 && (
          <Grid2 size={{ xs: 12, md: 6 }}>
            <ChartCard title="Pass Status">
              <Pie3DChart data={izedStatusData.filter((item) => item.value > 0)} isDarkMode={theme.palette.mode === 'dark'} />
            </ChartCard>
          </Grid2>
        )}

        {/* Pass Type Distribution */}
        {passTypeData.length > 0 && (
          <Grid2 size={{ xs: 12, md: 6 }}>
            <ChartCard title="Pass Types Distribution">
              <Pie3DChart data={izedPassTypeData} isDarkMode={theme.palette.mode === 'dark'} />
            </ChartCard>
          </Grid2>
        )}
      </Grid2>

      {/* Zone Analytics */}
      <Grid2 container spacing={{ xs: 2.5, sm: 3, md: 3 }}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <ChartCard title="Zone Activity">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.zone_stats} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="zone"
                  stroke={axisLineColor}
                  tick={{ fill: axisLabelColor, fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                />
                <YAxis
                  stroke={axisLineColor}
                  tick={{ fill: axisLabelColor, fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: theme.palette.mode === 'dark' ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
                    padding: "12px",
                    backgroundColor: tooltipBg,
                    color: tooltipText
                  }}
                  labelStyle={{ color: tooltipText, fontWeight: 700 }}
                  itemStyle={{ color: tooltipText }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "13px", color: axisLabelColor }} />
                <Bar dataKey="active" fill="#F59E0B" name="Active" radius={[8, 8, 0, 0]} animationDuration={800} />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[8, 8, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <ChartCard title="Zone Utilization">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneUtilizationData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={axisLineColor}
                  tick={{ fill: axisLabelColor, fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                />
                <YAxis
                  stroke={axisLineColor}
                  tick={{ fill: axisLabelColor, fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: theme.palette.mode === 'dark' ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.15)",
                    padding: "12px",
                    backgroundColor: tooltipBg,
                    color: tooltipText
                  }}
                  labelStyle={{ color: tooltipText, fontWeight: 700 }}
                  itemStyle={{ color: tooltipText }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  formatter={(value, name) => {
                    if (name === "issued") return [value, "Issued"];
                    if (name === "remaining") return [value, "Remaining"];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "13px", color: axisLabelColor }} />
                <Bar dataKey="issued" fill="#F59E0B" name="Issued" radius={[8, 8, 0, 0]} animationDuration={800} />
                <Bar dataKey="remaining" fill="#10B981" name="Remaining" radius={[8, 8, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid2>
      </Grid2>

      {/* Zone Pass Allocation */}
      <ChartCard title="Zone Pass Allocation">
        <Stack spacing={3}>
          {/* Edit Button Row - Only show for admin */}
          {currentUser?.role === "admin" && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {!isEditMode ? (
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditMode(true)}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Edit Capacities
                </Button>
              ) : (
                <>
                  <Button 
                    variant="contained" 
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveCapacities}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                    color="success"
                  >
                    Save
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      setIsEditMode(false);
                      // Reset to current values
                      const capacities = {};
                      if (summary?.zone_capacities) {
                        Object.entries(summary.zone_capacities).forEach(([zone, capacity]) => {
                          capacities[zone] = capacity;
                        });
                      }
                      setEditCapacities(capacities);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Zone Capacity Cards */}
          <Grid2 container spacing={{ xs: 2, sm: 2.5, md: 2 }}>
            {Object.entries(summary?.zone_capacities || {}).map(([zone, capacity], index) => (
              <Grid2
                key={zone}
                size={{ xs: 12, sm: 6, md: 3 }}
                sx={{ animation: `fadeInUp 0.6s ease-out ${0.2 + index * 0.08}s both` }}
              >
                {isEditMode && currentUser?.role === "admin" ? (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor: "primary.main",
                      background: theme.palette.mode === 'dark' ? "rgba(100, 181, 246, 0.05)" : "rgba(11, 79, 108, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 140,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontFamily: "'Poppins', 'Inter', sans-serif",
                        mb: 2,
                      }}
                    >
                        {zoneLabels[zone] || zone}
                    </Typography>
                    <TextField
                      type="number"
                      value={editCapacities[zone] || 0}
                      onChange={(e) => setEditCapacities({
                        ...editCapacities,
                        [zone]: e.target.value
                      })}
                      size="small"
                      sx={{ width: "100px", textAlign: "center" }}
                      inputProps={{ style: { textAlign: "center", fontSize: "1.5rem", fontWeight: 800 } }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      background: theme.palette.mode === 'dark' ? "rgba(255,255,255,0.03)" : "rgba(11, 79, 108, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 120,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: theme.palette.mode === 'dark'
                          ? "0 8px 24px rgba(0,0,0,0.35)"
                          : "0 8px 24px rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontFamily: "'Poppins', 'Inter', sans-serif",
                        mb: 1,
                      }}
                    >
                        {zoneLabels[zone] || zone}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        lineHeight: 1,
                        color: "#0B4F6C",
                        fontFamily: "'Poppins', 'Inter', sans-serif",
                      }}
                    >
                      {capacity}
                    </Typography>
                  </Box>
                )}
              </Grid2>
            ))}
          </Grid2>
        </Stack>
      </ChartCard>

      {/* Pass Types Summary */}
      <ChartCard title="Pass Types Summary">
        <Grid2 container spacing={{ xs: 2, sm: 2.5, md: 2 }}>
          {PASS_TYPES.map((item, index) => (
            <Grid2 
              key={item.value} 
              size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}
              sx={{ animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.05}s both` }}
            >
              <Box
                sx={{
                  p: 2.5,
                  border: `2px solid ${item.color}`,
                  borderRadius: 2,
                  textAlign: "center",
                  background: `${item.color}08`,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  minHeight: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  "&:hover": {
                    transform: "translateY(-6px) scale(1.05)",
                    boxShadow: `0 12px 24px ${item.color}25`,
                    background: `${item.color}12`,
                    borderColor: item.color,
                  },
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 1.5, 
                    color: "text.secondary", 
                    fontSize: "0.875rem",
                    fontFamily: "'Poppins', 'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {item.label}
                </Typography>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    color: item.color, 
                    fontWeight: 800, 
                    fontSize: "2rem", 
                    lineHeight: 1,
                    fontFamily: "'Poppins', 'Inter', sans-serif"
                  }}
                >
                  <AnimatedNumber value={summary.pass_type_distribution?.[item.value] ?? 0} duration={1.2} />
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: "text.secondary", 
                    mt: 1.5, 
                    display: "block", 
                    fontSize: "0.75rem",
                    fontFamily: "'Poppins', 'Inter', sans-serif",
                    fontWeight: 500
                  }}
                >
                  {item.zone || "All Zones"}
                </Typography>
              </Box>
            </Grid2>
          ))}
        </Grid2>
      </ChartCard>
    </Stack>
  );
}
