import { LoginForm } from "@/components/auth/login-form";
import { FileText } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-pdx-blue text-white mb-4">
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-pdx-blue">Parts Distribution Xpress</h1>
        <p className="text-slate-500 mt-1">Expense Report Portal</p>
      </div>
      <LoginForm />
    </div>
  );
}
