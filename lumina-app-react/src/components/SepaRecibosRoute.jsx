import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import RecibosSepa from '../pages/RecibosSepa';

/** Solo muestra Recibos SEPA si la instalación tiene SEPA activado (API pública). */
export default function SepaRecibosRoute() {
    const [enabled, setEnabled] = useState(null);

    const load = () => {
        axios
            .get('/api/sepa-settings/public')
            .then((r) => setEnabled(!!r.data?.sepaEnabled))
            .catch(() => setEnabled(false));
    };

    useEffect(() => {
        load();
        const on = () => load();
        window.addEventListener('lumina:sepa-settings-changed', on);
        return () => window.removeEventListener('lumina:sepa-settings-changed', on);
    }, []);

    if (enabled === null) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin w-10 h-10 border-4 border-blue-100 border-t-[#6E9EFF] rounded-full" />
            </div>
        );
    }

    if (!enabled) {
        return <Navigate to="/" replace />;
    }

    return <RecibosSepa />;
}
