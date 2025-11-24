"use client";

import { Button } from "@/components/ui/button";
import { UserInvitationModal } from "@/components/user-invitation-modal";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { useState } from "react";

export function UserInvitationButton() {
  const t = useTranslations("admin.users");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        <Mail className="h-4 w-4 mr-2" />
        {t("inviteButton")}
      </Button>
      <UserInvitationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}

