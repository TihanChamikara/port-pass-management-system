import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Container,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  CheckCircle,
  Security,
  LocalPolice,
  Assignment,
  Navigation as NavigationIcon,
} from "@mui/icons-material";
import { useAuthStore } from "../features/auth/authStore";

const WelcomePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [fadeIn, setFadeIn] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    const timer = setTimeout(() => setFadeIn(true), 100);
    const contentTimer = setTimeout(() => setShowContent(true), 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(contentTimer);
    };
  }, []);

  if (!token) {
    return null;
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
        }}
      >
        <Typography variant="h6">Loading your welcome page...</Typography>
      </Box>
    );
  }

  const getRoleDescription = () => {
    switch (user.role) {
      case "staff":
        return "As a Staff member, you can manage and issue zone access passes.";
      case "security":
        return "As a Security member, you can validate and verify zone access passes.";
      case "admin":
        return "As an Admin, you have full control over the system, including user management and zone configuration.";
      default:
        return "Welcome to the Zone Pass Management System.";
    }
  };

  const getQuickStartItems = () => {
    const items = [
      {
        icon: <Assignment sx={{ color: "primary.main" }} />,
        title: "Dashboard",
        description: "View zone utilization and pass statistics",
        action: () => navigate("/"),
      },
      {
        icon: <NavigationIcon sx={{ color: "info.main" }} />,
        title: "Manage Passes",
        description: "Issue and manage zone access passes",
        action: () => navigate("/passes"),
      },
    ];

    if (user.role === "admin") {
      items.push({
        icon: <Security sx={{ color: "error.main" }} />,
        title: "User Management",
        description: "Create and manage system users",
        action: () => navigate("/admin/users"),
      });
    }

    return items;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 0.8s ease-in-out",
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            transform: showContent ? "translateY(0)" : "translateY(20px)",
            opacity: showContent ? 1 : 0,
            transition: "all 0.6s ease-out",
          }}
        >
          {/* Welcome Card */}
          <Card
            sx={{
              mb: 3,
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <Box sx={{ mb: 3 }}>
                <LocalPolice
                  sx={{
                    fontSize: 80,
                    color: "primary.main",
                    animation: "bounce 2s infinite",
                    "@keyframes bounce": {
                      "0%, 100%": { transform: "translateY(0)" },
                      "50%": { transform: "translateY(-10px)" },
                    },
                  }}
                />
              </Box>

              <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
                Welcome, {user.full_name}! 👋
              </Typography>

              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                You've been added to the Zone Pass Management System
              </Typography>

              <Box
                sx={{
                  backgroundColor: "info.lighter",
                  p: 2,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "info.light",
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Your Role:</strong>
                </Typography>
                <Typography variant="body2" color="primary">
                  {getRoleDescription()}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              🚀 Quick Start Guide
            </Typography>

            <List sx={{ py: 0 }}>
              {getQuickStartItems().map((item, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    mb: 1,
                    backgroundColor: "action.hover",
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "action.selected",
                      transform: "translateX(4px)",
                    },
                  }}
                  onClick={item.action}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: "600" }}>
                        {item.title}
                      </Typography>
                    }
                    secondary={item.description}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Important Notes */}
          <Paper sx={{ p: 3, backgroundColor: "warning.lighter", borderRadius: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <CheckCircle sx={{ color: "success.main", mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  Important Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  ✓ Your account is now active and ready to use
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  ✓ Keep your password secure and never share it
                </Typography>
                <Typography variant="body2">
                  ✓ Contact your admin if you need to change your role or have access issues
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate("/")}
              sx={{ py: 1.5 }}
            >
              View Dashboard
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => navigate("/passes")}
              sx={{ py: 1.5 }}
            >
              Get Started
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomePage;
