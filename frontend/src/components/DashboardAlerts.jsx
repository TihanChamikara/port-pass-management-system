import { Alert, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

export default function DashboardAlerts({ stats, alerts }) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1 }}><CardContent><Typography variant="body2" color="text.secondary">Active Passes</Typography><Typography variant="h4">{stats?.active_passes_count ?? 0}</Typography><Chip size="small" label="Yellow = Active" color="warning" sx={{ mt: 1 }} /></CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent><Typography variant="body2" color="text.secondary">Overdue Passes</Typography><Typography variant="h4" color="error.main">{stats?.overdue_passes_count ?? 0}</Typography><Chip size="small" label="Red = Overdue" color="error" sx={{ mt: 1 }} /></CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent><Typography variant="body2" color="text.secondary">Active Groups</Typography><Typography variant="h4">{stats?.active_groups_count ?? 0}</Typography><Chip size="small" label="Green = Completed" color="success" sx={{ mt: 1 }} /></CardContent></Card>
      </Stack>
      {alerts?.length ? alerts.slice(0, 3).map((alert) => <Alert key={alert.id} severity={alert.alert_type === "overdue" ? "error" : "warning"}>{alert.alert_type} alert for pass #{alert.pass_id}</Alert>) : null}
    </Stack>
  );
}
