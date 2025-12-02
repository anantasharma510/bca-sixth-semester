import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useGetOutfit, useGetOutfitProducts, useShareOutfit, useToggleOutfitWishlist } from '../services/api/style';
import Icon from 'react-native-vector-icons/Feather';

export default function OutfitDetailScreen({ route, navigation }: any) {
    const { outfitId } = route.params;
    const { theme } = useTheme();
    const colors = getColors(theme);
    const insets = useSafeAreaInsets();

    const { data: outfitData, isLoading: isLoadingOutfit } = useGetOutfit(outfitId);
    const { data: productsData, isLoading: isLoadingProducts } = useGetOutfitProducts(outfitId);
    const shareMutation = useShareOutfit();
    const wishlistMutation = useToggleOutfitWishlist(outfitId);

    const outfit = productsData?.data?.outfit;
    const products = productsData?.data?.products || [];

    const [isSaved, setIsSaved] = useState<boolean>(Boolean(outfit?.isSaved || outfitData?.data?.isSaved));

    useEffect(() => {
        const savedFlag = Boolean(outfit?.isSaved || outfitData?.data?.isSaved);
        setIsSaved(savedFlag);
    }, [outfit?.isSaved, outfitData?.data?.isSaved]);

    const handleShare = () => {
        Alert.alert(
            'Share to Feed',
            'Do you want to share this outfit with the community?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Share',
                    onPress: async () => {
                        try {
                            await shareMutation.mutateAsync({ id: outfitId, isPublic: true });
                            Alert.alert('Success', 'Outfit shared to feed!');
                            navigation.navigate('Home');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to share outfit.');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleWishlist = async () => {
        try {
            const next = !isSaved;
            setIsSaved(next);
            await wishlistMutation.mutateAsync(next);
        } catch (error: any) {
            setIsSaved(prev => !prev);
            Alert.alert('Error', error?.message || 'Failed to update wishlist.');
        }
    };

    // Map outfit item meta (minPrice/maxPrice) by productId for better price display
    const priceMetaByProductId = useMemo(() => {
        const map = new Map<string, any>();
        outfit?.items?.forEach((item: any) => {
            if (item.productId) {
                map.set(String(item.productId), item);
            }
        });
        return map;
    }, [outfit]);

    const renderProduct = ({ item }: any) => {
        const product = item;
        const meta = priceMetaByProductId.get(String(product._id));

        let priceLabel = 'Price N/A';
        const detailPrice = product.detail?.price;
        if (detailPrice) {
            priceLabel = `$${detailPrice.toFixed ? detailPrice.toFixed(0) : detailPrice}`;
        } else if (meta?.minPrice && meta?.maxPrice && meta.minPrice !== meta.maxPrice) {
            priceLabel = `$${meta.minPrice} - $${meta.maxPrice}`;
        } else if (meta?.minPrice) {
            priceLabel = `$${meta.minPrice}+`;
        } else if (meta?.maxPrice) {
            priceLabel = `Up to $${meta.maxPrice}`;
        }

        return (
            <TouchableOpacity
                style={[styles.productCard, { backgroundColor: colors.background.secondary }]}
                onPress={() => product.productUrl && Linking.openURL(product.productUrl)}
            >
                <Image
                    source={{ uri: product.mainImageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                />
                <View style={styles.productInfo}>
                    <Text style={[styles.productBrand, { color: colors.text.secondary }]}>{product.brand}</Text>
                    <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={2}>
                        {product.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: '#FF7300' }]}>{priceLabel}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoadingOutfit || isLoadingProducts) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#FF7300" />
            </View>
        );
    }

    const primaryOutfit = outfit ?? outfitData?.data;

    return (
        <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Outfit Details</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleToggleWishlist} style={styles.iconButton}>
                        <Icon
                            name={isSaved ? 'heart' : 'heart'}
                            size={22}
                            color={isSaved ? '#FF3B30' : colors.text.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                        <Icon name="share" size={22} color="#FF7300" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => item._id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.outfitInfo}>
                        <Text style={[styles.outfitName, { color: colors.text.primary }]}>{primaryOutfit?.name}</Text>
                        <Text style={[styles.outfitDescription, { color: colors.text.secondary }]}>
                            {primaryOutfit?.description}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    shareButton: {
        padding: 8,
    },
    iconButton: {
        padding: 8,
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    outfitInfo: {
        marginBottom: 24,
    },
    outfitName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    outfitDescription: {
        fontSize: 16,
        lineHeight: 24,
    },
    productCard: {
        flex: 1,
        margin: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    productImage: {
        width: '100%',
        height: 180,
    },
    productInfo: {
        padding: 12,
    },
    productBrand: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    productName: {
        fontSize: 14,
        marginBottom: 8,
        height: 40,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
