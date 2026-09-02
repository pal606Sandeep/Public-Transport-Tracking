import { PageHeader } from "@/components/ui";
import { NotificationPrefsForm } from "@/modules/notification/components/NotificationPrefsForm";

export default function NotificationSettingsPage() {
  return (
    <>
      <PageHeader title="Notification settings" back />
      <NotificationPrefsForm />
    </>
  );
}
