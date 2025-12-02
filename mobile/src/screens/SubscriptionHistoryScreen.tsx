import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useMySubscription } from '../services/api/style';

export default function SubscriptionHistoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { data, isLoading } = useMySubscription();

  const subscription = data?.subscription;
  const transactions = data?.transactions || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header
        navigation={navigation}
        title="Subscription & Billing"
        showBackButton
        showNotificationsIcon={false}
        showMessagesIcon={false}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Current status</Text>
            {subscription ? (
              <>
                <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                  Plan: {subscription.planKey || 'Custom'}
                </Text>
                <Text style={{ color: colors.text.secondary, marginTop: 4 }}>
                  Status: {subscription.status}
                </Text>
                {subscription.currentPeriodEnd && (
                  <Text style={{ color: colors.text.secondary, marginTop: 4 }}>
                    Renews / ends: {new Date(subscription.currentPeriodEnd).toLocaleString()}
                  </Text>
                )}
              </>
            ) : (
              <Text style={{ color: colors.text.secondary }}>You are on the free plan.</Text>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Transactions</Text>
            {transactions.length === 0 ? (
              <Text style={{ color: colors.text.secondary, marginTop: 8 }}>
                No subscription payments yet.
              </Text>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item: any) => item._id}
                renderItem={({ item }: any) => (
                  <View style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                        {item.planKey || 'Plan'}
                      </Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {item.amountCents != null && (() => {
                        // Determine currency: if currency is 'npr' or khaltiPidx exists, show NPR, otherwise USD
                        const isNPR = item.currency === 'npr' || item.khaltiPidx;
                        const amount = isNPR 
                          ? (item.amountNprPaisa || item.amountCents) / 100 // Convert paisa to NPR
                          : (item.amountUsdCents || item.amountCents) / 100; // Convert cents to USD
                        const currencySymbol = isNPR ? '₨' : '$';
                        
                        return (
                          <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                            {currencySymbol}{amount.toFixed(2)}
                          </Text>
                        );
                      })()}
                      <Text
                        style={{
                          color:
                            item.status === 'succeeded'
                              ? '#22C55E'
                              : item.status === 'pending'
                              ? '#F97316'
                              : '#EF4444',
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.3)',
  },
});


