"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function MaintenanceCheck() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string }>({ enabled: false, message: "" });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch for users who weren't connected when maintenance was set
    const fetchMaintenance = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/protected/maintenance`);
        if (!res.ok) throw new Error("Failed to fetch maintenance status");
        const data = await res.json();
        if (mounted) {
          setMaintenance({ enabled: !!data.enabled, message: data.message || "The website is under maintenance." });
          setChecked(true);
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error);
        if (mounted) {
          setMaintenance({ enabled: false, message: "" });
          setChecked(true);
        }
      }
    };

    // Listen for real-time maintenance updates via socket
    const handleMaintenanceUpdate = (event: CustomEvent) => {
      if (mounted) {
        const { enabled, message } = event.detail;
        console.log('🔧 Real-time maintenance update received:', { enabled, message });
        setMaintenance({ 
          enabled: !!enabled, 
          message: message || "The website is under maintenance." 
        });
        setChecked(true);
      }
    };

    // Initial fetch
    fetchMaintenance();

    // Add socket event listener
    window.addEventListener('maintenance:update', handleMaintenanceUpdate as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('maintenance:update', handleMaintenanceUpdate as EventListener);
    };
  }, []);

  // Get role from user - we'll need to fetch it from backend
  // For now, check via API call
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    
    // Check if user is admin by calling protected endpoint
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/protected`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.user?.role === 'admin');
      })
      .catch(() => setIsAdmin(false));
  }, [user?.id]);

  if (!checked) return null;
  
  // Allow admins to access the site during maintenance
  if (maintenance.enabled && !isAdmin) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#fff",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Maintenance</h1>
          <p style={{ fontSize: 20 }}>{maintenance.message || "The website is under maintenance."}</p>
        </div>
      </div>
    );
  }
  return null;
} 