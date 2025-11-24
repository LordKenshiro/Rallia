"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type UserRole = "player" | "admin" | "organization_member";
type AdminRole = "super_admin" | "moderator" | "support";

interface UserInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInvitationModal({
  open,
  onOpenChange,
}: UserInvitationModalProps) {
  const t = useTranslations("admin.users.invite");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [adminRole, setAdminRole] = useState<AdminRole | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Validate email
      if (!email || !email.includes("@")) {
        throw new Error(t("validation.invalidEmail"));
      }

      // Validate admin role if role is admin
      if (role === "admin" && !adminRole) {
        throw new Error(t("validation.adminRoleRequired"));
      }

      // Call API to create invitation
      const response = await fetch("/api/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          adminRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("error.sendFailed"));
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || t("error.sendFailed"));
      }

      // Show success message
      setSuccessMessage(t("success.invitationSent", { email }));
      setErrorMessage(null);

      // Reset form after a delay
      setTimeout(() => {
        setEmail("");
        setRole(undefined);
        setAdminRole(undefined);
        setSuccessMessage(null);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Invitation error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("error.sendFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail("");
      setRole(undefined);
      setAdminRole(undefined);
      setErrorMessage(null);
      setSuccessMessage(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("fields.email")} <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={t("fields.emailPlaceholder")}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              {t("fields.role")} <span className="text-destructive">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole);
                if (e.target.value !== "admin") {
                  setAdminRole(undefined);
                } else {
                  setAdminRole("super_admin");
                }
                setErrorMessage(null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={isSubmitting}
            >
              <option value={""}>{t("roles.selectRole")}</option>
              <option value="player" disabled>
                {t("roles.player")}
              </option>
              <option value="admin">{t("roles.admin")}</option>
              <option value="organization_member" disabled>
                {t("roles.orgMember")}
              </option>
            </select>
          </div>

          {role === "admin" && (
            <div className="space-y-2">
              <label htmlFor="adminRole" className="text-sm font-medium">
                {t("fields.adminRole")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <select
                id="adminRole"
                value={adminRole}
                onChange={(e) => {
                  setAdminRole(e.target.value as AdminRole);
                  setErrorMessage(null);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={isSubmitting}
              >
                <option value="super_admin">
                  {t("adminRoles.super_admin")}
                </option>
                <option value="moderator">{t("adminRoles.moderator")}</option>
                <option value="support">{t("adminRoles.support")}</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !role}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.sending")}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("actions.send")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
