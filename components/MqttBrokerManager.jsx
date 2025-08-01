"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Plus, Wifi, Loader2 } from "lucide-react";

export function MqttBrokerManager() {
  const [brokers, setBrokers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [brokerToDelete, setBrokerToDelete] = useState(null);
  const [status, setStatus] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    broker: "",
    port: 1883,
    topic: "",
    username: "",
    password: "",
    useTls: false,
  });

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/mqtt/brokers");
      if (response.ok) {
        const result = await response.json();
        setBrokers(result.data || []);
      }
    } catch (error) {
      console.error("Error loading MQTT brokers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      broker: "",
      port: 1883,
      topic: "",
      username: "",
      password: "",
      useTls: false,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.broker || !formData.topic) return;

    try {
      setStatus({ type: "loading", message: "Adding broker..." });

      const response = await fetch("/api/mqtt/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setBrokers((prev) => [result.data, ...prev]);
        resetForm();
        setIsAddDialogOpen(false);
        setStatus({ type: "success", message: "Broker added successfully!" });
      } else {
        throw new Error(result.error || "Failed to add broker");
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingBroker) return;

    try {
      setStatus({ type: "loading", message: "Updating broker..." });

      const response = await fetch(`/api/mqtt/brokers/${editingBroker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setBrokers((prev) =>
          prev.map((broker) =>
            broker.id === editingBroker.id ? result.data : broker
          )
        );
        resetForm();
        setEditingBroker(null);
        setIsEditDialogOpen(false);
        setStatus({ type: "success", message: "Broker updated successfully!" });
      } else {
        throw new Error(result.error || "Failed to update broker");
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const handleEditClick = (broker) => {
    setEditingBroker(broker);
    setFormData({
      name: broker.name || "",
      broker: broker.broker || "",
      port: broker.port || 1883,
      topic: broker.topic || "",
      username: broker.username || "",
      password: broker.password || "",
      useTls: broker.use_tls || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (broker) => {
    setBrokerToDelete(broker);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!brokerToDelete) return;

    try {
      setStatus({ type: "loading", message: "Deleting broker..." });

      const response = await fetch(`/api/mqtt/brokers/${brokerToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setBrokers((prev) =>
          prev.filter((broker) => broker.id !== brokerToDelete.id)
        );
        setIsDeleteConfirmOpen(false);
        setBrokerToDelete(null);
        setStatus({ type: "success", message: "Broker deleted successfully!" });
      } else {
        throw new Error(result.error || "Failed to delete broker");
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          MQTT Brokers
        </h2>
        <p className="text-muted-foreground">
          Configure MQTT brokers for sending plate detection notifications.
        </p>
      </div>

      {status && (
        <Alert
          className={`${
            status.type === "error"
              ? "bg-red-50 text-red-900 border-red-200"
              : status.type === "success"
              ? "bg-green-50 text-green-900 border-green-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Desktop Table View */}
      <div className="rounded-md border dark:bg-[#0e0e10] hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IP/Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>TLS</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    <div className="text-muted-foreground">
                      Loading MQTT brokers...
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : brokers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Wifi className="h-8 w-8 text-muted-foreground" />
                    <div className="text-muted-foreground">
                      No MQTT brokers configured
                    </div>
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      size="sm"
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Broker
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              brokers.map((broker) => (
                <TableRow key={broker.id}>
                  <TableCell className="font-medium">{broker.name}</TableCell>
                  <TableCell>{broker.broker}</TableCell>
                  <TableCell>{broker.port}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {broker.topic}
                  </TableCell>
                  <TableCell>
                    {broker.use_tls ? (
                      <span className="text-green-600 text-sm">Enabled</span>
                    ) : (
                      <span className="text-gray-500 text-sm">Disabled</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => handleEditClick(broker)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteClick(broker)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {isLoading ? (
          <Card className="dark:bg-[#0e0e10]">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <div className="text-center">
                <div className="text-muted-foreground">
                  Loading MQTT brokers...
                </div>
              </div>
            </CardContent>
          </Card>
        ) : brokers.length === 0 ? (
          <Card className="dark:bg-[#0e0e10]">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <Wifi className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <div className="text-muted-foreground mb-2">
                  No MQTT brokers configured
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Broker
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          brokers.map((broker) => (
            <Card key={broker.id} className="dark:bg-[#0e0e10]">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium">{broker.name}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleEditClick(broker)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-red-500"
                      onClick={() => handleDeleteClick(broker)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    Broker: {broker.broker}:{broker.port}
                  </div>
                  <div>Topic: {broker.topic}</div>
                  <div>TLS: {broker.use_tls ? "Enabled" : "Disabled"}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {brokers.length > 0 && !isLoading && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Broker
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingBroker(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBroker ? "Edit MQTT Broker" : "Add MQTT Broker"}
            </DialogTitle>
            <DialogDescription>
              Configure the MQTT broker connection settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingBroker ? handleEdit : handleAdd}>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <Input
                  placeholder="My MQTT Broker"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Broker URL/IP</Label>
                <Input
                  placeholder="mqtt.example.com"
                  value={formData.broker}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, broker: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Port</Label>
                <Input
                  type="number"
                  placeholder="1883"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      port: parseInt(e.target.value) || 1883,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Topic</Label>
                <Input
                  placeholder="alpr/plates"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, topic: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Username (optional)
                </Label>
                <Input
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Password (optional)
                </Label>
                <Input
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useTls"
                  checked={formData.useTls}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, useTls: checked }))
                  }
                />
                <Label htmlFor="useTls" className="text-sm">
                  Use TLS/SSL encryption
                </Label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingBroker(null);
                  resetForm();
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {editingBroker ? "Update Broker" : "Add Broker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete MQTT Broker</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the broker &quot;
              {brokerToDelete?.name}
              &quot;? This will also remove all notifications associated with
              this broker.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Delete Broker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
