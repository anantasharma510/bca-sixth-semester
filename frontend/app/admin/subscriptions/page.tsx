"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminApi } from "@/lib/api";

export default function AdminSubscriptionsPage() {
  const { getSubscriptionTransactions } = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getSubscriptionTransactions(page);
        const transactions = res?.data?.transactions || res?.transactions || [];
        const pagination = res?.data?.pagination || res?.pagination || {};
        setItems(transactions);
        setHasNext(Boolean(pagination.hasNextPage));
      } catch (err) {
        console.error("Failed to load subscription transactions", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getSubscriptionTransactions, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Transactions</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and audit subscription payments and their status.
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900 dark:text-white">
            <Package className="w-5 h-5 mr-2" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span>Loading transactions...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subscription transactions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">User ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Plan</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Payment Method</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((tx) => {
                    // Determine payment method: Khalti if khaltiPidx exists, otherwise Stripe
                    const isKhalti = Boolean(tx.khaltiPidx);
                    const paymentMethod = isKhalti ? "Khalti" : "Stripe";
                    
                    // Determine currency and amount
                    const isNPR = tx.currency === 'npr' || isKhalti;
                    const amount = isNPR
                      ? (tx.amountNprPaisa || tx.amountCents || 0) / 100 // Convert paisa to NPR
                      : (tx.amountUsdCents || tx.amountCents || 0) / 100; // Convert cents to USD
                    const currencySymbol = isNPR ? '₨' : '$';
                    
                    return (
                      <tr key={tx._id}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-mono text-xs">
                          {tx.userId}
                        </td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          {tx.planKey || "Plan"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                              (isKhalti
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200")
                            }
                          >
                            {paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-semibold">
                          {tx.amountCents != null || tx.amountNprPaisa != null || tx.amountUsdCents != null
                            ? `${currencySymbol}${amount.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                              (tx.status === "succeeded"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                                : tx.status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200")
                            }
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


