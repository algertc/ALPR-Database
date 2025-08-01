"use client";
import { useState, useEffect } from "react";
import {
  getMqttBrokersAction,
  addMqttNotificationAction,
  editMqttNotificationAction,
  toggleMqttNotificationAction,
  deleteMqttNotificationAction,
  testMqttNotificationAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Edit, Wifi, Bell } from "lucide-react";

export function MqttNotificationsTable({ initialData = [] }) {
  const [data, setData] = useState(initialData);
  const [brokers, setBrokers] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [editingNotification, setEditingNotification] = useState(null);
  const [testStatus, setTestStatus] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    plateNumber: "",
    name: "",
    brokerId: "",
    message: "",
    includeKnownPlateInfo: true,
  });

  useEffect(() => {
    loadBrokers();
  }, []);

  // Update data when initialData prop changes (after revalidation)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const loadBrokers = async () => {
    const result = await getMqttBrokersAction();
    if (result.success) {
      setBrokers(result.data);
    }
  };

  const resetForm = () => {
    setFormData({
      plateNumber: "",
      name: "",
      brokerId: "",
      message: "",
      includeKnownPlateInfo: true,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.plateNumber || !formData.name || !formData.brokerId) return;

    const form = new FormData();
    form.append("plateNumber", formData.plateNumber.toUpperCase());
    form.append("name", formData.name);
    form.append("brokerId", formData.brokerId);
    form.append("message", formData.message);
    form.append(
      "includeKnownPlateInfo",
      formData.includeKnownPlateInfo.toString()
    );

    const result = await addMqttNotificationAction(form);
    if (result.success) {
      setData((prev) => [result.data, ...prev]);
      resetForm();
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingNotification) return;

    const form = new FormData();
    form.append("id", editingNotification.id.toString());
    form.append("plateNumber", formData.plateNumber.toUpperCase());
    form.append("name", formData.name);
    form.append("brokerId", formData.brokerId);
    form.append("message", formData.message);
    form.append(
      "includeKnownPlateInfo",
      formData.includeKnownPlateInfo.toString()
    );

    const result = await editMqttNotificationAction(form);
    if (result.success) {
      setData((prev) =>
        prev.map((item) =>
          item.id === editingNotification.id ? result.data : item
        )
      );
      resetForm();
      setEditingNotification(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleToggle = async (notification) => {
    const form = new FormData();
    form.append("id", notification.id.toString());
    form.append("enabled", (!notification.enabled).toString());

    const result = await toggleMqttNotificationAction(form);
    if (result.success) {
      setData((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, enabled: !notification.enabled }
            : item
        )
      );
    }
  };

  const handleDeleteClick = (notification) => {
    setNotificationToDelete(notification);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    const form = new FormData();
    form.append("id", notificationToDelete.id.toString());

    const result = await deleteMqttNotificationAction(form);
    if (result.success) {
      setData((prev) =>
        prev.filter((item) => item.id !== notificationToDelete.id)
      );
      setIsDeleteConfirmOpen(false);
      setNotificationToDelete(null);
    }
  };

  const handleEditClick = (notification) => {
    setEditingNotification(notification);
    setFormData({
      plateNumber: notification.plate_number,
      name: notification.name,
      brokerId: notification.brokerid?.toString() || "",
      message: notification.message || "",
      includeKnownPlateInfo: notification.includeknownplateinfo,
    });
    setIsEditDialogOpen(true);
  };

  const handleTestNotification = async (notification) => {
    try {
      setTestStatus({
        type: "loading",
        message: "Sending test MQTT notification...",
      });

      const formData = new FormData();
      formData.append("id", notification.id.toString());

      const result = await testMqttNotificationAction(formData);

      if (result.success) {
        setTestStatus({
          type: "success",
          message: `Test MQTT notification sent successfully to ${notification.broker_name}!`,
        });
      } else {
        throw new Error(
          result.error || "Failed to send test MQTT notification"
        );
      }
    } catch (error) {
      setTestStatus({ type: "error", message: error.message });
    }

    setTimeout(() => setTestStatus(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="py-2">
        {testStatus && (
          <Alert
            className={`mb-4 ${
              testStatus.type === "error"
                ? "bg-red-50 text-red-900 border-red-200"
                : testStatus.type === "success"
                ? "bg-green-50 text-green-900 dark:text-green-500 border-green-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            <AlertDescription>{testStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Desktop Table View */}
        <div className="rounded-md border dark:bg-[#0e0e10] hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Plate Number</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Notification Name</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No MQTT notifications configured
                  </TableCell>
                </TableRow>
              ) : (
                data.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium font-mono pl-4">
                      {notification.plate_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {notification.tags?.length > 0 ? (
                          notification.tags.map((tag) => (
                            <Badge
                              key={tag.name}
                              variant="secondary"
                              className="text-xs py-0.5 px-2"
                              style={{
                                backgroundColor: tag.color,
                                color: "#fff",
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No tags
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{notification.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {notification.broker_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {notification.broker_topic}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">
                        {notification.message || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={notification.enabled}
                        onCheckedChange={() => handleToggle(notification)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => handleTestNotification(notification)}
                          title="Send test MQTT notification"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-600 dark:text-white/80 hover:text-gray-700"
                          onClick={() => handleEditClick(notification)}
                          title="Edit notification"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteClick(notification)}
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
          {data.length === 0 ? (
            <div className="text-center py-4 border rounded-md dark:bg-[#0e0e10]">
              No MQTT notifications configured
            </div>
          ) : (
            data.map((notification) => (
              <Card key={notification.id} className="dark:bg-[#0e0e10]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium font-mono">
                      {notification.plate_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Active:</span>
                      <Switch
                        checked={notification.enabled}
                        onCheckedChange={() => handleToggle(notification)}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground mr-1">
                        Tags:
                      </span>
                      {notification.tags?.length > 0 ? (
                        notification.tags.map((tag) => (
                          <Badge
                            key={tag.name}
                            variant="secondary"
                            className="text-[10px] py-0.5 px-2"
                            style={{
                              backgroundColor: tag.color,
                              color: "#fff",
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          No tags
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Name: </span>
                      {notification.name}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Broker: </span>
                      {notification.broker_name}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Message: </span>
                      <div className="truncate">
                        {notification.message || "Default message"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-blue-500"
                      onClick={() => handleTestNotification(notification)}
                    >
                      <Wifi className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-gray-500"
                      onClick={() => handleEditClick(notification)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-red-500"
                      onClick={() => handleDeleteClick(notification)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end items-center">
        <Button onClick={() => setIsAddDialogOpen(true)} className="mb-4 w-fit">
          Add MQTT Notification
        </Button>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add MQTT Notification</DialogTitle>
            <DialogDescription>
              Configure MQTT notifications for specific plate detections.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Plate Number</label>
                <Input
                  placeholder="Enter plate number..."
                  value={formData.plateNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      plateNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Notification name..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">MQTT Broker</label>
                <Select
                  value={formData.brokerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, brokerId: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id.toString()}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Custom message (optional)..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeKnownPlateInfo"
                  checked={formData.includeKnownPlateInfo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeKnownPlateInfo: checked,
                    }))
                  }
                />
                <label htmlFor="includeKnownPlateInfo" className="text-sm">
                  Include known plate information
                </label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
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
                Add Notification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit MQTT Notification</DialogTitle>
            <DialogDescription>
              Update the MQTT notification configuration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Plate Number</label>
                <Input
                  placeholder="Enter plate number..."
                  value={formData.plateNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      plateNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Notification name..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">MQTT Broker</label>
                <Select
                  value={formData.brokerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, brokerId: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id.toString()}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Custom message (optional)..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIncludeKnownPlateInfo"
                  checked={formData.includeKnownPlateInfo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeKnownPlateInfo: checked,
                    }))
                  }
                />
                <label htmlFor="editIncludeKnownPlateInfo" className="text-sm">
                  Include known plate information
                </label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingNotification(null);
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
                Update Notification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove MQTT Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the MQTT notification for plate{" "}
              {notificationToDelete?.plate_number}? This action cannot be
              undone.
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
