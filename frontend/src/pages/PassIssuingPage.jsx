import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import GroupPassDialog from "../features/passes/GroupPassDialog";
import { addVisitorsToGroup, createGroupPass } from "../features/group/groupApi";
import { createPass } from "../features/passes/passesApi";
import { getPassTypeConfig } from "../utils/passTypes";

function derivePassType(zone) {
  if (zone === "Zone 2") return getPassTypeConfig("red").value;
  if (zone === "Zone 3") return getPassTypeConfig("orange").value;
  if (zone === "Zone 4") return getPassTypeConfig("green").value;
  return getPassTypeConfig("blue").value;
}

export default function PassIssuingPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (payload) => {
    setLoading(true);
    setErrorMessage("");
    try {
      if (payload.mode === "single") {
        const { mode, zone, ...singlePass } = payload;
        await createPass({ ...singlePass, zone, pass_type: derivePassType(zone) });
        setSuccessMessage("Single pass issued successfully.");
      } else {
        const { mode, visitors, zone, ...groupPayload } = payload;
        const group = await createGroupPass({ ...groupPayload, zone, pass_type: derivePassType(zone) });
        await addVisitorsToGroup(group.id, payload.visitors);
        setSuccessMessage("Group pass created successfully.");
      }
      setOpen(false);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "Failed to issue pass. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Pass Issuing</Typography>
      <Typography variant="body2" color="text.secondary">Issue single passes or create group passes from one streamlined workflow.</Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {successMessage ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Alert severity="success">{successMessage}</Alert>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="contained" onClick={() => setOpen(true)}>
                  Issue Another Pass
                </Button>
                <Button variant="outlined" onClick={() => navigate("/passes")}>View Pass Management</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <GroupPassDialog open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} loading={loading} />
    </Stack>
  );
}
