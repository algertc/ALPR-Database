"use client";
import { useState } from "react";
import {
  addNotificationPlate,
  toggleNotification,
  deleteNotification,
  updateNotificationPriority,
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
import { Trash2, Bell, Search } from "lucide-react";

const priorityOptions = [
  { value: -2, label: "Lowest", description: "No notification or alert" },
  { value: -1, label: "Low", description: "Quiet notification" },
  { value: 0, label: "Normal", description: "Normal notification" },
  { value: 1, label: "High", description: "High-priority notification" },
  { value: 2, label: "Emergency", description: "Require confirmation" },
];

export function NotificationsTable({ initialData }) {
  const [data, setData] = useState(initialData);
  const [newPlate, setNewPlate] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [plateToDelete, setPlateToDelete] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPlate) return;

    const formData = new FormData();
    formData.append("plateNumber", newPlate.toUpperCase());

    const result = await addNotificationPlate(formData);
    if (result) {
      setData((prev) => [result, ...prev]);
      setNewPlate("");
      setIsAddDialogOpen(false);
    }
  };

  const handleToggle = async (plateNumber, enabled) => {
    const formData = new FormData();
    formData.append("plateNumber", plateNumber);
    formData.append("enabled", (!enabled).toString());

    const result = await toggleNotification(formData);
    if (result) {
      setData((prev) =>
        prev.map((p) =>
          p.plate_number === plateNumber ? { ...p, enabled: !enabled } : p
        )
      );
    }
  };

  const handlePriorityChange = async (plateNumber, priority) => {
    const result = await updateNotificationPriority({
      plateNumber,
      priority,
    });

    if (result.success) {
      setData((prev) =>
        prev.map((p) =>
          p.plate_number === plateNumber
            ? { ...p, priority: parseInt(priority) }
            : p
        )
      );
    }
  };

  const handleTestNotification = async (plateNumber) => {
    try {
      setTestStatus({
        type: "loading",
        message: "Sending test notification...",
      });
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("message", "This is a test notification");

      const response = await fetch("/api/notifications/test", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setTestStatus({
          type: "success",
          message: "Test notification sent successfully!",
        });
      } else {
        throw new Error(result.error || "Failed to send test notification");
      }
    } catch (error) {
      setTestStatus({ type: "error", message: error.message });
    }

    // Clear status after 3 seconds
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleDeleteClick = (plate) => {
    setPlateToDelete(plate);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!plateToDelete) return;

    const formData = new FormData();
    formData.append("plateNumber", plateToDelete.plate_number);

    await deleteNotification(formData);
    setData((prev) =>
      prev.filter((p) => p.plate_number !== plateToDelete.plate_number)
    );
    setIsDeleteConfirmOpen(false);
    setPlateToDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="py-2">
        {/* Responsive form layout */}
        {/* <form
          onSubmit={handleAdd}
          className="flex flex-col sm:flex-row gap-2 mb-4"
        >
          <Input
            placeholder="Enter plate number..."
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
            className="w-full sm:w-80 dark:bg-[#0e0e10]"
            icon={
              <Search size={16} className="text-gray-400 dark:text-gray-500" />
            }
          />
          <Button type="submit" className="w-full sm:w-auto">
            Create Notification
          </Button>
        </form> */}
        <div className="flex justify-end items-center">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="mb-4 w-fit"
          >
            Add Notification Plate
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Notification Plate</DialogTitle>
                <DialogDescription>
                  Enter a license plate number to receive notifications when
                  it&apos;s detected.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <div className="py-4">
                  <Input
                    placeholder="Enter plate number..."
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full"
                    autoFocus
                  />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    Add Plate
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {testStatus && (
          <Alert
            className={`mb-4 ${
              testStatus.type === "error"
                ? "bg-red-50 text-red-900 border-red-200"
                : testStatus.type === "success"
                ? "bg-green-50 text-green-900 border-green-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            <AlertDescription>{testStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Desktop Table View */}
        <div className="rounded-md border dark:bg-[#0e0e10] px-2 hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Notifications</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No notification plates configured
                  </TableCell>
                </TableRow>
              ) : (
                data.map((plate) => (
                  <TableRow key={plate.plate_number}>
                    <TableCell className="font-medium font-mono">
                      {plate.plate_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {plate.tags?.length > 0 ? (
                          plate.tags.map((tag) => (
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
                    <TableCell>
                      <Select
                        value={String(plate.priority ?? 1)}
                        onValueChange={(value) =>
                          handlePriorityChange(plate.plate_number, value)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
                              <div>
                                <div>{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={plate.enabled}
                        onCheckedChange={() =>
                          handleToggle(plate.plate_number, plate.enabled)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() =>
                            handleTestNotification(plate.plate_number)
                          }
                          title="Send test notification"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteClick(plate)}
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
              No notification plates configured
            </div>
          ) : (
            data.map((plate) => (
              <Card key={plate.plate_number} className="dark:bg-[#0e0e10]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium font-mono">
                      {plate.plate_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Active:</span>
                      <Switch
                        checked={plate.enabled}
                        onCheckedChange={() =>
                          handleToggle(plate.plate_number, plate.enabled)
                        }
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground mr-1">
                        Tags:
                      </span>
                      {plate.tags?.length > 0 ? (
                        plate.tags.map((tag) => (
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

                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-2">
                        Priority:
                      </span>
                      <Select
                        value={String(plate.priority ?? 1)}
                        onValueChange={(value) =>
                          handlePriorityChange(plate.plate_number, value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
                              <div>
                                <div className="text-sm">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-blue-500"
                      onClick={() => handleTestNotification(plate.plate_number)}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-red-500"
                      onClick={() => handleDeleteClick(plate)}
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

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove notifications for plate{" "}
              {plateToDelete?.plate_number}? This will stop all notifications
              for this plate.
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
