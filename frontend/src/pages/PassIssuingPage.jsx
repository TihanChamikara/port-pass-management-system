import { 
  Card, 
  CardContent, 
  Stack, 
  Typography, 
  Box, 
  useTheme, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Snackbar,
  Alert,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from "@mui/material";
import { 
  BadgeOutlined as IdcardOutlined, 
  Print as PrintOutlined, 
  Visibility as VisibilityOutlined,
  CheckCircle as CheckCircleOutlined,
  HowToRegOutlined as VerifyIcon,
  CancelOutlined as CancelIcon,
  ErrorOutline as WarningIcon,
  DomainOutlined as OrganizationIcon,
  PersonOutlined as PersonIcon,
  PhoneOutlined as PhoneIcon,
  AssignmentOutlined as PurposeIcon
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import api from "../api/api";
import dayjs from "dayjs";

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
          transform: "translateZ(10px) rotateX(1deg)",
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
            fontSize: "1.1rem", 
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

export default function PassIssuingPage() {
  const theme = useTheme();
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, issued: 0 });
  const [issuedPass, setIssuedPass] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Fields edited by Pass Officer during verification
  const [reviewFields, setReviewFields] = useState({
    visitor_name: '',
    visitor_nic: '',
    visitor_phone: '',
    visitor_organization: '',
    primary_zone: '',
  });

  const ZONE_MAP = { 
    'zone_1': 'Zone 1', 
    'zone_2': 'Zone 2', 
    'zone_3': 'Zone 3', 
    'zone_4': 'Zone 4' 
  };
  
  const REVERSE_ZONE_MAP = {
    'Zone 1': 'zone_1',
    'Zone 2': 'zone_2',
    'Zone 3': 'zone_3',
    'Zone 4': 'zone_4'
  };

  const normalizeZone = (z) => ZONE_MAP[z?.toLowerCase()] || 'Zone 1';
  const ZONE_PASS_TYPE = { 
    'Zone 1': 'blue', 
    'Zone 2': 'red', 
    'Zone 3': 'orange', 
    'Zone 4': 'green' 
  };
  
  const ZONE_COLORS = {
    'Zone 1': '#3B82F6',
    'Zone 2': '#EF4444',
    'Zone 3': '#F59E0B',
    'Zone 4': '#10B981',
  };

  const fetchApproved = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/visitor-requests/for-pass-generation');
      setApprovedRequests(response.data.items);
      setStats(prev => ({ 
        ...prev,
        pending: response.data.items.length
      }));
    } catch (error) {
      console.error('Failed to fetch approved requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  // Validation rules matching backend
  const isValidPhone = (phone) => /^(?:\+94|0)\d{9}$/.test(phone.trim());
  const isValidNic = (nic) => /^(?:\d{9}[VXvx]|\d{12})$/.test(nic.trim());

  const handleOpenReview = (request) => {
    setSelectedRequest(request);
    const zones = request.requested_zones || [];
    const firstZone = zones[0] || 'zone_1';

    setReviewFields({
      visitor_name: request.visitor_name || '',
      visitor_nic: request.visitor_nic || '',
      visitor_phone: request.visitor_phone || '',
      visitor_organization: request.visitor_organization || '',
      primary_zone: firstZone,
    });
    setReviewModalVisible(true);
  };

  const handleConfirmIssuePass = async () => {
    // Validate inputs locally first
    if (!reviewFields.visitor_name.trim()) {
      setSnackbar({ open: true, message: 'Visitor name is required.', severity: 'warning' });
      return;
    }
    if (!isValidNic(reviewFields.visitor_nic)) {
      setSnackbar({ open: true, message: 'Invalid NIC format. Must be old NIC (9 digits + V/X) or new NIC (12 digits).', severity: 'warning' });
      return;
    }
    if (!isValidPhone(reviewFields.visitor_phone)) {
      setSnackbar({ open: true, message: 'Invalid phone format. Must start with 0 or +94 followed by 9 digits.', severity: 'warning' });
      return;
    }

    setIssuing(true);
    try {
      const zones = (selectedRequest.requested_zones || []).map(normalizeZone);
      const primaryZoneStr = normalizeZone(reviewFields.primary_zone);
      
      const passPayload = {
        visitor_name: reviewFields.visitor_name.trim(),
        company_name: reviewFields.visitor_organization.trim() || 'Not Provided',
        nic_number: reviewFields.visitor_nic.trim().toUpperCase(),
        contact_number: reviewFields.visitor_phone.trim(),
        pass_type: zones.length > 1 ? 'purple' : (ZONE_PASS_TYPE[primaryZoneStr] || 'blue'),
        zone: primaryZoneStr,
      };
      
      console.log('Issuing pass with payload:', passPayload);
      const passResponse = await api.post('/api/passes', passPayload);
      const passId = passResponse.data.id;
      setIssuedPass(passResponse.data);

      await api.post(`/api/visitor-requests/${selectedRequest.id}/mark-pass-issued?pass_record_id=${passId}`);
      
      setStats(prev => ({ ...prev, pending: prev.pending - 1, issued: prev.issued + 1 }));
      setReviewModalVisible(false);
      setPassModalVisible(true);
      fetchApproved();
    } catch (error) {
      console.error('Failed to issue pass:', error);
      const detail = error.response?.data?.detail;
      let errorMsg = 'Failed to issue pass. Please check backend validation.';
      if (typeof detail === 'string') errorMsg = detail;
      else if (Array.isArray(detail)) errorMsg = detail.map(e => e.msg || e).join(', ');
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setIssuing(false);
    }
  };

  const handlePrint = () => {
    if (!issuedPass) return;
    const w = window.open("", "_blank", "width=720,height=640");
    if (!w) return;
    w.document.write(`
      <html>
      <head>
        <title>Visitor Pass ${issuedPass.pass_no}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
          .pass-card { border: 2px solid #0B4F6C; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #0B4F6C; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; color: #0B4F6C; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .field { margin-bottom: 10px; }
          .label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; }
          .value { font-size: 15px; font-weight: bold; color: #111; }
          .zone-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; background: #0B4F6C; color: white; font-weight: bold; font-size: 12px; text-align: center; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #888; border-top: 1px dashed #ccc; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="pass-card">
          <div class="header">
            <h2>Port Authority Visitor Pass</h2>
            <span style="font-weight: bold; color: #666;">Pass ID: ${issuedPass.pass_no}</span>
          </div>
          <div class="grid">
            <div class="field">
              <div class="label">Visitor Name</div>
              <div class="value">${issuedPass.visitor_name}</div>
            </div>
            <div class="field">
              <div class="label">NIC / Passport</div>
              <div class="value">${issuedPass.nic_number}</div>
            </div>
            <div class="field">
              <div class="label">Organization</div>
              <div class="value">${issuedPass.company_name}</div>
            </div>
            <div class="field">
              <div class="label">Contact Phone</div>
              <div class="value">${issuedPass.contact_number}</div>
            </div>
            <div class="field">
              <div class="label">Host Department</div>
              <div class="value">${selectedRequest?.department_name || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Authorized Zone</div>
              <div class="value"><span class="zone-badge">${issuedPass.zone}</span></div>
            </div>
          </div>
          <div class="footer">
            Issued: ${new Date(issuedPass.issued_time).toLocaleString()} <br />
            Valid on date of issue only. Present this pass at security scan points.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  // Local validation checks for warning indicators
  const isNicValid = reviewFields.visitor_nic ? isValidNic(reviewFields.visitor_nic) : true;
  const isPhoneValid = reviewFields.visitor_phone ? isValidPhone(reviewFields.visitor_phone) : true;

  return (
    <Stack spacing={4} sx={{ p: { xs: 2, sm: 3, md: 4 } }} className="page-enter">
      {/* Premium Pass Officer Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0b1329 0%, #0f1e36 100%)',
        borderRadius: 3,
        p: { xs: 2.5, md: '20px 28px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        boxShadow: '0 4px 20px rgba(11,21,41,0.3)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(14,165,233,0.4)',
          }}>
            <IdcardOutlined sx={{ fontSize: 26, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.2px' }}>
              Pass Issuing
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.82rem' }}>
              Verify identity → Generate security access passes
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'Awaiting Issue', value: stats.pending, color: '#f59e0b' },
            { label: 'Issued Today', value: stats.issued, color: '#10b981' },
          ].map(s => (
            <Box key={s.label} sx={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${s.color}30`,
              borderLeft: `3px solid ${s.color}`,
              borderRadius: 1.5,
              px: 2, py: 1,
              minWidth: 90,
            }}>
              <Typography sx={{ color: s.color, fontWeight: 900, fontSize: '1.6rem', lineHeight: 1 }}>
                <AnimatedNumber value={s.value} />
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Requests Table */}
      <ChartCard title="Approved Requests Awaiting Pass Generation">
        <TableContainer 
          component={Paper} 
          sx={{ 
            boxShadow: "none",
            border: "none",
            overflowX: "auto",
            "& .MuiTableRow-root": {
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(11, 79, 108, 0.04)",
              }
            }
          }}
        >
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(11, 79, 108, 0.08)" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 140 }}>Request ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 180 }}>Visitor</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 130 }}>NIC / Passport</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 130 }}>Contact Phone</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 160 }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 200 }}>Host Details</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 120 }}>Zones</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 140 }}>Approved At</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Poppins', 'Inter', sans-serif", width: 160 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    <WarningIcon sx={{ fontSize: 36, mb: 1, color: "#94a3b8", display: "block", margin: "0 auto" }} />
                    No approved visitor requests are currently waiting.
                  </TableCell>
                </TableRow>
              ) : (
                approvedRequests.map((request, index) => (
                  <TableRow 
                    key={request.id}
                    sx={{ 
                      animation: `fadeInUp 0.5s ease-out ${0.1 + index * 0.05}s both`,
                      "&:last-child td": { borderBottom: 0 }
                    }}
                  >
                    {/* Request ID */}
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#0B4F6C", fontFamily: "'Poppins', 'Inter', sans-serif", fontSize: "0.875rem" }}>
                        {request.request_id}
                      </Typography>
                    </TableCell>

                    {/* Visitor */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: "#0B4F6C", width: 30, height: 30, fontSize: "0.8rem" }}>
                          {request.visitor_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                          {request.visitor_name}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* NIC / Passport */}
                    <TableCell>
                      <Typography sx={{ fontFamily: "'Poppins', 'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500 }}>
                        {request.visitor_nic || (
                          <Typography component="span" variant="caption" color="error" sx={{ fontWeight: 600 }}>MISSING</Typography>
                        )}
                      </Typography>
                    </TableCell>

                    {/* Contact Phone */}
                    <TableCell>
                      <Typography sx={{ fontFamily: "'Poppins', 'Inter', sans-serif", fontSize: "0.875rem" }}>
                        {request.visitor_phone || '—'}
                      </Typography>
                    </TableCell>

                    {/* Organization */}
                    <TableCell sx={{ fontFamily: "'Poppins', 'Inter', sans-serif", fontSize: "0.875rem" }}>
                      {request.visitor_organization || (
                        <Typography component="span" variant="caption" color="text.secondary">Individual</Typography>
                      )}
                    </TableCell>

                    {/* Host Details */}
                    <TableCell>
                      <Box>
                        {request.department_name && (
                          <Chip 
                            label={request.department_name} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", height: 18, mb: 0.5, fontWeight: 600 }}
                          />
                        )}
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.secondary" }}>
                          Host: {request.host_employee_name || 'Not specified'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Zones */}
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {(request.requested_zones || []).map((zone, idx) => {
                          const normalizedZone = normalizeZone(zone);
                          const color = ZONE_COLORS[normalizedZone] || "#3B82F6";
                          return (
                            <Chip
                              key={idx}
                              label={normalizedZone}
                              size="small"
                              sx={{
                                backgroundColor: `${color}15`,
                                color: color,
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                height: 20,
                                border: `1px solid ${color}30`,
                                fontFamily: "'Poppins', 'Inter', sans-serif"
                              }}
                            />
                          );
                        })}
                      </Box>
                    </TableCell>

                    {/* Approved At */}
                    <TableCell sx={{ fontFamily: "'Poppins', 'Inter', sans-serif", color: "text.secondary", fontSize: "0.8rem" }}>
                      {dayjs(request.updated_at).format('YYYY-MM-DD HH:mm')}
                    </TableCell>

                    {/* Action */}
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<VerifyIcon />}
                        onClick={() => handleOpenReview(request)}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          fontFamily: "'Poppins', 'Inter', sans-serif",
                          background: "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
                          borderRadius: "6px",
                          boxShadow: "0 2px 4px rgba(11, 79, 108, 0.15)",
                          "&:hover": {
                            background: "linear-gradient(135deg, #094058 0%, #116938 100%)",
                            transform: "translateY(-1px)",
                            boxShadow: "0 4px 8px rgba(11, 79, 108, 0.25)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        Verify &amp; Issue
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </ChartCard>

      {/* Review & Verify Identity Modal */}
      <Dialog
        open={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' 
              ? "0 20px 60px rgba(0,0,0,0.5)" 
              : "0 20px 60px rgba(0,0,0,0.15)",
            fontFamily: "'Poppins', 'Inter', sans-serif",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 800, 
          fontSize: "1.3rem",
          background: "linear-gradient(135deg, #0B4F6C 0%, #0369a1 100%)",
          color: "white",
          fontFamily: "'Poppins', 'Inter', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 2
        }}>
          <VerifyIcon sx={{ fontSize: 26 }} />
          Verify Visitor Details &amp; Issue Pass
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1.5 }}>
          {selectedRequest && (
            <Stack spacing={3}>
              {/* Alert Warning for Invalid Fields */}
              {(!isNicValid || !isPhoneValid) && (
                <Alert severity="error" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Formatting issue detected with Visitor inputs. Please verify with their physical ID and correct them before generating.
                  </Typography>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "0.8rem" }}>
                    {!isNicValid && <li>NIC format is invalid (requires 9 digits + V/X, or 12 digits).</li>}
                    {!isPhoneValid && <li>Phone number format is invalid (requires 07XXXXXXXX or +947XXXXXXXX).</li>}
                  </ul>
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Left Column: Editable Identity Details */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "#0B4F6C", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0", pb: 0.5 }}>
                    Identity Verification
                  </Typography>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Visitor Name"
                      value={reviewFields.visitor_name}
                      onChange={(e) => setReviewFields(prev => ({ ...prev, visitor_name: e.target.value }))}
                      fullWidth
                      size="small"
                      required
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />,
                      }}
                    />
                    
                    <TextField
                      label="NIC / Passport Number"
                      value={reviewFields.visitor_nic}
                      onChange={(e) => setReviewFields(prev => ({ ...prev, visitor_nic: e.target.value }))}
                      fullWidth
                      size="small"
                      required
                      error={!isNicValid}
                      helperText={!isNicValid ? "Must match Sri Lankan format: 9 digits + V/X or 12 digits" : "e.g. 199012345678 or 901234567V"}
                      InputProps={{
                        startAdornment: <IdcardOutlined sx={{ color: !isNicValid ? "error.main" : "text.secondary", mr: 1, fontSize: 20 }} />,
                      }}
                    />
                    
                    <TextField
                      label="Contact Number"
                      value={reviewFields.visitor_phone}
                      onChange={(e) => setReviewFields(prev => ({ ...prev, visitor_phone: e.target.value }))}
                      fullWidth
                      size="small"
                      required
                      error={!isPhoneValid}
                      helperText={!isPhoneValid ? "Must start with 0 or +94 followed by 9 digits" : "e.g. 0771234567"}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ color: !isPhoneValid ? "error.main" : "text.secondary", mr: 1, fontSize: 20 }} />,
                      }}
                    />

                    <TextField
                      label="Company / Organization"
                      value={reviewFields.visitor_organization}
                      onChange={(e) => setReviewFields(prev => ({ ...prev, visitor_organization: e.target.value }))}
                      fullWidth
                      size="small"
                      placeholder="Individual (if left empty)"
                      InputProps={{
                        startAdornment: <OrganizationIcon sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Stack>
                </Grid>

                {/* Right Column: Read-Only Visit Details */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "#0B4F6C", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0", pb: 0.5 }}>
                    Access &amp; Visit Details
                  </Typography>
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Requester Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest.requester_name || 'N/A'}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Host Employee</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest.host_employee_name || 'N/A'}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Host Department</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest.department_name || 'N/A'}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Purpose of Visit</Typography>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>&quot;{selectedRequest.visitor_purpose}&quot;</Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Visit Start</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(selectedRequest.requested_date).format('YYYY-MM-DD HH:mm')}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Visit End</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(selectedRequest.requested_end_date).format('YYYY-MM-DD HH:mm')}</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <FormControl fullWidth size="small">
                      <InputLabel id="primary-zone-label">Default Access Zone</InputLabel>
                      <Select
                        labelId="primary-zone-label"
                        value={reviewFields.primary_zone}
                        label="Default Access Zone"
                        onChange={(e) => setReviewFields(prev => ({ ...prev, primary_zone: e.target.value }))}
                      >
                        {(selectedRequest.requested_zones || []).map((zone) => (
                          <MenuItem key={zone} value={zone}>
                            {normalizeZone(zone)}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Must select one of the approved zones requested by the visitor.</FormHelperText>
                    </FormControl>

                    {selectedRequest.vehicle_number && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Vehicle Plate</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0B4F6C" }}>{selectedRequest.vehicle_number}</Typography>
                      </Box>
                    )}

                    {selectedRequest.carrying_equipment && (
                      <Box sx={{ p: 1, border: "1px solid #fca5a5", borderRadius: 1.5, bgcolor: "#fef2f2" }}>
                        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>Carrying Equipment</Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{selectedRequest.equipment_description || 'Yes (description unavailable)'}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1, borderTop: "1px solid #f1f5f9" }}>
          <Button
            variant="outlined"
            onClick={() => setReviewModalVisible(false)}
            startIcon={<CancelIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: "'Poppins', 'Inter', sans-serif",
            }}
          >
            Cancel Review
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmIssuePass}
            disabled={issuing || !isNicValid || !isPhoneValid}
            startIcon={<VerifyIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontFamily: "'Poppins', 'Inter', sans-serif",
              background: "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #094058 0%, #116938 100%)",
              },
            }}
          >
            {issuing ? 'Verifying & Generating…' : 'Approve & Issue Pass'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pass Modal (Print Screen) */}
      <Dialog
        open={passModalVisible}
        onClose={() => setPassModalVisible(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' 
              ? "0 20px 60px rgba(0,0,0,0.5)" 
              : "0 20px 60px rgba(0,0,0,0.15)",
            fontFamily: "'Poppins', 'Inter', sans-serif",
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: "center", 
          fontWeight: 800, 
          fontSize: "1.4rem",
          background: "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
          color: "white",
          fontFamily: "'Poppins', 'Inter', sans-serif",
          pb: 2
        }}>
          <CheckCircleOutlined sx={{ fontSize: 44, mb: 1, display: "block", margin: "0 auto" }} />
          Pass Generated Successfully
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedRequest && issuedPass && (
            <Box sx={{ py: 1 }}>
              {/* Styled Pass Preview Card */}
              <Box 
                id="printable-pass"
                sx={{ 
                  p: 3.5, 
                  background: theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
                  border: "2px solid #0B4F6C",
                  borderRadius: 3,
                  mb: 1,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                }}
              >
                <Typography sx={{ 
                  fontWeight: 800, 
                  fontSize: "1.1rem", 
                  mb: 2.5,
                  textAlign: "center",
                  color: "#0B4F6C",
                  letterSpacing: 1,
                  borderBottom: "2px solid #0B4F6C",
                  pb: 1,
                  textTransform: "uppercase"
                }}>
                  Port Authority Pass
                </Typography>
                
                <Grid container spacing={2.5} sx={{ textAlign: "left", mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Visitor Name
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "'Poppins', 'Inter', sans-serif", color: "#1e293b" }}>
                      {issuedPass.visitor_name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Pass Number
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1rem", fontFamily: "'Poppins', 'Inter', sans-serif", color: "#0B4F6C" }}>
                      {issuedPass.pass_no}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      NIC / Passport
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                      {issuedPass.nic_number}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Organization
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                      {issuedPass.company_name}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Host Department
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                      {selectedRequest.department_name || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Valid On
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                      {dayjs(issuedPass.issued_time).format('YYYY-MM-DD')}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2.5, textAlign: "center", pt: 2, borderTop: "1px dashed #cbd5e1" }}>
                  <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", mb: 1, letterSpacing: 0.5 }}>
                    Authorized Access Zone
                  </Typography>
                  <Chip
                    label={issuedPass.zone.toUpperCase()}
                    sx={{
                      backgroundColor: `${ZONE_COLORS[issuedPass.zone] || '#0B4F6C'}`,
                      color: "white",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      px: 2,
                      py: 0.5,
                      borderRadius: 1.5,
                      fontFamily: "'Poppins', 'Inter', sans-serif",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5, textAlign: "center" }}>
                To print physical badge card, click &quot;Print Pass&quot; below.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, borderTop: "1px solid #f1f5f9" }}>
          <Button
            variant="outlined"
            onClick={() => setPassModalVisible(false)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: "'Poppins', 'Inter', sans-serif",
            }}
          >
            Close Dialog
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintOutlined />}
            onClick={handlePrint}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontFamily: "'Poppins', 'Inter', sans-serif",
              background: "linear-gradient(135deg, #0B4F6C 0%, #147A43 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #094058 0%, #116938 100%)",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(11, 79, 108, 0.3)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Print Pass
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
