import { isAdmin } from "@/lib/supabase/check-admin";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");

  const supabase = await createClient();

  // Determine redirect paths based on redirect parameter
  const isAdminFlow = redirectParam === "admin";
  const signInPath = isAdminFlow ? "/admin/sign-in" : "/sign-in";
  const postAuthPath = isAdminFlow
    ? "/admin/sign-in/post-auth"
    : "/sign-in/post-auth";

  // Handle OAuth callback (Google/Microsoft)
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        new URL(
          `${signInPath}?error=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }

    // If admin flow, verify admin status before redirecting
    if (isAdminFlow && data.user) {
      const userIsAdmin = await isAdmin(data.user.id);
      if (!userIsAdmin) {
        return NextResponse.redirect(
          new URL(
            `${signInPath}?error=${encodeURIComponent(
              "Access denied. Admin access required."
            )}`,
            request.url
          )
        );
      }
    }

    // Redirect to appropriate post-auth page
    return NextResponse.redirect(new URL(postAuthPath, request.url));
  }

  // Handle email OTP verification
  if (token_hash && type) {
    const { error, data } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (error) {
      console.error("OTP verification error:", error);
      return NextResponse.redirect(
        new URL(
          `${signInPath}?error=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }

    // If admin flow, verify admin status before redirecting
    if (isAdminFlow && data.user) {
      const userIsAdmin = await isAdmin(data.user.id);
      if (!userIsAdmin) {
        return NextResponse.redirect(
          new URL(
            `${signInPath}?error=${encodeURIComponent(
              "Access denied. Admin access required."
            )}`,
            request.url
          )
        );
      }
    }

    // Redirect to appropriate post-auth page
    return NextResponse.redirect(new URL(postAuthPath, request.url));
  }

  // If no valid callback parameters, redirect to sign-in with error
  return NextResponse.redirect(
    new URL(`${signInPath}?error=invalid_callback`, request.url)
  );
}
