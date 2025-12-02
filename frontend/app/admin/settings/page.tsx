"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Save, Shield, Bell, Globe, Loader2, Database, FileText, Zap, Package } from "lucide-react"
import { useState, useEffect } from "react"
import { useAdminApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function AdminSettings() {
  const { triggerBackup, downloadLogs, getMaintenance, setMaintenance, getAiConfig, updateAiConfig } = useAdminApi();
  const { toast } = useToast();
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('The website is under maintenance.');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceFeedback, setMaintenanceFeedback] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [freeMonthlyOutfits, setFreeMonthlyOutfits] = useState<number>(3);
  const [plans, setPlans] = useState<Array<{ key: string; name: string; monthlyOutfitLimit: number | null; amountCents?: number | null; stripePriceId?: string }>>([]);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  useEffect(() => {
    getMaintenance().then((data) => {
      setMaintenanceEnabled(!!data.enabled);
      setMaintenanceMessage(data.message || 'The website is under maintenance.');
    });
    // Load AI config
    setAiLoading(true);
    getAiConfig()
      .then((data: any) => {
        if (data?.config) {
          setFreeMonthlyOutfits(data.config.freeMonthlyOutfits ?? 3);
          setPlans(data.config.plans || []);
        }
      })
      .catch((err: any) => {
        console.error("Failed to load AI config", err);
      })
      .finally(() => setAiLoading(false));
  }, [getMaintenance, getAiConfig]);

  // Subscription transactions are shown on a dedicated admin page now.

  const handleMaintenanceSave = async () => {
    setMaintenanceLoading(true);
    setMaintenanceFeedback(null);
    try {
      await setMaintenance(maintenanceEnabled, maintenanceMessage);
      setMaintenanceFeedback('Maintenance settings updated.');
      toast({
        title: maintenanceEnabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: maintenanceEnabled
          ? "The platform is now in maintenance mode. Only admins can access the site."
          : "Maintenance mode is now off. All users can access the site.",
      });
      if (maintenanceEnabled) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      setMaintenanceFeedback(err.message || 'Failed to update maintenance settings.');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleAiSave = async () => {
    setAiLoading(true);
    setAiFeedback(null);
    try {
      await updateAiConfig({
        freeMonthlyOutfits,
        plans,
      });
      setAiFeedback("AI configuration updated.");
      toast({
        title: "AI Settings Saved",
        description: "Free tier and subscription packages have been updated.",
      });
    } catch (err: any) {
      setAiFeedback(err.message || "Failed to update AI configuration.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddPlan = () => {
    setPlans(prev => [
      ...prev,
      {
        key: `plan-${prev.length + 1}`,
        name: "New plan",
        monthlyOutfitLimit: 10,
        stripePriceId: "",
      },
    ]);
  };

  const handleUpdatePlan = (index: number, field: keyof (typeof plans)[number], value: any) => {
    setPlans(prev => prev.map((plan, i) => (i === index ? { ...plan, [field]: value } : plan)));
  };

  const handleDeletePlan = (index: number) => {
    setPlans(prev => prev.filter((_, i) => i !== index));
  };

  // Listen for real-time maintenance updates (in case another admin updates it)
  useEffect(() => {
    const handleMaintenanceUpdate = (data: any) => {
      setMaintenanceEnabled(data.enabled);
      setMaintenanceMessage(data.message);
      setLastUpdatedBy(data.updatedBy);
    };

    window.addEventListener('maintenance:update', handleMaintenanceUpdate as EventListener);

    return () => {
      window.removeEventListener('maintenance:update', handleMaintenanceUpdate as EventListener);
    };
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const res = await triggerBackup();
      setBackupMessage(res.message || "Backup completed");
    } catch (err: any) {
      setBackupMessage(err.message || "Backup failed");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadLogs = async () => {
    setLogLoading(true);
    try {
      const blob = await downloadLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app.log';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download logs");
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage platform settings and configurations</p>
      </div>

   

      {/* AI Outfit Generation Settings */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900 dark:text-white">
            <Zap className="w-5 h-5 mr-2" />
            AI Outfit Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Free tier config */}
          <div className="mb-4">
            <p className="font-medium text-gray-900 dark:text-white">Free tier</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              How many outfits a user can generate per month without a subscription.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={freeMonthlyOutfits}
                onChange={e => setFreeMonthlyOutfits(Number(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">free outfits / month</span>
            </div>
          </div>

          {/* Plans list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 dark:text-white">Subscription packages</p>
              <Button variant="outline" size="sm" onClick={handleAddPlan}>
                <Package className="w-4 h-4 mr-2" />
                Add plan
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set how many outfits each paid plan includes per month and the subscription price. The server will
              automatically create the Stripe prices for you – you don&apos;t need to copy any Stripe IDs.
            </p>

            {plans.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No plans configured yet. Click &quot;Add plan&quot; to create your first package.
              </p>
            )}

            {plans.map((plan, index) => (
              <div
                key={plan.key || index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Plan name
                    </label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={e => handleUpdatePlan(index, "name", e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Plan key
                    </label>
                    <input
                      type="text"
                      value={plan.key}
                      onChange={e => handleUpdatePlan(index, "key", e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Outfits / month (empty = unlimited)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={plan.monthlyOutfitLimit ?? ""}
                      onChange={e =>
                        handleUpdatePlan(
                          index,
                          "monthlyOutfitLimit",
                          e.target.value === "" ? null : Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Price / month (USD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={typeof plan.amountCents === "number" && plan.amountCents > 0 ? (plan.amountCents / 100).toString() : ""}
                      onChange={e => {
                        const value = e.target.value;
                        const num = parseFloat(value);
                        const cents = !isNaN(num) && num > 0 ? Math.round(num * 100) : null;
                        handleUpdatePlan(index, "amountCents", cents);
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="mt-5"
                    onClick={() => handleDeletePlan(index)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleAiSave} disabled={aiLoading} className="bg-blue-600 hover:bg-blue-700 mt-2">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save AI Settings
          </Button>
          {aiFeedback && <div className="text-sm text-green-600 dark:text-green-400 mt-2">{aiFeedback}</div>}
        </CardContent>
      </Card>

      {/* Maintenance & System */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900 dark:text-white">
            <Database className="w-5 h-5 mr-2" />
            Maintenance & System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Mode Section */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable maintenance mode for the platform. Only admins can access the site.</p>
            </div>
            <Switch checked={maintenanceEnabled} onCheckedChange={setMaintenanceEnabled} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maintenance Message</label>
            <input
              type="text"
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <Button onClick={handleMaintenanceSave} disabled={maintenanceLoading} className="bg-blue-600 hover:bg-blue-700 mb-2">
            {maintenanceLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Maintenance Settings
          </Button>
          {maintenanceFeedback && <div className="text-sm text-green-600 dark:text-green-400 mt-2">{maintenanceFeedback}</div>}
          <div className="flex items-center justify-between">
          
          
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        {/* <Button className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button> */}
      </div>
    </div>
  )
}
