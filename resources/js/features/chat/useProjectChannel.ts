import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho, onReconnect } from '../../lib/echo';
import type { ProjectMessage } from '../../lib/types';
import { receiveDeletion, receiveEdit, receiveMessage } from './chatHooks';

/** A posted or edited event: the whole message, or only its id and project when it was too large for the socket. */
type MessageEvent = ProjectMessage | { id: string; project_id: string };

function isWhole(event: MessageEvent): event is ProjectMessage {
    return 'body' in event;
}

/**
 * Keep a project's chat live (PRD §3.2.11): posts, edits and deletions on the project channel join the cache by id,
 * and when the socket comes back after dropping, the project and its chat reload what was missed meanwhile.
 * One subscriber per page: leaving the channel stops it for every listener on it. Without Reverb it does nothing.
 */
export function useProjectChannel(projectId: string): void {
    const qc = useQueryClient();

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !projectId) return;

        const name = `project.${projectId}`;
        const refetch = () => void qc.invalidateQueries({ queryKey: ['project', projectId] });
        echo.private(name)
            .listen('.ProjectMessagePosted', (e: MessageEvent) => (isWhole(e) ? receiveMessage(qc, projectId, e) : refetch()))
            .listen('.ProjectMessageEdited', (e: MessageEvent) => (isWhole(e) ? receiveEdit(qc, projectId, e) : refetch()))
            .listen('.ProjectMessageDeleted', (e: { id: string }) => receiveDeletion(qc, projectId, e.id));
        const stopWatching = onReconnect(echo.connector, refetch);

        return () => {
            stopWatching();
            echo.leaveChannel(`private-${name}`);
        };
    }, [projectId, qc]);
}

export interface OnlineMember {
    id: string;
    name: string;
}

/**
 * Who has the project's chat open (the presence channel), you included. Null without Reverb, or until the channel
 * answers: the "online" indicator hides.
 */
export function useProjectPresence(projectId: string): OnlineMember[] | null {
    const [members, setMembers] = useState<OnlineMember[] | null>(null);

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !projectId) return;

        const name = `project.${projectId}`;
        echo.join(name)
            .here((here: OnlineMember[]) => setMembers(here))
            .joining((m: OnlineMember) => setMembers((list) => [...(list ?? []).filter((x) => x.id !== m.id), m]))
            .leaving((m: OnlineMember) => setMembers((list) => (list ?? []).filter((x) => x.id !== m.id)));

        return () => {
            echo.leaveChannel(`presence-${name}`);
            setMembers(null);
        };
    }, [projectId]);

    return members;
}
