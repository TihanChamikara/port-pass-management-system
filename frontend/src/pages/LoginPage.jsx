import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuthStore } from "../features/auth/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onChange" });

  const onSubmit = async (values) => {
    setError("");
    const result = await login(values.username, values.password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate("/welcome");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(11,79,108,0.2), transparent 45%), radial-gradient(circle at 80% 10%, rgba(20,108,67,0.25), transparent 40%)",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 440 }}>
        <CardContent>
          <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h5">Port Authority Pass Login</Typography>
            <Typography variant="body2" color="text.secondary">
              Use your office credentials to access pass operations.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              autoFocus
              {...register("username", { required: "Username is required" })}
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
            />
            <TextField
              label="Password"
              type="password"
              {...register("password", { required: "Password is required" })}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
            <Typography variant="caption" color="text.secondary">
          
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
