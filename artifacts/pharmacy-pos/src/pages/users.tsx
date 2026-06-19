import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useListBranches,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const ROLES = ["admin", "pharmacist", "cashier", "manager", "super_admin"];

const userSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 chars").optional().or(z.literal("")),
  role: z.string().min(1, "Required"),
  branch_id: z.string().optional(),
  phone: z.string().optional(),
});
type UserForm = z.infer<typeof userSchema>;

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListUsers({ role: roleFilter || undefined, page, per_page: 20 });
  const { data: branches } = useListBranches();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", role: "cashier" },
  });

  const openCreate = () => {
    setEditUser(null);
    form.reset({ name: "", email: "", role: "cashier" });
    setOpen(true);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    form.reset({
      name: u.name,
      email: u.email,
      role: u.role,
      branch_id: u.branchId ?? u.branch_id ?? "",
      phone: u.phone ?? "",
      password: "",
    });
    setOpen(true);
  };

  const onSubmit = (values: UserForm) => {
    if (editUser) {
      const { password, ...rest } = values;
      updateUser.mutate({ userId: editUser.id, data: rest as any }, {
        onSuccess: () => { toast({ title: "User updated" }); setOpen(false); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createUser.mutate({ data: values as any }, {
        onSuccess: () => { toast({ title: "User created" }); setOpen(false); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
        onError: () => toast({ title: "Failed to create user", variant: "destructive" }),
      });
    }
  };

  const toggleStatus = (userId: string, currentActive: boolean) => {
    updateStatus.mutate({ userId, data: { is_active: !currentActive } as any }, {
      onSuccess: () => { toast({ title: `User ${!currentActive ? "activated" : "deactivated"}` }); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
    });
  };

  const users = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = (data as any)?.total_pages ?? 1;
  const branchList = Array.isArray(branches) ? branches : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        subtitle={`${total} staff accounts`}
        icon={UserCog}
        gradient="from-rose-600 via-rose-500 to-pink-500"
        actions={
          <Button className="bg-white text-rose-700 hover:bg-rose-50 font-semibold" onClick={openCreate} data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        }
      />

      <Card>
        <div className="p-4 border-b">
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Branch</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No users found</TableCell></TableRow>
                ) : users.map((u: any) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{u.branch_name ?? "All"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {u.lastLogin ?? u.last_login ? new Date(u.lastLogin ?? u.last_login).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.isActive ?? u.is_active}
                        onCheckedChange={() => toggleStatus(u.id, u.isActive ?? u.is_active)}
                        data-testid={`switch-user-active-${u.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editUser ? "Edit Staff" : "Add Staff"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} data-testid="input-user-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!editUser && (
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role *</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="branch_id" render={({ field }) => (
                <FormItem><FormLabel>Branch</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Branches</SelectItem>
                        {branchList.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending} data-testid="button-submit-user">
                  {createUser.isPending || updateUser.isPending ? "Saving..." : editUser ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
