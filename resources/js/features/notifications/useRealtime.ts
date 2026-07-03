import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '../../auth/useAuth';
import { getEcho } from '../../lib/echo';

export function useRealtimeNotifications(): void {
    const me = useMe();
    const qc = useQueryClient();
    const userId = me.data?.id;

    useEffect(() => {
        if (!userId) return;
        const echo = getEcho();
        if (!echo) return;

        const channel = `users.${userId}`;
        echo.private(channel).listen('.NotificationCreated', () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        });

        return () => {
            echo.leave(channel);
        };
    }, [userId, qc]);
}
