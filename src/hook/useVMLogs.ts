import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts'
import type { VMCreationLog } from '../lib/supabase.ts'
import { getTokenFromStorage, verifyToken } from '../lib/jwt.ts';

export const useVMLogs = (userId: string | null) => {
    const [vmLogs, setVmLogs] = useState([] as VMCreationLog[]);
    const [loading, setLoading] = useState(false)

    //Verify JWT Token before making a request
    const isAuthorized = useCallback((): boolean =>{
        const token = getTokenFromStorage();
        if (!token) return false;

        const decoded = verifyToken(token)
        return decoded?.userId === userId;
    },[userId]);

    const fetchVMLogs = useCallback(async () => {
        if (!userId) return

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('vm_creation_logs')
                .select('*')
                .eq('user_id', userId)
                .order('create_at', { ascending: false })

            if (error) throw error
            setVmLogs(data || [])
        } catch (error) {
            console.error('Error fetching VM logs:', error)
        } finally {
            setLoading(false)
        }
    }, [userId]);
    useEffect(()=> {
        const run = async()=>{
            if (userId && isAuthorized()){
                await fetchVMLogs();
            }else{
                console.warn("Unauthorized or mismatched token");
            }
        };
        run();
    },[userId, fetchVMLogs, isAuthorized]);

    const createVMLog = async (vmData: {
        box_name: string
        vm_name: string
        cpus: number
        memory: number
    }) => {
        if (!userId) return null

        try {
            const { data, error } = await supabase
                .from('vm_creation_logs')
                .insert({
                    user_id: userId,
                    ...vmData,
                    status: 'pending',
                    logs: []
                })
                .select()
                .single()
            if (error) throw error

            setVmLogs(prev => [data, ...prev])
            return data
        } catch (error) {
            console.error('Error creating VM logs:', error)
            return null
        }
    }

    const updateVMLog = async (
        logId: string,
        updates: {
            status?: 'success' | 'error' | 'pending'
            logs?: any[]
            terraform_output?: string
        }
    ) => {

        try {
            const { data, error } = await supabase
                .from('vm_creation_logs')
                .update(updates)
                .eq('id', logId)
                .select()
                .single()
            if (error) throw error

            setVmLogs(prev =>
                prev.map(log => log.id === logId ? data : log)
            )
            return data
        } catch (error) {
            console.error('Error updating VM log:', error)
            return null
        }
    }
    return {
        vmLogs,
        loading,
        createVMLog,
        updateVMLog,
        refreshLog: fetchVMLogs
    }
}


