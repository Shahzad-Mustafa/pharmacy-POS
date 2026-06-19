import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import Medicines from "@/pages/medicines";
import Inventory from "@/pages/inventory";
import Patients from "@/pages/patients";
import Prescriptions from "@/pages/prescriptions";
import Sales from "@/pages/sales";
import Suppliers from "@/pages/suppliers";
import Branches from "@/pages/branches";
import Users from "@/pages/users";
import Reports from "@/pages/reports";
import Insurance from "@/pages/insurance";
import Settings from "@/pages/settings";
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Renders all authenticated routes inside a single persistent Layout instance
// so the sidebar/notification hook don't remount on every navigation.
function AuthenticatedApp() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/pos" component={POS} />
        <Route path="/medicines" component={Medicines} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/patients" component={Patients} />
        <Route path="/prescriptions" component={Prescriptions} />
        <Route path="/sales" component={Sales} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/branches" component={Branches} />
        <Route path="/users" component={Users} />
        <Route path="/reports" component={Reports} />
        <Route path="/insurance" component={Insurance} />
        <Route path="/settings" component={Settings} />
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route>{() => <AuthenticatedApp />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-right" richColors expand closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
