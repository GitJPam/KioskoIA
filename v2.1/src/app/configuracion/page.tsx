"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  User,
  Users,
  Store,
  Bell,
  Shield,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user, isAuthenticated, setLoading, setUser } = useAuthStore();

  const [loading, setLoading2] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Dialogs state
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("TENDERO");
  const [userPhone, setUserPhone] = useState("");
  const [userActive, setUserActive] = useState(true);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const result = await response.json();
        if (!result.success || !result.data?.user) {
          router.push("/login");
          return;
        }
        console.log("User role from API:", result.data.user.role);
        setUser(result.data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
        setLoading2(false);
      }
    };
    checkAuth();
  }, [router, setLoading, setUser]);

  // Load users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("User authenticated:", user.email, "Role:", user.role);
      if (user.role === "ADMIN") {
        loadUsers();
      }
    }
  }, [isAuthenticated, user]);

  // Reset form
  const resetForm = () => {
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setUserRole("TENDERO");
    setUserPhone("");
    setUserActive(true);
    setEditingUser(null);
  };

  // Open create dialog
  const handleCreateUser = () => {
    resetForm();
    setShowUserDialog(true);
  };

  // Open edit dialog
  const handleEditUser = (userToEdit: UserItem) => {
    setEditingUser(userToEdit);
    setUserName(userToEdit.name);
    setUserEmail(userToEdit.email);
    setUserPassword("");
    setUserRole(userToEdit.role);
    setUserPhone(userToEdit.phone || "");
    setUserActive(userToEdit.isActive);
    setShowUserDialog(true);
  };

  // Open delete dialog
  const handleDeleteClick = (userToDelete: UserItem) => {
    setUserToDelete(userToDelete);
    setShowDeleteDialog(true);
  };

  // Save user (create or update)
  const handleSaveUser = async () => {
    if (!userName || !userEmail) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    if (!editingUser && !userPassword) {
      toast.error("La contraseña es requerida para nuevos usuarios");
      return;
    }

    if (userPassword && userPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: userName,
        email: userEmail,
        role: userRole,
        phone: userPhone || null,
        isActive: userActive,
      };

      if (userPassword) {
        body.password = userPassword;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          editingUser
            ? "Usuario actualizado correctamente"
            : "Usuario creado correctamente"
        );
        setShowUserDialog(false);
        resetForm();
        loadUsers();
      } else {
        toast.error(result.error || "Error al guardar usuario");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Usuario eliminado correctamente");
        setShowDeleteDialog(false);
        setUserToDelete(null);
        loadUsers();
      } else {
        toast.error(result.error || "Error al eliminar usuario");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <AppShell title="Configuración">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-500" />
            Configuración
          </h2>
          <p className="text-gray-500">
            Gestiona la configuración de tu tienda
          </p>
        </div>

        {/* Users Management - Only for Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Gestión de Usuarios
                  </CardTitle>
                  <CardDescription>
                    Crea y administra usuarios del sistema
                  </CardDescription>
                </div>
                <Button
                  onClick={handleCreateUser}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No hay usuarios registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="text-sm font-semibold text-emerald-700">
                                  {u.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.role === "ADMIN"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {u.role === "ADMIN" ? "Administrador" : "Tendero"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {u.phone || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                u.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }
                            >
                              {u.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(u)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteClick(u)}
                                disabled={u.id === user?.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Mi Perfil
              </CardTitle>
              <CardDescription>Información de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-emerald-700">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <Badge className="mt-1">
                    {user?.role === "ADMIN" ? "Administrador" : "Tendero"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={user?.name || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={user?.phone || ""}
                    disabled
                    placeholder="No configurado"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5" />
                Información de la Tienda
              </CardTitle>
              <CardDescription>Datos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la tienda</Label>
                <Input defaultValue="Kiosko Escolar" />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input defaultValue="Colegio San José, Palmira" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono de contacto</Label>
                <Input placeholder="+57 300 123 4567" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clasificar alimentos saludables</p>
                  <p className="text-sm text-gray-500">
                    Mostrar indicador de productos saludables
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de stock bajo</p>
                  <p className="text-sm text-gray-500">
                    Recibir notificaciones cuando el stock sea bajo
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>
                Configura tus preferencias de notificación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Resumen diario</p>
                  <p className="text-sm text-gray-500">
                    Recibir resumen de ventas al final del día
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de inventario</p>
                  <p className="text-sm text-gray-500">
                    Notificar cuando productos estén por agotarse
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Predicciones de IA</p>
                  <p className="text-sm text-gray-500">
                    Sugerencias automáticas de pedidos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Información del Sistema
              </CardTitle>
              <CardDescription>Estado y versión del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Versión</span>
                <Badge variant="outline">1.0.0</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Base de datos</span>
                <Badge className="bg-emerald-100 text-emerald-700">SQLite</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Estado</span>
                <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Última sincronización</span>
                <span className="text-sm">
                  {new Date().toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Dialog (Create/Edit) */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza la información del usuario"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nombre *</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPassword">
                Contraseña {editingUser ? "(dejar vacío para no cambiar)" : "*"}
              </Label>
              <Input
                id="userPassword"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userRole">Rol</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="TENDERO">Tendero</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPhone">Teléfono</Label>
              <Input
                id="userPhone"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>

            {editingUser && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Usuario Activo</p>
                  <p className="text-sm text-gray-500">
                    El usuario puede iniciar sesión
                  </p>
                </div>
                <Switch
                  checked={userActive}
                  onCheckedChange={setUserActive}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowUserDialog(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveUser}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingUser ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{" "}
              <strong>{userToDelete?.name}</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
