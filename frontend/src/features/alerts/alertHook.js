import { useEffect } from "react";
import useAlertStore from "./alertStore";
import { checkOverdueAlerts, getActiveAlerts, getDashboardStats } from "./alertApi";

export function useDashboardAlerts() {
  const { setActiveAlerts, setStats, setAlertsLoading, setStatsLoading, setAlertsError, setStatsError, activeAlerts, stats } = useAlertStore();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setAlertsLoading(true);
        setStatsLoading(true);
        const [alerts, dashboard] = await Promise.all([getActiveAlerts(), getDashboardStats()]);
        if (!mounted) return;
        setActiveAlerts(alerts);
        setStats(dashboard);
      } catch (error) {
        if (!mounted) return;
        setAlertsError(error?.detail || "Failed to load alerts");
        setStatsError(error?.detail || "Failed to load dashboard stats");
      } finally {
        if (mounted) {
          setAlertsLoading(false);
          setStatsLoading(false);
        }
      }
    };
    load();
    const timer = setInterval(() => {
      checkOverdueAlerts().catch(() => {});
      load();
    }, 300000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [setActiveAlerts, setStats, setAlertsLoading, setStatsLoading, setAlertsError, setStatsError]);

  return { activeAlerts, stats };
}
