import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null, // Stores user data (id, username, role, etc)
            token: null, // Stores JWT
            isAuthenticated: false,

            login: (userData, authToken) => set({
                user: userData,
                token: authToken,
                isAuthenticated: true
            }),

            logout: () => set({
                user: null,
                token: null,
                isAuthenticated: false
            })
        }),
        {
            name: 'lumina-auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage so it clears on tab close
        }
    )
);

// Helper function to check roles/permissions reactively
export const usePermissions = () => {
    const user = useAuthStore((state) => state.user);

    const isAdmin = user?.role === 'ADMIN';
    const isSocio = user?.role === 'SOCIO';

    const hasPermission = (moduleSlug, action) => {
        if (!user) return false;
        if (isAdmin) return true; // Super admin bypass

        const perms = user.permissions?.[moduleSlug];
        if (!perms) return false;

        if (perms.canManageAll) return true; // Can do everything in this module
        return !!perms[action];
    };

    return {
        isAdmin,
        isSocio,
        canView: (moduleSlug) => hasPermission(moduleSlug, 'canView'),
        canCreate: (moduleSlug) => hasPermission(moduleSlug, 'canCreate'),
        canEdit: (moduleSlug) => hasPermission(moduleSlug, 'canEdit'),
        canDelete: (moduleSlug) => hasPermission(moduleSlug, 'canDelete')
    };
};

export default useAuthStore;
