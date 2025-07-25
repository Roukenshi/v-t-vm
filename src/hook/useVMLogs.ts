import { useCallback, useEffect, useState } from "react";
import type { VMCreationLog, VMLogBackendResponse } from "../lib/supabase";
import { getTokenFromStorage, isTokenExpired } from "../lib/jwt";

const API_BASE_URL = "http://localhost:8000";

export const useVMLogs = (userId: string | null) => {
    const [vmLogs, setVmLogs] = useState<VMCreationLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize token to avoid refetching on every render
    const token = getTokenFromStorage();

    const isAuthorized = useCallback((): boolean => {
        return !!token && !isTokenExpired(token) && !!userId;
    }, [token, userId]);

    const fetchVMLogs = useCallback(async () => {
        if (!isAuthorized()) {
            setVmLogs([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/vm-logs`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                setError(errData?.detail || "Failed to fetch VM logs");
                setVmLogs([]);
                return;
            }

            const result = await response.json();

            if (!Array.isArray(result.logs)) {
                setError("Invalid response format from server");
                setVmLogs([]);
                return;
            }

            // Map backend logs to frontend VMCreationLog type
            const logs: VMCreationLog[] = result.logs.map((log: VMLogBackendResponse) => ({
                id: log.id, // Use the actual UUID from backend
                user_id: userId!,
                box_name: log.box_name,
                vm_name: log.vm_name,
                cpus: log.cpus,
                memory: log.memory,
                status: log.status as "pending" | "success" | "error",
                logs: log.logs || [],
                terraform_output: log.terraform_output || "",
                created_at: log.created_at,
            }));

            setVmLogs(logs);
        } catch (fetchError) {
            console.error("Error fetching VM logs:", fetchError);
            setError("Network error while fetching VM logs");
            setVmLogs([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthorized, token, userId]);

    // Fetch logs on userId change or token change
    useEffect(() => {
        if (userId) {
            fetchVMLogs();
        } else {
            setVmLogs([]);
        }
    }, [userId, fetchVMLogs]);

    // createVMLog - make an actual API call to create the log
    const createVMLog = useCallback(async (vmData: {
        box_name: string;
        vm_name: string;
        cpus: number;
        memory: number;
    }): Promise<VMCreationLog | null> => {
        if (!isAuthorized()) return null;

        try {
            const response = await fetch(`${API_BASE_URL}/vm-logs`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(vmData),
            });

            if (!response.ok) {
                console.error("Failed to create VM log");
                return null;
            }

            const newLog = await response.json();
            
            // Convert backend response to frontend format
            const frontendLog: VMCreationLog = {
                id: newLog.id,
                user_id: userId!,
                box_name: newLog.box_name,
                vm_name: newLog.vm_name,
                cpus: newLog.cpus,
                memory: newLog.memory,
                status: newLog.status,
                logs: [],
                terraform_output: "",
                created_at: newLog.created_at,
            };

            // Add to local state
            setVmLogs(prev => [frontendLog, ...prev]);
            
            return frontendLog;
        } catch (error) {
            console.error("Error creating VM log:", error);
            return null;
        }
    }, [isAuthorized, userId, token]);

    const updateVMLog = useCallback(async (
        logId: string,
        updates: {
            status?: "success" | "error" | "pending";
            logs?: any[];
            terraform_output?: string;
        },
    ): Promise<boolean> => {
        if (!isAuthorized()) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/vm-logs/${logId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updates),
            });

            if (response.ok) {
                // Update local state
                setVmLogs(prev =>
                    prev.map(log =>
                        log.id === logId
                            ? { ...log, ...updates }
                            : log
                    )
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating VM log:", error);
            return false;
        }
    }, [isAuthorized, token]);

    return {
        vmLogs,
        loading,
        error,
        createVMLog,
        updateVMLog,
        refreshLogs: fetchVMLogs,
    };
};