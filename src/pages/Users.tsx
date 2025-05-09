
import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Mail,
  User as UserIcon,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Mock user data - In a real application, this would come from an API
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

const Users = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" },
    { id: "2", name: "Test User", email: "user@example.com", role: "user" },
  ]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  });

  const handleOpenAddDialog = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
    });
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      role: e.target.value as "admin" | "user",
    }));
  };

  const handleAddUser = () => {
    const newUser: User = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      role: formData.role,
    };
    setUsers([...users, newUser]);
    setIsAddDialogOpen(false);
    toast({
      title: "Success",
      description: "User added successfully!",
      variant: "success",
    });
  };

  const handleUpdateUser = () => {
    if (!currentUser) return;
    
    const updatedUsers = users.map((user) =>
      user.id === currentUser.id
        ? {
            ...user,
            name: formData.name,
            email: formData.email,
            role: formData.role,
          }
        : user
    );
    
    setUsers(updatedUsers);
    setIsEditDialogOpen(false);
    toast({
      title: "Success",
      description: "User updated successfully!",
      variant: "success",
    });
  };

  const handleDeleteUser = () => {
    if (!currentUser) return;
    
    const filteredUsers = users.filter((user) => user.id !== currentUser.id);
    setUsers(filteredUsers);
    setIsDeleteDialogOpen(false);
    toast({
      title: "Success",
      description: "User deleted successfully!",
      variant: "success",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <Button onClick={handleOpenAddDialog} className="flex items-center gap-2">
          <Plus size={16} />
          Add User
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardHeader className="bg-sidebar-accent/10">
              <CardTitle className="flex items-center gap-2">
                <UserIcon size={18} />
                {user.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-sm">
                <Mail size={14} />
                {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Role:</span>
                <span className="px-2 py-1 text-xs rounded-full bg-sidebar-accent/20 text-sidebar-accent">
                  {user.role}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditDialog(user)}
              >
                <Pencil size={14} className="mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleOpenDeleteDialog(user)}
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with their details and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter user name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              <X size={16} className="mr-1" />
              Cancel
            </Button>
            <Button onClick={handleAddUser}>
              <Check size={16} className="mr-1" />
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Enter user name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password (leave blank to keep unchanged)</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <X size={16} className="mr-1" />
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              <Check size={16} className="mr-1" />
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user: {currentUser?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
