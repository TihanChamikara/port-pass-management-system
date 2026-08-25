import React from "react";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BadgeIcon from "@mui/icons-material/Badge";
import SecurityIcon from "@mui/icons-material/Security";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../features/auth/authStore";
import { useUiStore } from "../app/uiStore";

const drawerWidth = 260;

const navItems = [
  { label: "Dashboard", to: "/", icon: DashboardIcon },
  { label: "Pass Management", to: "/passes", icon: BadgeIcon },
];

const adminNavItems = [
  { label: "User Management", to: "/admin/users", icon: SecurityIcon },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const mode = useUiStore((state) => state.mode);
  const toggleMode = useUiStore((state) => state.toggleMode);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const displayItems = user?.role === "admin" ? [...navItems, ...adminNavItems] : navItems;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            background: mode === 'dark' 
              ? "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)"
              : "linear-gradient(180deg, #0B4F6C 0%, #147A43 100%)",
            color: "#fff",
            borderRight: mode === 'dark' ? "1px solid #2a2a4e" : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          },
        }}
      >
        {/* Sidebar Header */}
        <Toolbar 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            minHeight: "70px",
            borderBottom: "2px solid rgba(255,255,255,0.1)",
            background: mode === 'dark'
              ? "rgba(0,0,0,0.3)"
              : "rgba(0,0,0,0.2)"
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 800, 
                fontSize: "1.25rem",
                letterSpacing: "0.5px",
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                fontFamily: "'Poppins', 'Inter', sans-serif"
              }}
            >
              Port Pass
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: "block",
                fontSize: "0.65rem",
                letterSpacing: "1px",
                opacity: 0.8,
                fontWeight: 600,
                textTransform: "uppercase"
              }}
            >
              Desk
            </Typography>
          </Box>
        </Toolbar>

        {/* Navigation Menu */}
        <List sx={{ px: 1.5, py: 3, flex: 1 }}>
          {displayItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  borderRadius: "12px",
                  mb: 1.5,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "4px",
                    background: "rgba(255,255,255,0)",
                    transition: "all 0.3s ease-out",
                  },
                  "&.active": {
                    backgroundColor: mode === 'dark'
                      ? "rgba(100, 150, 255, 0.2)"
                      : "rgba(255,255,255,0.25)",
                    boxShadow: mode === 'dark'
                      ? "0 4px 12px rgba(100, 150, 255, 0.2)"
                      : "0 4px 12px rgba(0,0,0,0.15)",
                    "&::before": {
                      width: "4px",
                      background: "rgba(255,255,255,1)",
                    },
                  },
                  "&:hover": {
                    backgroundColor: mode === 'dark'
                      ? "rgba(100, 150, 255, 0.15)"
                      : "rgba(255,255,255,0.15)",
                    transform: "translateX(4px)",
                  },
                  py: 1.5,
                  px: 2,
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    minWidth: 40,
                    color: "inherit",
                    fontSize: "1.4rem"
                  }}
                >
                  <Icon sx={{ fontSize: "1.4rem" }} />
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      letterSpacing: "0.2px",
                    }
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        {/* User Profile Section */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            background: mode === 'dark'
              ? "rgba(0,0,0,0.4)"
              : "rgba(0,0,0,0.15)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem",
                fontFamily: "'Poppins', 'Inter', sans-serif",
                mb: 0.5
              }}
            >
              {user?.full_name || "User"}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: "block",
                fontSize: "0.75rem",
                opacity: 0.8,
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px"
              }}
            >
              {user?.role || "Administrator"}
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}
        <AppBar 
          position="sticky" 
          color="inherit" 
          elevation={0}
          sx={{ 
            borderBottom: mode === 'dark'
              ? "1px solid #2a2a4e"
              : "1px solid rgba(0,0,0,0.08)",
            background: mode === 'dark'
              ? "linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)"
              : "linear-gradient(90deg, #fff 0%, #f8f9fa 100%)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                fontSize: "1.2rem",
                fontFamily: "'Poppins', 'Inter', sans-serif",
                background: mode === 'dark'
                  ? "linear-gradient(135deg, #64B5F6 0%, #81C784 100%)"
                  : "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: mode === 'dark' ? "transparent" : "inherit",
                letterSpacing: "0.3px"
              }}
            >
              Visitor Pass Issuing Management
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 500
                }}
              >
                {user?.full_name}
              </Typography>
              <IconButton 
                onClick={toggleMode} 
                color="inherit" 
                aria-label="toggle theme"
                sx={{
                  transition: "all 0.3s ease-out",
                  "&:hover": {
                    transform: "rotate(180deg)",
                    background: mode === 'dark'
                      ? "rgba(100, 150, 255, 0.1)"
                      : "rgba(0,0,0,0.05)"
                  }
                }}
              >
                {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
              <Button 
                startIcon={<LogoutIcon />} 
                onClick={onLogout} 
                color="inherit"
                sx={{
                  fontFamily: "'Poppins', 'Inter', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.3s ease-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                  }
                }}
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flex: 1, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
