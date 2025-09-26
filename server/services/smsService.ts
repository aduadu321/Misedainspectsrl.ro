import fetch from "node-fetch";

export interface SMSOptions {
  to: string;
  message: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const sendSMS = async (options: SMSOptions): Promise<SMSResponse> => {
  try {
    const response = await fetch("https://www.smsadvert.ro/api/sms/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.SMS_API_TOKEN!,
      },
      body: JSON.stringify({
        phone: options.to,
        shortTextMessage: options.message,
        sendAsShort: true,
        failover: "short",
      }),
    });

    if (!response.ok) {
      console.error("❌ SMS API error:", response.status, response.statusText);
      return {
        success: false,
        error: `SMS API error: ${response.status} ${response.statusText}`,
      };
    }

    const result = (await response.json()) as {
      successMessage?: string;
      msgId?: string;
      errors?: Record<string, string>;
      errorMessage?: string;
    };

    // Check for API errors
    if (result.errors || result.errorMessage) {
      const errorMsg =
        result.errorMessage ||
        Object.values(result.errors || {})[0] ||
        "Unknown API error";
      console.error("❌ SMS API response error:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const messageId = result.msgId || "unknown";

    console.log(
      "✅ SMS sent successfully:",
      result.successMessage || messageId
    );
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("❌ SMS sending error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMS error",
    };
  }
};

export const sendVerificationSMS = async (
  phoneNumber: string,
  name: string,
  verificationCode: string
): Promise<SMSResponse> => {
  // Format phone number to Romanian standard (+40...)
  const formattedPhone = phoneNumber.startsWith("+40")
    ? phoneNumber
    : phoneNumber.startsWith("0")
    ? `+40${phoneNumber.substring(1)}`
    : `+40${phoneNumber}`;

  const message = `Buna ziua, ${name}! Codul de verificare pentru ITP NOTIFICATION este: ${verificationCode}. Codul expira in 10 minute. MISEDA INSPECT SRL`;

  return await sendSMS({
    to: formattedPhone,
    message,
  });
};

export const sendWelcomeSMS = async (
  phoneNumber: string,
  name: string
): Promise<SMSResponse> => {
  // Format phone number to Romanian standard (+40...)
  const formattedPhone = phoneNumber.startsWith("+40")
    ? phoneNumber
    : phoneNumber.startsWith("0")
    ? `+40${phoneNumber.substring(1)}`
    : `+40${phoneNumber}`;

  const message = `Buna ziua, ${name}! Contul ITP NOTIFICATION a fost activat cu succes. Veti primi notificari pentru expirarea ITP. MISEDA INSPECT SRL`;

  return await sendSMS({
    to: formattedPhone,
    message,
  });
};

// Generate a 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate Romanian phone number
export const isValidRomanianPhone = (phone: string): boolean => {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, "");

  // Romanian phone patterns:
  // +40 7xx xxx xxx (mobile)
  // +40 2xx xxx xxx (landline)
  // +40 3xx xxx xxx (landline)
  // 07xx xxx xxx (mobile without country code)
  // 02xx xxx xxx (landline without country code)
  // 03xx xxx xxx (landline without country code)

  const romanianPatterns = [
    /^\+40[2-3]\d{8}$/, // Landline with country code
    /^\+407\d{8}$/, // Mobile with country code
    /^0[2-3]\d{8}$/, // Landline without country code
    /^07\d{8}$/, // Mobile without country code
  ];

  return romanianPatterns.some((pattern) => pattern.test(cleanPhone));
};