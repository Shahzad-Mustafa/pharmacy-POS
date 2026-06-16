import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
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
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/pos">{() => <ProtectedRoute component={POS} />}</Route>
      <Route path="/medicines">{() => <ProtectedRoute component={Medicines} />}</Route>
      <Route path="/inventory">{() => <ProtectedRoute component={Inventory} />}</Route>
      <Route path="/patients">{() => <ProtectedRoute component={Patients} />}</Route>
      <Route path="/prescriptions">{() => <ProtectedRoute component={Prescriptions} />}</Route>
      <Route path="/sales">{() => <ProtectedRoute component={Sales} />}</Route>
      <Route path="/suppliers">{() => <ProtectedRoute component={Suppliers} />}</Route>
      <Route path="/branches">{() => <ProtectedRoute component={Branches} />}</Route>
      <Route path="/users">{() => <ProtectedRoute component={Users} />}</Route>
      <Route path="/reports">{() => <ProtectedRoute component={Reports} />}</Route>
      <Route path="/insurance">{() => <ProtectedRoute component={Insurance} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route component={NotFound} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
