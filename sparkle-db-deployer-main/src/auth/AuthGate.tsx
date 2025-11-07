import { useEffect, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "./msalConfig";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await instance.handleRedirectPromise();
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setIsHandlingRedirect(false);
      }
    };

    void init();
  }, [instance]);

  useEffect(() => {
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance]);

  const signIn = async () => {
    setError(null);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  };

  if (isHandlingRedirect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="text-muted-foreground max-w-sm">
            Please authenticate with your Microsoft Entra ID account to manage database distribution jobs.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={signIn} className="gap-2">
          <LogIn className="h-4 w-4" />
          Sign in with Microsoft
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
