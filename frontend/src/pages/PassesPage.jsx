import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import PassFormDialog from "../features/passes/PassFormDialog";
import PassTable from "../features/passes/PassTable";
import { checkoutPass, createPass, exportPassesCsv, getPasses } from "../features/passes/passesApi";

const initialData = { items: [], total: 0, page: 1, page_size: 20 };

// Helper function to extract error message from various error response formats
const getErrorMessage = (error, defaultMessage) => {
  const detail = error.response?.data?.detail;
  if (!detail) return defaultMessage;
  
  // If detail is an array of validation errors, extract the first message
  if (Array.isArray(detail)) {
    const firstError = detail[0];
    if (firstError?.msg) return firstError.msg;
    if (typeof firstError === 'string') return firstError;
    return defaultMessage;
  }
  
  // If detail is a string, use it directly
  if (typeof detail === 'string') return detail;
  
  // Default
  return defaultMessage;
};

export default function PassesPage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState({ page: 1, page_size: 20, search: "", visitor_category: "", visit_area: "", visitor_type: "", access_level: "", target_date: "", sort: "desc" });
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const fetchData = async (customFilters = filters) => {
    setTableLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(customFilters).filter(([, value]) => value !== "" && value !== null));
      const response = await getPasses(params);
      setData(response);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load passes");
      setToast({ open: true, message, severity: "error" });
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const nextSrNo = useMemo(() => {
    if (!data.items.length) return 1;
    const max = Math.max(...data.items.map((item) => item.sr_no));
    return max + 1;
  }, [data.items]);

  const handleCreate = async (values) => {
    setLoading(true);
    try {
      await createPass(values);
      setOpen(false);
      setToast({ open: true, message: "Pass issued successfully", severity: "success" });
      fetchData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to issue pass");
      setToast({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (id) => {
    try {
      await checkoutPass(id);
      setToast({ open: true, message: "Pass marked as received", severity: "success" });
      fetchData();
    } catch (error) {
      const message = getErrorMessage(error, "Checkout failed");
      setToast({ open: true, message, severity: "error" });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  };

  const handleExport = async () => {
    const blob = await exportPassesCsv();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "passes_export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = (row) => {
    const w = window.open("", "_blank", "width=720,height=640");
    if (!w) return;
    w.document.write(`
      <html>
      <head><title>Visitor Pass ${row.pass_no}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Port Authority Visitor Pass</h2>
        <hr />
        <p><strong>Pass No:</strong> ${row.pass_no}</p>
        <p><strong>SR No:</strong> ${row.sr_no}</p>
        <p><strong>Visitor:</strong> ${row.visitor_name}</p>
        <p><strong>Company:</strong> ${row.company_name}</p>
        <p><strong>NIC:</strong> ${row.nic_number}</p>
        <p><strong>Contact:</strong> ${row.contact_number}</p>
        <p><strong>Visitor Category:</strong> ${row.visitor_category || "-"}</p>
        <p><strong>Visit Area:</strong> ${(row.visit_area || []).join(", ") || "-"}</p>
        <p><strong>Issued:</strong> ${new Date(row.issued_time).toLocaleString()}</p>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
            <div>
              <Typography variant="h5">Pass Management</Typography>
              <Typography variant="body2" color="text.secondary">
                Issue, track, search, and complete visitor passes.
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport}>
                Export CSV
              </Button>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
                Issue New Pass
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <PassTable
        data={data}
        loading={tableLoading}
        filters={filters}
        onFilterChange={handleFilterChange}
        onCheckout={handleCheckout}
        onPrint={handlePrint}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
      />

      <PassFormDialog open={open} onClose={() => setOpen(false)} onSubmit={handleCreate} loading={loading} nextSrNo={nextSrNo} />

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((p) => ({ ...p, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast((p) => ({ ...p, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
