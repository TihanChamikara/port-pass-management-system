import { createTheme } from "@mui/material/styles";

const tokens = {
  light: {
    primary: "#0B4F6C",
    secondary: "#146C43",
    background: "#F4F7FA",
    paper: "#FFFFFF",
    text: "#1A2A33",
  },
  dark: {
    primary: "#77B6EA",
    secondary: "#7FD1AE",
    background: "#111921",
    paper: "#18242F",
    text: "#E5EEF5",
  },
};

export function getAppTheme(mode) {
  const t = tokens[mode] || tokens.light;

  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary },
      secondary: { main: t.secondary },
      background: {
        default: t.background,
        paper: t.paper,
      },
      text: { primary: t.text },
    },
    typography: {
      fontFamily: "'IBM Plex Sans', sans-serif",
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: "1px solid rgba(0,0,0,0.06)",
          },
        },
      },
    },
  });
}
