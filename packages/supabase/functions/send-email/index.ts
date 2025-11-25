import { ZodError } from "zod";
import { getHandler } from "./registry.ts";
import { EmailRequestSchema } from "./schemas.ts";
import type { EmailRequest, EmailResponse } from "./types.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required");
}
if (!FROM_EMAIL) {
  throw new Error("FROM_EMAIL environment variable is required");
}

Deno.serve(async (req) => {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedRequest: EmailRequest = EmailRequestSchema.parse(body);

    // Get appropriate handler for the email type
    const handler = getHandler(validatedRequest.emailType);

    // Validate payload with handler-specific schema (already validated by EmailRequestSchema)
    const validatedPayload = handler.validate(validatedRequest);

    // Get recipient email and email content (async operations)
    const recipient = await handler.getRecipient(validatedPayload);
    const { subject, html } = await handler.getContent(validatedPayload);

    // Send email via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipient,
        subject,
        html,
      }),
    });

    const data = await res.json();

    // Handle Resend API errors
    if (!res.ok) {
      const errorMessage =
        data?.message || data?.error || "Failed to send email";
      console.error("Resend API error:", errorMessage, data);

      const errorResponse: EmailResponse = {
        success: false,
        error: errorMessage,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return success response
    const successResponse: EmailResponse = {
      success: true,
      id: data?.id,
      message: "Email sent successfully",
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email function error:", error);

    // Handle validation errors
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      });

      const errorResponse: EmailResponse = {
        success: false,
        error: `Validation error: ${errorMessages.join("; ")}`,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle other errors
    const errorResponse: EmailResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
