// Use the built-in Deno.serve instead of importing from deno.land
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
  to: string;
  subject?: string;
  type: "verification" | "password_reset";
  code?: string;
  test?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, type, code, test }: EmailRequest = await req.json();

    // Enhanced CLI logging
    console.log("📧 =================================");
    console.log("📧 VM  CREATION EMAIL FUNCTION");
    console.log("📧 =================================");
    console.log(`📧 Timestamp: ${new Date().toISOString()}`);
    console.log(`📧 Recipient: ${to}`);
    console.log(`📧 Email Type: ${type}`);
    console.log(`📧 Subject: ${subject || "Auto-generated"}`);
    console.log(`📧 Verification Code: ${code || "N/A"}`);
    console.log(`📧 Test Mode: ${test ? "YES" : "NO"}`);
    console.log("📧 =================================");

    // Validate required fields
    if (!to || !type) {
      const error = "Missing required fields: to, type";
      console.error("❌ VALIDATION ERROR:", error);
      console.log("📧 Required fields: to, type");
      console.log("📧 Optional fields: subject, code, test");
      return new Response(
        JSON.stringify({
          success: false,
          error,
          required_fields: ["to", "type"],
          optional_fields: ["subject", "code", "test"],
          received: {
            to: !!to,
            type: !!type,
            subject: !!subject,
            code: !!code,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      const error = "Invalid email format";
      console.error("❌ EMAIL FORMAT ERROR:", error);
      console.log(`📧 Provided email: "${to}"`);
      console.log("📧 Expected format: user@domain.com");
      return new Response(
        JSON.stringify({
          success: false,
          error,
          email_provided: to,
          expected_format: "user@domain.com",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate verification code if not provided
    const verificationCode = code ||
      Math.floor(100000 + Math.random() * 900000).toString();

    // Generate subject if not provided
    let emailSubject = subject;
    if (!emailSubject) {
      emailSubject = type === "verification"
        ? "🔐 VM Creation - Email Verification Code"
        : "🔑 VM Creation - Password Reset Code";
    }

    // Create email content based on type
    const emailContent = generateEmailContent(type, verificationCode);

    console.log("📧 EMAIL CONTENT GENERATED:");
    console.log(`📧 Subject: ${emailSubject}`);
    console.log(`📧 Code Generated: ${verificationCode}`);
    console.log(`📧 Content Length: ${emailContent.length} characters`);

    // Simulate email sending (since we're not using external providers)
    console.log("📧 =================================");
    console.log("📧 SIMULATING EMAIL DELIVERY");
    console.log("📧 =================================");
    console.log(`📧 FROM: VM Creation <noreply@vmcreation.com>`);
    console.log(`📧 TO: ${to}`);
    console.log(`📧 SUBJECT: ${emailSubject}`);
    console.log("📧 =================================");
    console.log("📧 EMAIL BODY:");
    console.log("📧 =================================");

    // Log the email content for CLI viewing
    if (test) {
      console.log(emailContent);
    } else {
      // In production, just log key details
      console.log(`📧 Verification Code: ${verificationCode}`);
      console.log(`📧 Email Type: ${type}`);
      console.log(
        `📧 Expires: ${type === "verification" ? "10 minutes" : "15 minutes"}`,
      );
    }

    console.log("📧 =================================");
    console.log("📧 EMAIL DELIVERY STATUS: SUCCESS");
    console.log("📧 =================================");

    // Success response with detailed information for CLI
    const response = {
      success: true,
      message: "Email sent successfully (simulated)",
      email_details: {
        to,
        subject: emailSubject,
        type,
        verification_code: verificationCode,
        expires_in: type === "verification" ? "10 minutes" : "15 minutes",
        timestamp: new Date().toISOString(),
      },
      cli_info: {
        note: "This is a simulated email delivery for development/testing",
        verification_code: verificationCode,
        next_steps: type === "verification"
          ? "Use this code in the verification form"
          : "Use this code to reset your password",
      },
    };

    console.log("📧 RESPONSE PAYLOAD:");
    console.log(JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("💥 =================================");
    console.error("💥 CRITICAL ERROR IN EMAIL FUNCTION");
    console.error("💥 =================================");

    let type = "UnknownError";
    let message = "Something went wrong";
    let stack = "";

    if (error instanceof Error) {
      type = error.name;
      message = error.message;
      stack = error.stack || "";
    }

    console.error(`💥 Error Type: ${type}`);
    console.error(`💥 Error Message: ${message}`);
    console.error(`💥 Stack Trace:`);
    console.error(stack);
    console.error("💥 =================================");

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error in email function",
        error_details: {
          type,
          message,
          timestamp: new Date().toISOString(),
        },
        cli_help:
          "Check the function logs above for detailed error information",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  function generateEmailContent(type: string, code: string): string {
    const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `;

    if (type === "verification") {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VM Creation - Email Verification</title>
</head>
<body style="${baseStyle}">
  <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 VM Creation</h1>
    <p style="color: #fca5a5; margin: 10px 0 0 0;">Email Verification Required</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email Address</h2>
    <p style="margin-bottom: 20px;">Welcome to VM Creation! Please use the verification code below:</p>
    
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 32px; font-weight: bold; color: #ef4444; letter-spacing: 8px; font-family: monospace;">
        ${code}
      </div>
      <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">This code expires in 10 minutes</p>
    </div>
    
    <div style="background: #fef3cd; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0; color: #92400e;">
      <strong>Security Notice:</strong> If you didn't request this verification, please ignore this email.
    </div>
    
    <p>Once verified, you'll have access to our professional Vagrant + Terraform VM automation interface.</p>
  </div>
  
  <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 8px 8px;">
    <p>© 2024 VM Creation - Professional Vagrant + Terraform Automation</p>
    <p>This is an automated message, please do not reply.</p>
  </div>
</body>
</html>
    `;
    } else {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VM Creation - Password Reset</title>
</head>
<body style="${baseStyle}">
  <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔑 VM Creation</h1>
    <p style="color: #fca5a5; margin: 10px 0 0 0;">Password Reset Request</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
    <p style="margin-bottom: 20px;">You requested a password reset for your VM Creation account. Use the code below:</p>
    
    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px; font-family: monospace;">
        ${code}
      </div>
      <p style="color: #dc2626; margin: 10px 0 0 0; font-size: 14px; font-weight: 600;">This code expires in 15 minutes</p>
    </div>
    
    <div style="background: #fef3cd; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0; color: #92400e;">
      <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.
    </div>
    
    <p>For security reasons, this reset code can only be used once and will expire automatically.</p>
  </div>
  
  <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 8px 8px;">
    <p>© 2024 VM Creation - Professional Vagrant + Terraform Automation</p>
    <p>This is an automated message, please do not reply.</p>
  </div>
</body>
</html>
    `;
    }
  }
});
