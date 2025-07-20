import { supabase } from "./supabase";

export interface EmailOptions {
    to: string
    subject: string
    html?: string 
    type: 'verification' | 'password_reset'
    code?: string
}

export const sendEmail =async (options: EmailOptions): Promise<{ success: boolean; error?: string }> =>{
    try{
        //Call the supabase Edge Function
        const { data, error } = await supabase.functions.invoke('send-email', {
            body :{
                to:options.to,
                subject: options.subject,
                html: options.html ||'',
                type: options.type,
                code: options.code
            }
        })
        if (error) {
            console.error('Email service error:', error)
            return { success: false, error: error.message}
        }
        console.log('Email sent successfully:', data)
        return { success: true}
    } catch(error){
        console.error('Failed to send email:', error)
        return { success: false, error: 'Failed to send email'}
    }
}

export const sendVerificationEmail = async (email: string, code: string): Promise<{success:boolean; error?:string}> =>{
    return sendEmail({
        to:email,
        subject: 'VM Creation- Email Verification Code',
        type:'verification',
        code
    })
}

export const sendPasswordResetEmail = async (email: string, code: string ): Promise<{ success: boolean; error?: string}> =>{
    return sendEmail({
        to: email,
        subject: 'VM Creation - Password Reset Code',
        type: 'password_reset',
        code
    })
} 

//Validate email format

export const isValidEmail = (email: string): boolean=>{
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

//Check if email is Gmail
export const isFGmailAddress = (email:string): boolean =>{
    return email.toLowerCase().endsWith('@gmail.com')
}

//Extract domain from email
export const getEmailDomain = (email:string): string=>{
    return email.split('@')[1]?.toLowerCase() || ''
}
