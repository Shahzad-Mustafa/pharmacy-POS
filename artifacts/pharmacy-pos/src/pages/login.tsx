import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useListBranches } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  branch_id: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      branch_id: "",
    },
  });

  const { data: branchesData, isLoading: isLoadingBranches } = useListBranches({ is_active: true });
  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    setError(null);
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          login(response.access_token, response.user);
        },
        onError: (err: any) => {
          setError(err.message || "Invalid credentials. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="space-y-2 text-center pb-8 pt-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">RxPOS</CardTitle>
          <CardDescription className="text-base">Precision Pharmacy Workstation</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center">
                  {error}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@rxpos.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingBranches}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Head Office / All Branches</SelectItem>
                        {(branchesData as any[])?.map((branch: any) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-md"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
