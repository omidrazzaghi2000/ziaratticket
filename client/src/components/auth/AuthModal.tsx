import { useAuth } from "./AuthProvider";
import LoginForm from "./LoginForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  title = "ورود به سامانه رزرو کاروان",
  description,
}: AuthModalProps) {
  const { refreshUser } = useAuth();

  // هندلر برای زمانی که کاربر با موفقیت وارد شد
  const handleLoginSuccess = () => {
    refreshUser();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-primary">{title}</DialogTitle>
          {description && <p className="text-center text-gray-500">{description}</p>}
        </DialogHeader>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </DialogContent>
    </Dialog>
  );
}