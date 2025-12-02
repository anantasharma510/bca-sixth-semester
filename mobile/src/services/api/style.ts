import { useApiService } from '../api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface StyleProfile {
    gender?: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
    locale?: string;
    preferredUnits?: 'metric' | 'imperial';
    profileImageUrl?: string;
    completedAt?: string;
}

export interface GenerateOutfitInput {
    preparing_for: string;
    preferred_brand: string;
    budget: string;
    description: string;
}

export interface Outfit {
    _id: string;
    name: string;
    description: string;
    items: any[];
    isPublic: boolean;
    createdAt: string;
}

export const useStyleApi = () => {
    const { get, post, put, delete: del } = useApiService();
    const queryClient = useQueryClient();

    const getProfile = async () => {
        // Backend shape: { success, data: profile }
        const payload = await get<any>('/style/profile');
        return payload?.data ?? null;
    };

    const updateProfile = async (data: StyleProfile) => {
        const payload = await put<any>('/style/profile', data);
        return payload?.data ?? null;
    };

    // Returns the payload's inner "data" (e.g. { outfitId, generationId })
    const generateOutfit = async (data: GenerateOutfitInput) => {
        // `post` already returns the parsed JSON body from the backend
        // which has shape: { success, message, data: { outfitId, generationId } }
        const payload = await post<any>('/style/generate', data);

        if (!payload?.success || !payload.data) {
            throw new Error(payload?.message || 'Failed to generate outfit.');
        }

        return payload.data;
    };

    const getOutfit = async (id: string) => {
        return get(`/style/generate/${id}`);
    };

    const getOutfitProducts = async (id: string) => {
        return get(`/style/outfit/${id}/products`);
    };

    const shareOutfit = async (id: string, isPublic: boolean) => {
        return post(`/style/outfit/${id}/share`, { isPublic });
    };

    const getOutfitHistory = async (page = 1, limit = 5) => {
        return get(`/style/outfits`, { params: { page, limit } });
    };

    const saveOutfitToWishlist = async (id: string) => {
        return post(`/style/wishlist/outfit/${id}`);
    };

    const deleteOutfitFromWishlist = async (id: string) => {
        return del(`/style/wishlist/outfit/${id}`);
    };

    const getWishlistOutfits = async (page = 1, limit = 20) => {
        return get(`/style/wishlist/outfits`, { params: { page, limit } });
    };

    const getUsage = async () => {
        const payload = await get<any>('/style/usage');
        return payload?.data ?? null;
    };

    const getMySubscription = async () => {
        const payload = await get<any>('/protected/subscription/me');
        return payload?.data ?? null;
    };

    /**
     * Create a Stripe Checkout session for a subscription plan.
     * The backend now auto-creates the Stripe price based on the admin-configured
     * monthly price, so the mobile app only needs to send the planKey.
     */
    const createCheckoutSession = async (planKey: string) => {
        const payload = await post<any>('/billing/create-checkout-session', { planKey });
        return payload;
    };

    /**
     * Create a Khalti payment session for a subscription plan.
     * Returns payment URL that should be opened in browser.
     */
    const createKhaltiPayment = async (planKey: string) => {
        const payload = await post<any>('/billing/khalti/initiate', { planKey });
        return payload;
    };

    /**
     * Verify Khalti payment status using pidx.
     */
    const verifyKhaltiPayment = async (pidx: string) => {
        const payload = await post<any>('/billing/khalti/verify', { pidx });
        return payload;
    };

    return {
        getProfile,
        updateProfile,
        generateOutfit,
        getOutfit,
        getOutfitProducts,
        shareOutfit,
        getOutfitHistory,
        saveOutfitToWishlist,
        deleteOutfitFromWishlist,
        getWishlistOutfits,
        getUsage,
        getMySubscription,
        createCheckoutSession,
        createKhaltiPayment,
        verifyKhaltiPayment,
    };
};

export const useStyleProfile = () => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['style-profile'],
        queryFn: api.getProfile,
        retry: false,
    });
};

export const useUpdateStyleProfile = () => {
    const api = useStyleApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['style-profile'] });
        },
    });
};

export const useGenerateOutfit = () => {
    const api = useStyleApi();
    return useMutation({
        mutationFn: api.generateOutfit,
    });
};

export const useGetOutfit = (id: string) => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['outfit', id],
        queryFn: () => api.getOutfit(id),
        enabled: !!id,
    });
};

export const useGetOutfitProducts = (id: string) => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['outfit-products', id],
        queryFn: () => api.getOutfitProducts(id),
        enabled: !!id,
    });
};

export const useShareOutfit = () => {
    const api = useStyleApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
            api.shareOutfit(id, isPublic),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['outfit', id] });
        },
    });
};

export const useOutfitHistory = (page = 1, limit = 5) => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['outfit-history', page, limit],
        queryFn: () => api.getOutfitHistory(page, limit),
    });
};

export const useStyleUsage = () => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['style-usage'],
        queryFn: api.getUsage,
    });
};

export const useMySubscription = () => {
    const api = useStyleApi();
    return useQuery({
        queryKey: ['my-subscription'],
        queryFn: api.getMySubscription,
    });
};

export const useCreateCheckoutSession = () => {
    const api = useStyleApi();
    return useMutation({
        mutationFn: (planKey: string) => api.createCheckoutSession(planKey),
    });
};

export const useToggleOutfitWishlist = (id: string) => {
    const api = useStyleApi();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shouldSave: boolean) => {
            if (shouldSave) {
                return api.saveOutfitToWishlist(id);
            }
            return api.deleteOutfitFromWishlist(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outfit', id] });
            queryClient.invalidateQueries({ queryKey: ['outfit-products', id] });
            queryClient.invalidateQueries({ queryKey: ['wishlist-outfits'] });
        },
    });
};

export const useCreateKhaltiPayment = () => {
    const api = useStyleApi();
    return useMutation({
        mutationFn: (planKey: string) => api.createKhaltiPayment(planKey),
    });
};

export const useVerifyKhaltiPayment = () => {
    const api = useStyleApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (pidx: string) => api.verifyKhaltiPayment(pidx),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['style-usage'] });
            queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
        },
    });
};
