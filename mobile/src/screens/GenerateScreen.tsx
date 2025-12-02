import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useStyleProfile, useUpdateStyleProfile, useGenerateOutfit, useOutfitHistory, useStyleUsage, useCreateCheckoutSession, useMySubscription, useCreateKhaltiPayment, useVerifyKhaltiPayment } from '../services/api/style';
import { useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

export default function GenerateScreen({ navigation }: any) {
    const { theme } = useTheme();
    const colors = getColors(theme);
    const insets = useSafeAreaInsets();

    const queryClient = useQueryClient();
    const { data: profile, isLoading: isLoadingProfile } = useStyleProfile();
    const { data: usage } = useStyleUsage();
    const { data: mySubscription } = useMySubscription();
    const updateProfileMutation = useUpdateStyleProfile();
    const generateMutation = useGenerateOutfit();
    const createCheckoutMutation = useCreateCheckoutSession();
    const createKhaltiPaymentMutation = useCreateKhaltiPayment();
    const verifyKhaltiPaymentMutation = useVerifyKhaltiPayment();

    const [step, setStep] = useState<'profile' | 'generate'>('generate');
    const [mode, setMode] = useState<'history' | 'form'>('history');
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    // Profile Form State
    const [profileData, setProfileData] = useState({
        gender: 'female',
        age: '',
        heightCm: '',
        weightKg: '',
    });

    // Generation Form State
    const [generateData, setGenerateData] = useState({
        preparing_for: '',
        preferred_brand: '',
        budget: '250',
        description: '',
    });

    // Recent outfit history (show up to 5)
    const { data: historyData } = useOutfitHistory(1, 5);

    useEffect(() => {
        if (isLoadingProfile) return;

        // If no profile exists, or profile is incomplete, show profile form.
        // Backend sets `completedAt` when the profile is fully filled in.
        if (!profile || !profile.completedAt) {
            setStep('profile');
            setMode('form');
        } else {
            // Profile already completed: land on history view first
            setStep('generate');
            setMode('history');
        }
    }, [profile, isLoadingProfile]);

    const handleProfileSubmit = async () => {
        if (!profileData.age || !profileData.heightCm || !profileData.weightKg) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }

        try {
            await updateProfileMutation.mutateAsync({
                gender: profileData.gender,
                age: parseInt(profileData.age),
                heightCm: parseInt(profileData.heightCm),
                weightKg: parseInt(profileData.weightKg),
                locale: 'en-US',
                preferredUnits: 'metric',
            });
            setStep('generate');
            setMode('history');
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile.');
        }
    };

    const handleGenerateSubmit = async () => {
        // Validate minimum length requirements (backend requires min 3 chars)
        if (!generateData.preparing_for || generateData.preparing_for.trim().length < 3) {
            Alert.alert('Invalid Input', 'Please enter at least 3 characters for what you are preparing for.');
            return;
        }

        if (!generateData.description || generateData.description.trim().length < 3) {
            Alert.alert('Invalid Input', 'Please enter at least 3 characters in the extra details.');
            return;
        }

        try {
            const result = await generateMutation.mutateAsync(generateData);
            // result is the inner "data" from the API (e.g. { outfitId, generationId })
            if (!result?.outfitId) {
                Alert.alert(
                    'No Outfit Created',
                    'Could not create an outfit for the generated plan. Try adjusting your budget or preferred brands.'
                );
                return;
            }

            // Navigate to Outfit Detail
            navigation.navigate('OutfitDetail', { outfitId: result.outfitId });
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate outfit. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleUpgradePlan = async () => {
        // Show payment method selection
        Alert.alert(
            'Choose Payment Method',
            'Select your preferred payment gateway:',
            [
                {
                    text: 'Pay with Stripe (USD)',
                    onPress: () => handleStripePayment(),
                },
                {
                    text: 'Pay with Khalti (NPR)',
                    onPress: () => handleKhaltiPayment(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const handleStripePayment = async () => {
        try {
            const planKey = 'plan-1';
            const result = await createCheckoutMutation.mutateAsync(planKey);

            if (!result?.success || !result.url) {
                Alert.alert(
                    'Upgrade failed',
                    result?.message || 'Could not start checkout. Please try again later.'
                );
                return;
            }

            await WebBrowser.openBrowserAsync(result.url);
            queryClient.invalidateQueries({ queryKey: ['style-usage'] });
        } catch (error: any) {
            const message = error?.message || 'Failed to start Stripe checkout. Please try again.';
            Alert.alert('Error', message);
        }
    };

    const handleKhaltiPayment = async () => {
        try {
            const planKey = 'plan-1';
            const result = await createKhaltiPaymentMutation.mutateAsync(planKey);

            if (!result?.success || !result.url) {
                Alert.alert(
                    'Upgrade failed',
                    result?.message || 'Could not start Khalti payment. Please try again later.'
                );
                return;
            }

            // Open Khalti payment page
            await WebBrowser.openBrowserAsync(result.url);

            // After returning from browser, verify payment if pidx is available
            if (result.pidx) {
                // Wait a bit for the callback to process, then verify
                setTimeout(async () => {
                    try {
                        await verifyKhaltiPaymentMutation.mutateAsync(result.pidx);
                        queryClient.invalidateQueries({ queryKey: ['style-usage'] });
                        queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
                    } catch (error) {
                        console.error('Khalti verification error:', error);
                    }
                }, 2000);
            } else {
                queryClient.invalidateQueries({ queryKey: ['style-usage'] });
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to start Khalti payment. Please try again.';
            Alert.alert('Error', message);
        }
    };

    if (isLoadingProfile) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#FF7300" />
            </View>
        );
    }

    const renderProfileForm = () => (
        <View style={styles.formContainer}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Setup Style Profile</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                Help us understand your fit to generate the best outfits for you.
            </Text>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Gender</Text>
                <View style={styles.genderContainer}>
                    {['female', 'male', 'non_binary'].map((g) => (
                        <TouchableOpacity
                            key={g}
                            style={[
                                styles.genderButton,
                                profileData.gender === g && { backgroundColor: '#FF7300', borderColor: '#FF7300' },
                                { borderColor: colors.border.light }
                            ]}
                            onPress={() => setProfileData({ ...profileData, gender: g })}
                        >
                            <Text style={[
                                styles.genderText,
                                profileData.gender === g ? { color: 'white' } : { color: colors.text.primary }
                            ]}>
                                {g.replace('_', ' ').charAt(0).toUpperCase() + g.replace('_', ' ').slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Age</Text>
                <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                    placeholder="e.g. 25"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    value={profileData.age}
                    onChangeText={(text) => setProfileData({ ...profileData, age: text })}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: colors.text.secondary }]}>Height (cm)</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                        placeholder="e.g. 175"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="numeric"
                        value={profileData.heightCm}
                        onChangeText={(text) => setProfileData({ ...profileData, heightCm: text })}
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: colors.text.secondary }]}>Weight (kg)</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                        placeholder="e.g. 70"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="numeric"
                        value={profileData.weightKg}
                        onChangeText={(text) => setProfileData({ ...profileData, weightKg: text })}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleProfileSubmit}
                disabled={updateProfileMutation.isPending}
            >
                {updateProfileMutation.isPending ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.submitButtonText}>Save Profile</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderGenerateForm = () => {
        const used = usage?.usedThisPeriod ?? 0;
        const limit = usage?.effectiveLimit ?? usage?.freeMonthlyOutfits ?? 3;
        const remaining = Math.max(0, limit - used);

        const limitReached = remaining <= 0;

        return (
        <View style={styles.formContainer}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Generate Outfit</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                Describe the occasion and your preferences.
            </Text>

            <View style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: colors.background.secondary }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 13 }}>
                            Monthly AI usage {mySubscription?.subscription?.status === 'active' ? '· PRO' : ''}
                        </Text>
                        <Text style={{ color: colors.text.secondary, marginTop: 4, fontSize: 12 }}>
                            {used} / {limit} outfits used this period
                            {limitReached ? ' · limit reached' : ` · ${remaining} left`}
                        </Text>
                    </View>
                    {mySubscription?.subscription?.status !== 'active' && (
                        <TouchableOpacity
                            onPress={() => setShowSubscribeModal(true)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 8,
                                backgroundColor: colors.primary[500],
                                marginLeft: 12,
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Subscribe to Pro</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {mySubscription?.subscription?.status !== 'active' && (
                    <TouchableOpacity
                        style={[styles.submitButton, { marginTop: 8, paddingVertical: 12, backgroundColor: colors.primary[500] }]}
                        onPress={() => setShowSubscribeModal(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Icon name="star" size={18} color="white" />
                            <Text style={[styles.submitButtonText, { fontSize: 16 }]}>
                                Upgrade to Pro - Get Unlimited Outfits
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                {limitReached && mySubscription?.subscription && (
                    <TouchableOpacity
                        style={[styles.submitButton, { marginTop: 8, paddingVertical: 10 }]}
                        onPress={handleUpgradePlan}
                        disabled={createCheckoutMutation.isPending}
                    >
                        {createCheckoutMutation.isPending ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={[styles.submitButtonText, { fontSize: 16 }]}>
                                Upgrade plan to get more outfits
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Preparing For</Text>
                <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                    placeholder="e.g. A summer wedding, Job interview"
                    placeholderTextColor={colors.text.tertiary}
                    value={generateData.preparing_for}
                    onChangeText={(text) => setGenerateData({ ...generateData, preparing_for: text })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Preferred Brands (Optional)</Text>
                <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                    placeholder="e.g. Zara, H&M"
                    placeholderTextColor={colors.text.tertiary}
                    value={generateData.preferred_brand}
                    onChangeText={(text) => setGenerateData({ ...generateData, preferred_brand: text })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Budget ($)</Text>
                <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                    placeholder="e.g. 250"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    value={generateData.budget}
                    onChangeText={(text) => setGenerateData({ ...generateData, budget: text })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Extra Details</Text>
                <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top', color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                    placeholder="e.g. I prefer blue colors, no leather..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    value={generateData.description}
                    onChangeText={(text) => setGenerateData({ ...generateData, description: text })}
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.submitButton,
                    limitReached && { backgroundColor: '#9CA3AF' },
                ]}
                onPress={limitReached ? handleUpgradePlan : handleGenerateSubmit}
                disabled={generateMutation.isPending || limitReached}
            >
                {generateMutation.isPending ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.submitButtonText}>
                        {limitReached ? 'Upgrade to generate more' : 'Generate Outfit'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
    };

    const renderHistory = () => {
        const outfits = historyData?.data?.outfits || [];

        return (
            <View style={styles.formContainer}>
                <Text style={[styles.title, { color: colors.text.primary }]}>Your outfits</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                    Tap an outfit to view details, or generate a new one.
                </Text>

                <TouchableOpacity
                    style={[styles.submitButton, { marginBottom: 24 }]}
                    onPress={() => setMode('form')}
                >
                    <Text style={styles.submitButtonText}>Generate new outfit</Text>
                </TouchableOpacity>

                {outfits.length ? (
                    outfits.map((outfit: any) => (
                        <TouchableOpacity
                            key={outfit._id}
                            style={styles.historyCard}
                            onPress={() => navigation.navigate('OutfitDetail', { outfitId: outfit._id })}
                        >
                            <View style={styles.historyImageWrapper}>
                                {outfit.bannerImageUrl ? (
                                    <Image
                                        source={{ uri: outfit.bannerImageUrl }}
                                        style={styles.historyImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.historyImage,
                                            { backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center' },
                                        ]}
                                    >
                                        <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>
                                            No image
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.historyInfo}>
                                <Text
                                    style={{ color: colors.text.primary, fontWeight: '600' }}
                                    numberOfLines={1}
                                >
                                    {outfit.name}
                                </Text>
                                {outfit.description ? (
                                    <Text
                                        style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}
                                        numberOfLines={2}
                                    >
                                        {outfit.description}
                                    </Text>
                                ) : null}
                                <Text
                                    style={{ color: colors.text.tertiary, fontSize: 11, marginTop: 4 }}
                                    numberOfLines={1}
                                >
                                    {new Date(outfit.createdAt).toLocaleString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={{ color: colors.text.secondary }}>
                        You haven't generated any outfits yet. Tap "Generate new outfit" to get started.
                    </Text>
                )}
            </View>
        );
    };

    const renderSubscribeModal = () => {
        const isPro = mySubscription?.subscription?.status === 'active';
        
        return (
            <Modal
                visible={showSubscribeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSubscribeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background.primary }]}>
                        {/* Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Subscribe to Pro</Text>
                            <TouchableOpacity
                                onPress={() => setShowSubscribeModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Icon name="x" size={24} color={colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                            {isPro ? (
                                <View style={styles.proStatusContainer}>
                                    <Icon name="check-circle" size={48} color="#10B981" />
                                    <Text style={[styles.proStatusText, { color: colors.text.primary }]}>
                                        You're already a Pro member!
                                    </Text>
                                    <Text style={[styles.proStatusSubtext, { color: colors.text.secondary }]}>
                                        Enjoy unlimited outfit generations and all Pro features.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Benefits */}
                                    <View style={styles.benefitsContainer}>
                                        <Text style={[styles.benefitsTitle, { color: colors.text.primary }]}>
                                            Pro Benefits
                                        </Text>
                                        {[
                                            { icon: 'zap', text: 'Unlimited outfit generations' },
                                            { icon: 'star', text: 'Priority AI processing' },
                                            { icon: 'award', text: 'Exclusive Pro badge' },
                                            { icon: 'trending-up', text: 'Advanced style recommendations' },
                                        ].map((benefit, index) => (
                                            <View key={index} style={styles.benefitItem}>
                                                <Icon name={benefit.icon} size={20} color={colors.primary[500]} />
                                                <Text style={[styles.benefitText, { color: colors.text.secondary }]}>
                                                    {benefit.text}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Current Usage */}
                                    <View style={[styles.usageCard, { backgroundColor: colors.background.secondary }]}>
                                        <Text style={[styles.usageTitle, { color: colors.text.primary }]}>
                                            Current Plan
                                        </Text>
                                        <Text style={[styles.usageText, { color: colors.text.secondary }]}>
                                            Free: {usage?.usedThisPeriod ?? 0} / {usage?.freeMonthlyOutfits ?? 3} outfits used
                                        </Text>
                                        <Text style={[styles.usageSubtext, { color: colors.text.tertiary }]}>
                                            Upgrade to Pro for unlimited generations
                                        </Text>
                                    </View>

                                    {/* Payment Options */}
                                    <View style={styles.paymentOptionsContainer}>
                                        <Text style={[styles.paymentTitle, { color: colors.text.primary }]}>
                                            Choose Payment Method
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.paymentButton, { backgroundColor: colors.primary[500] }]}
                                            onPress={() => {
                                                setShowSubscribeModal(false);
                                                handleStripePayment();
                                            }}
                                            disabled={createCheckoutMutation.isPending}
                                        >
                                            {createCheckoutMutation.isPending ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <>
                                                    <Icon name="credit-card" size={20} color="white" />
                                                    <Text style={styles.paymentButtonText}>Pay with Stripe (USD)</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.paymentButton, { backgroundColor: '#7734DD', marginTop: 12 }]}
                                            onPress={() => {
                                                setShowSubscribeModal(false);
                                                handleKhaltiPayment();
                                            }}
                                            disabled={createKhaltiPaymentMutation.isPending}
                                        >
                                            {createKhaltiPaymentMutation.isPending ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <>
                                                    <Icon name="smartphone" size={20} color="white" />
                                                    <Text style={styles.paymentButtonText}>Pay with Khalti (NPR)</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {step === 'profile'
                        ? renderProfileForm()
                        : mode === 'history'
                            ? renderHistory()
                            : renderGenerateForm()}
                </ScrollView>
            </KeyboardAvoidingView>
            {renderSubscribeModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    formContainer: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    genderButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
    },
    genderText: {
        fontWeight: '600',
    },
    historyCard: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    historyImageWrapper: {
        width: 90,
        height: 90,
    },
    historyImage: {
        width: '100%',
        height: '100%',
    },
    historyInfo: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    submitButton: {
        backgroundColor: '#FF7300',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalScrollContent: {
        padding: 20,
    },
    proStatusContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    proStatusText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
    },
    proStatusSubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    benefitsContainer: {
        marginBottom: 24,
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    benefitText: {
        fontSize: 15,
        flex: 1,
    },
    usageCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    usageTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    usageText: {
        fontSize: 14,
        marginBottom: 4,
    },
    usageSubtext: {
        fontSize: 12,
    },
    paymentOptionsContainer: {
        marginTop: 8,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    paymentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    paymentButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
