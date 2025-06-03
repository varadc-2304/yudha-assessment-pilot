
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from "lucide-react";

const Settings: React.FC = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80">
            <SettingsIcon size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your application preferences and configuration</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <User size={16} className="mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bell size={16} className="mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield size={16} className="mr-2" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-8">
          <Card className="card-modern">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">General Settings</CardTitle>
                  <CardDescription>
                    Configure your basic account preferences and display options
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="content-spacing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group-modern">
                  <Label htmlFor="admin-name" className="text-sm font-medium">Admin Name</Label>
                  <Input id="admin-name" defaultValue="Yudha Admin" className="input-modern" />
                </div>
                
                <div className="form-group-modern">
                  <Label htmlFor="company-name" className="text-sm font-medium">Organization Name</Label>
                  <Input id="company-name" defaultValue="Yudha Inc." className="input-modern" />
                </div>
              </div>
              
              <div className="form-group-modern">
                <Label htmlFor="email" className="text-sm font-medium">Admin Email</Label>
                <Input id="email" type="email" defaultValue="admin@yudha.com" className="input-modern" />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-muted-foreground" />
                    <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Switch id="dark-mode" />
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button onClick={handleSave} className="btn-gradient-primary">
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-8">
          <Card className="card-modern">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Bell size={20} className="text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Notification Preferences</CardTitle>
                  <CardDescription>
                    Control how and when you receive notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="content-spacing">
              {[
                {
                  title: "Assessment Submissions",
                  description: "Get notified when students complete assessments",
                  defaultChecked: true
                },
                {
                  title: "Low Score Alerts",
                  description: "Receive alerts for submissions below passing threshold",
                  defaultChecked: true
                },
                {
                  title: "System Updates",
                  description: "Notifications about platform updates and maintenance",
                  defaultChecked: false
                },
                {
                  title: "Weekly Reports",
                  description: "Automated weekly performance summaries",
                  defaultChecked: true
                }
              ].map((notification, index) => (
                <div key={notification.title} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch defaultChecked={notification.defaultChecked} />
                </div>
              ))}
              
              <div className="form-group-modern pt-4">
                <Label htmlFor="notification-email" className="text-sm font-medium">Notification Email</Label>
                <Input 
                  id="notification-email" 
                  defaultValue="notifications@yudha.com" 
                  className="input-modern"
                  placeholder="Enter email for notifications"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button onClick={handleSave} className="btn-gradient-primary">
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-8">
          <Card className="card-modern">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Shield size={20} className="text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="content-spacing">
              <div className="grid grid-cols-1 gap-6">
                <div className="form-group-modern">
                  <Label htmlFor="current-password" className="text-sm font-medium">Current Password</Label>
                  <Input id="current-password" type="password" className="input-modern" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group-modern">
                    <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                    <Input id="new-password" type="password" className="input-modern" />
                  </div>
                  
                  <div className="form-group-modern">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" className="input-modern" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Two-factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button onClick={handleSave} className="btn-gradient-primary">
                Update Security Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
