import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, Users as UsersIcon, BookOpen, FileText, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

const editUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

type UserFormData = z.infer<typeof userSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

const Users: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form hooks
  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  console.log('Current user in Users page:', user);
  console.log('User organization_id:', user?.organization_id);

  // Query to fetch organization data to get assigned learning paths and assessments
  const { data: organizationData } = useQuery({
    queryKey: ['organization-data', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('assigned_learning_paths, assigned_assessments_code')
        .eq('id', user?.organization_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.organization_id
  });

  // Query to fetch students from the same organization
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['organization-students', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auth')
        .select('*')
        .eq('organization_id', user?.organization_id)
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  // Query to fetch all learning paths
  const { data: allLearningPaths } = useQuery({
    queryKey: ['all-learning-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data;
    }
  });

  // Query to fetch all assessments
  const { data: allAssessments } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Mutation to assign learning path to student
  const assignLearningPathMutation = useMutation({
    mutationFn: async ({ studentId, learningPathId }: { studentId: string; learningPathId: string }) => {
      // Get current assigned learning paths
      const { data: studentData, error: fetchError } = await supabase
        .from('auth')
        .select('assigned_learning_paths')
        .eq('id', studentId)
        .single();

      if (fetchError) throw fetchError;

      const currentPaths = studentData.assigned_learning_paths || [];
      const updatedPaths = currentPaths.includes(learningPathId) 
        ? currentPaths 
        : [...currentPaths, learningPathId];

      const { error } = await supabase
        .from('auth')
        .update({ assigned_learning_paths: updatedPaths })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-students'] });
      toast({
        title: "Success",
        description: "Learning path assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign learning path",
        variant: "destructive",
      });
    },
  });

  // Mutation to assign assessment to student
  const assignAssessmentMutation = useMutation({
    mutationFn: async ({ studentId, assessmentCode }: { studentId: string; assessmentCode: string }) => {
      // Get current assigned assessments
      const { data: studentData, error: fetchError } = await supabase
        .from('auth')
        .select('assigned_assessments')
        .eq('id', studentId)
        .single();

      if (fetchError) throw fetchError;

      const currentAssessments = studentData.assigned_assessments || [];
      const updatedAssessments = currentAssessments.includes(assessmentCode) 
        ? currentAssessments 
        : [...currentAssessments, assessmentCode];

      const { error } = await supabase
        .from('auth')
        .update({ assigned_assessments: updatedAssessments })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-students'] });
      toast({
        title: "Success",
        description: "Assessment assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign assessment",
        variant: "destructive",
      });
    },
  });

  // Query to fetch only admin users in the organization using organization_id
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-admin-users', user?.organization_id],
    queryFn: async () => {
      console.log('Fetching admin users for organization_id:', user?.organization_id);
      
      const { data, error } = await supabase
        .from('auth')
        .select('*')
        .eq('organization_id', user?.organization_id)
        .eq('role', 'admin')
        .order('created_at', { ascending: false });
      
      console.log('Admin users query result:', { data, error });
      
      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  console.log('Fetched users:', users);

  // Create admin user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      console.log('Creating user with organization_id:', user?.organization_id);
      
      const { data, error } = await supabase
        .from('auth')
        .insert([
          {
            email: userData.email,
            password: userData.password,
            name: userData.name,
            role: 'admin', // Force admin role
            organization_id: user?.organization_id,
          }
        ])
        .select()
        .single();

      console.log('Create user result:', { data, error });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-admin-users'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Admin user created successfully",
      });
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: string; email: string; name: string }) => {
      const { data, error } = await supabase
        .from('auth')
        .update({
          email: userData.email,
          name: userData.name,
        })
        .eq('id', userData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-admin-users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Admin user updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('auth')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-admin-users'] });
      toast({
        title: "Success",
        description: "Admin user deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditUser = (data: EditUserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        email: data.email,
        name: data.name,
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this admin user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email,
      name: user.name,
    });
    setIsEditDialogOpen(true);
  };

  const getAvailableLearningPaths = () => {
    const organizationPaths = organizationData?.assigned_learning_paths || [];
    return allLearningPaths?.filter(path => organizationPaths.includes(path.id)) || [];
  };

  const getAvailableAssessments = () => {
    const organizationAssessments = organizationData?.assigned_assessments_code || [];
    return allAssessments?.filter(assessment => organizationAssessments.includes(assessment.code)) || [];
  };

  if (isLoadingUsers || isLoadingStudents) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Users Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Admin User</DialogTitle>
              <DialogDescription>
                Create a new admin user account for your organization.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Creating..." : "Create Admin"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update admin user information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update Admin"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Organization Admin Users
          </CardTitle>
          <CardDescription>
            Manage admin users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell className="font-medium">{userData.name || '-'}</TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          admin
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{userData.organization_id}</TableCell>
                      <TableCell>{new Date(userData.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(userData)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(userData.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No admin users found in your organization.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Current organization ID: {user?.organization_id || 'Not set'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Student Management
          </CardTitle>
          <CardDescription>
            Manage students in your organization and assign learning paths and assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {students && students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>PRN</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Assigned Learning Paths</TableHead>
                    <TableHead>Assigned Assessments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.prn || '-'}</TableCell>
                      <TableCell>{student.department || '-'}</TableCell>
                      <TableCell>{student.year || '-'}</TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-600">
                          {(student.assigned_learning_paths || []).length} paths
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-600">
                          {(student.assigned_assessments || []).length} assessments
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Learning Paths Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <BookOpen className="h-4 w-4 mr-1" />
                                Learning Paths
                                <ChevronDown className="h-4 w-4 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {getAvailableLearningPaths().map((path) => (
                                <DropdownMenuItem
                                  key={path.id}
                                  onClick={() => assignLearningPathMutation.mutate({
                                    studentId: student.id,
                                    learningPathId: path.id
                                  })}
                                  disabled={
                                    (student.assigned_learning_paths || []).includes(path.id) ||
                                    assignLearningPathMutation.isPending
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{path.title}</span>
                                    <span className="text-xs text-gray-500">{path.difficulty}</span>
                                  </div>
                                  {(student.assigned_learning_paths || []).includes(path.id) && (
                                    <span className="ml-auto text-xs text-green-600">✓ Assigned</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                              {getAvailableLearningPaths().length === 0 && (
                                <DropdownMenuItem disabled>
                                  No learning paths available
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Assessments Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                Assessments
                                <ChevronDown className="h-4 w-4 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {getAvailableAssessments().map((assessment) => (
                                <DropdownMenuItem
                                  key={assessment.id}
                                  onClick={() => assignAssessmentMutation.mutate({
                                    studentId: student.id,
                                    assessmentCode: assessment.code
                                  })}
                                  disabled={
                                    (student.assigned_assessments || []).includes(assessment.code) ||
                                    assignAssessmentMutation.isPending
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{assessment.name}</span>
                                    <span className="text-xs text-gray-500">Code: {assessment.code}</span>
                                  </div>
                                  {(student.assigned_assessments || []).includes(assessment.code) && (
                                    <span className="ml-auto text-xs text-green-600">✓ Assigned</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                              {getAvailableAssessments().length === 0 && (
                                <DropdownMenuItem disabled>
                                  No assessments available
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No students found in your organization.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Current organization ID: {user?.organization_id || 'Not set'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
