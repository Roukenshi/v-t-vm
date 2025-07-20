import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../lib/supabase'
import{
    sendVerificationEmail,
    sendPasswordResetEmail,
} from '../lib/emailservice';

import {
    generateToken,
    verifyToken,
    getTokenFromStorage,
    setTokenInStorage,
    removeTokenFromStorage,
    refreshTokenIfNeeded,
    isTokenExpired
} from '../lib/jwt'

//Simple password hashing (for demo)
const hashPassword = async (password: string ): Promise<string> =>{
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b=> b.toString(16).padStart(2, '0')).join ('')
}
const verifyPassword = async (password: string, hash: string ): Promise<boolean> =>{
    const passwordHash = await hashPassword(password)
    return passwordHash === hash 
}
export const useAuth = () => {
    const [user, setUser] = useState(null as User | null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(null as string | null)

    useEffect(() =>{
        //Check if user has valid JWT token
        const checkUser = async () =>{
            const storedToken = getTokenFromStorage()

            if (storedToken && !isTokenExpired(storedToken)){
                const decoded = verifyToken(storedToken)

                if (decoded){
                    //Fetch fresh user data from database 
                    const { data:userData } = await supabase
                        .from('users')
                        .select("*")
                        .eq('id',decoded.userId)
                        .single()

                        if (userData) {
                            setUser(userData)
                            setToken(storedToken)
                            //Refresh token if needed
                            const refreshedToken = await refreshTokenIfNeeded(storedToken)
                            if (refreshedToken && refreshedToken !== storedToken ){
                                setToken(refreshedToken)
                            }
                        }else{
                            //User not found uin database, clear token
                            removeTokenFromStorage()
                        }
                }else{
                    //Inavlid token,clear it 
                    removeTokenFromStorage()
                }
            }
            setLoading(false)
        }
        checkUser()
    },[])

    const registerUser = async (email:string, password: string) => {
        try{
            const passwordHash = await hashPassword(password)
            const code = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = new Date(Date.now() + 10*60*10000)

            const { data: newUser, error: userError } = await supabase
                .from ('users')
                .insert({
                    email,
                    password_hash: passwordHash,
                    email_verified: false,
                }) 
                .select()
                .single()

            if (userError) throw userError

            const { error: codeError } = await supabase
                .from ('verification_codes')
                .insert ({
                    email,
                    code,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single()

                if(codeError) throw codeError

                const emailResult = await sendVerificationEmail(email,code);
                if(!emailResult.success) {
                    console.warn('Failed to send email:', emailResult.error)
                    alert (`Demo: Your verification code is  ${code}`)
                }

                return { success: true, user: newUser}
        } catch (error) {
            console.error('Registration error:', error)
            return { success: false, error:'Registration failed' }
        }
    }

    const loginWithPassword = async (email: string, password: string ) => {
        try{
            const { data: userData, error: userError } = await supabase
            .from ('users')
            .select ('*')
            .eq ('email,', email)
            .single()

            if (userError || !userData) {
                return { success: false, error: 'Invalid email or password' }
            }
            if (!userData.email_verified) {
                return { success: false, error: 'Email not verified' }
            }
            const isValid = await verifyPassword(password, userData.password_hash)
            if (!isValid){
                return { success: false, error: 'Invalid email or password' }
            }

            const { data:updateUser } = await supabase
                .from('user')
                .update({last_login: new Date().toISOString()})
                .select()
                .single()
            
            const jwtToken = generateToken({
                userId: userData.id,
                email: userData.email,
                emailVerified: true,
            })

            setTokenInStorage(jwtToken)
            setToken(jwtToken)
            setUser(updateUser || userData)

            return { usccess: true, user: updateUser || userData}
        } catch (error){
            console.error('Login Error:', error)
            return { success: false, error: 'Login failed' }
        }
    }
    
    const sendVerificationCode = async (email: string ) =>{
        try {
            //Generate 6-digit code
            const code = Math.floor(100000 + Math.random()*900000).toString()
            const expireAt = new Date(Date.now() + 10*60*1000) //10 minutes

            //Store Verification code in database
            const { error } = await supabase
                .from ('verification_codes')
                .insert({
                    email,
                    code,
                    expires_at: expireAt.toISOString()
                })
            if(error) throw error

            const emailResult = await sendVerificationEmail(email, code)
            if(!emailResult.success){
                console.warn('Email send failed:', emailResult.error)
                alert (`Demo: Your verification code is: ${code}`)
            } 

            return { success: true }
        } catch (error) {
            console.error('Verification error:', error)
            return { success: false, error: 'Could not send verification code' }
        }
    }
    
    const verifyCodeandLogin = async (email: string, code: string) =>{
        try{
            const { data: verificationData, error: verifyError } = await supabase
            .from ('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

            if (verifyError || !verificationData){
                return { success: false, error: 'Inavlid or expired code' }
            }

            await supabase
                .from ('verification_codes')
                .update({ used: true })
                .eq('id', verificationData.id)

            const { data: existingUser } = await supabase
                .from ('user')
                .select('*')
                .eq('email', email)
                .single()

            let userData
            if (existingUser) {
                const { data: updateUser } = await supabase
                    .from ('user')
                    .update({
                        last_login: new Date().toISOString(),
                        email_verified: true,
                    })
                    .eq('email', email)
                    .select()
                    .single()
                userData = updateUser
            }else {
                const { data: newUser } = await supabase
                    .from ('users')
                    .insert({
                        email,
                        email_verified: true,
                        last_login: new Date().toISOString(),
                    })
                    .select()
                    .single()
                userData = newUser
            }

            const jwtToken = generateToken({
                userId: userData.id,
                email: userData.email,
                emailVerified: true,
            })

            setTokenInStorage(jwtToken)
            setToken(jwtToken)
            setUser(userData)

            return { success: true, user: userData }
        } catch (error) {
            console.error('Code verification failed:', error)
            return { success: false, error: 'Verification failed'}
        }
    }

    const sendPasswordResetCode = async (email: string ) => {
        try{
            const { data: userData } = await supabase
                .from ('users')
                .select('*')
                .eq('email', email)
                .single()

            if(!userData) {
                return { success: false, error: 'User not found' }
            }

            const token = Math.floor(100000 + Math.random() *900000).toString()
            const expireAt = new Date(Date.now() + 15*60*1000)

            const { error } = await supabase
                .from ('password_resets')
                .insert({
                    email,
                    token,
                    expires_at: expireAt.toISOString(),
                }) 

                if ( error) throw error 

                const emailResult = await sendPasswordResetEmail(email, token)
                if  (!emailResult.success) {
                    console.warn('Failed to send reset email:', emailResult.error)
                    alert( `Demo: Your password reset code is ${token}`)
                }
                return { success: true }
        }catch (error) {
            console.error('Error sending reset code:', error)
            return { success: false, error: 'Failed to send reset code'}
        }
    }
    const resetPassword = async (email: string, token: string, newPassword: string ) => {
            try{
                const { data: resetData, error: tokenError } = await supabase
                    .from ('password_reset')
                    .select ('*')
                    .eq('email', email)
                    .eq('token', token)
                    .eq('used', false)
                    .gt('expires_at', new Date().toISOString())
                    .single()
                
                if (tokenError || !resetData ){
                    return { success: false, error: 'Invalid or expired reset token' }
                }
                const passwordHash = await hashPassword(newPassword)

                const { error: updateError } = await supabase
                    .from ('users')
                    .update({ password_hash: passwordHash})
                    .eq('email',email)

                if (updateError) throw updateError

                await supabase
                    .from ('password_reset')
                    .update({ used: true })
                    .eq('id', resetData.id)

                return{ success: true }
            } catch (error) {
                console.error('Password reset error:', error)
                return { success: false, error: ' Resey failed'}
            }
    }

    const logout =() =>{
        removeTokenFromStorage()
        setToken(null)
        setUser(null)
    }

    const isAuthenticated = (): boolean =>{
        return !!token && !!user  && !isTokenExpired(token) 
    }

    const getAuthHeaders = (): { Authorization: string } | {} =>{
        if (token && !isTokenExpired(token)){
            return { Authorization: ` Bearer ${token}`}
        }
        return {}
    }

    return {
        user,
        token,
        loading,
        isAuthenticated,
        getAuthHeaders,
        registerUser,
        loginWithPassword,
        sendVerificationCode,
        verifyCodeandLogin,
        sendPasswordResetCode,
        resetPassword,
        logout,
    }
}