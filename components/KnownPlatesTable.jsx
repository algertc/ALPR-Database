"use client";

import { useState, useEffect } from "react";
import { Search, Tag, Pencil, X, EyeOff, Eye } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getPlates,
  getTags,
  addKnownPlate,
  tagPlate,
  untagPlate,
  deletePlate,
  fetchPlateInsights,
  getKnownPlatesList,
  deletePlateFromDB,
  toggleIgnorePlate,
} from "@/app/actions";

export function KnownPlatesTable({ initialData }) {
  const [data, setData] = useState(initialData);
  const [filteredData, setFilteredData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditPlateOpen, setIsEditPlateOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [activePlate, setActivePlate] = useState(null);
  const [editPlateData, setEditPlateData] = useState({ name: "", notes: "" });
  const [availableTags, setAvailableTags] = useState([]);
  const [isIgnoreConfirmOpen, setIsIgnoreConfirmOpen] = useState(false);
  const [isAddPlateOpen, setIsAddPlateOpen] = useState(false);
  const [newPlateData, setNewPlateData] = useState({
    plateNumber: "",
    name: "",
    notes: "",
  });
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const loadTags = async () => {
      const result = await getTags();
      if (result.success) {
        setAvailableTags(result.data);
      }
    };
    loadTags();
  }, []);

  useEffect(() => {
    const filtered = data.filter(
      (plate) =>
        plate.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plate.name &&
          plate.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (plate.notes &&
          plate.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredData(filtered);
  }, [data, searchTerm]);

  const handleAddTag = async (plateNumber, tagName) => {
    try {
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("tagName", tagName);

      const result = await tagPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) => {
            if (plate.plate_number === plateNumber) {
              return {
                ...plate,
                tags: [...(plate.tags || []), tagName], // Note: just adding the tagName since that's our data structure
              };
            }
            return plate;
          })
        );
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (plateNumber, tagName) => {
    try {
      const formData = new FormData();
      formData.append("plateNumber", plateNumber);
      formData.append("tagName", tagName);

      const result = await untagPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) => {
            if (plate.plate_number === plateNumber) {
              return {
                ...plate,
                tags: (plate.tags || []).filter((tag) => tag !== tagName), // Note: comparing tagName strings
              };
            }
            return plate;
          })
        );
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleEditPlate = async () => {
    if (!activePlate) return;
    try {
      const formData = new FormData();
      formData.append("plateNumber", activePlate.plate_number);
      formData.append("name", editPlateData.name);
      formData.append("notes", editPlateData.notes && editPlateData.notes);

      const result = await addKnownPlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.map((plate) =>
            plate.plate_number === activePlate.plate_number
              ? {
                  ...plate,
                  name: editPlateData.name,
                  notes: editPlateData.notes,
                }
              : plate
          )
        );
        setIsEditPlateOpen(false);
        setEditPlateData({ name: "", notes: "" });
      }
    } catch (error) {
      console.error("Failed to update known plate:", error);
    }
  };

  const handleRemoveFromKnown = async () => {
    if (!activePlate) return;
    try {
      const formData = new FormData();
      formData.append("plateNumber", activePlate.plate_number);

      const result = await deletePlate(formData);
      if (result.success) {
        setData((prevData) =>
          prevData.filter(
            (plate) => plate.plate_number !== activePlate.plate_number
          )
        );
        setIsRemoveConfirmOpen(false);
      }
    } catch (error) {
      console.error("Failed to remove from known plates:", error);
    }
  };

  const handleToggleIgnore = async () => {
    if (!activePlate) return;

    const formData = new FormData();
    formData.append("plateNumber", activePlate.plate_number);
    formData.append("ignore", (!activePlate.ignore).toString());

    const result = await toggleIgnorePlate(formData);
    if (result.success) {
      setData((prevData) =>
        prevData.map((plate) =>
          plate.plate_number === activePlate.plate_number
            ? { ...plate, ignore: !plate.ignore }
            : plate
        )
      );
      setIsIgnoreConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="py-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search plates, names, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 dark:bg-[#161618]"
                icon={
                  <Search
                    size={16}
                    className="text-gray-400 dark:text-gray-500 "
                  />
                }
              />
            </div>
            <Button onClick={() => setIsAddPlateOpen(true)}>
              Add New Plate
            </Button>
          </div>

          <div className="rounded-md border dark:bg-[#0e0e10]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] pl-4">Plate Number</TableHead>
                  <TableHead className="w-[150px]">Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[120px]">Added On</TableHead>
                  <TableHead className="w-[150px]">Tags</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((plate) => (
                  <TableRow key={plate.plate_number}>
                    <TableCell className="font-mono text-lg font-medium pl-4">
                      {plate.plate_number}
                    </TableCell>
                    <TableCell>{plate.name}</TableCell>
                    <TableCell>{plate.notes}</TableCell>
                    <TableCell>
                      {new Date(plate.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {plate.tags?.length > 0 ? (
                          plate.tags.map((tagName) => {
                            const tagInfo = availableTags.find(
                              (t) => t.name === tagName
                            );
                            if (!tagInfo) return null;

                            return (
                              <Badge
                                key={`${plate.plate_number}-${tagName}`}
                                variant="secondary"
                                className="text-xs py-0.5 pl-2 pr-1 flex items-center space-x-1"
                                style={{
                                  backgroundColor: tagInfo.color,
                                  color: "#fff",
                                }}
                              >
                                <span>{tagName}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white rounded-full"
                                  onClick={() =>
                                    handleRemoveTag(plate.plate_number, tagName)
                                  }
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">
                                    Remove {tagName} tag
                                  </span>
                                </Button>
                              </Badge>
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No tags
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Tag className="h-4 w-4" />
                              <span className="sr-only">Add tag</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {availableTags.map((tag) => (
                              <DropdownMenuItem
                                key={tag.name}
                                onClick={() =>
                                  handleAddTag(plate.plate_number, tag.name)
                                }
                              >
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  {tag.name}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setActivePlate(plate);
                            setEditPlateData({
                              name: plate.name,
                              notes: plate.notes,
                            });
                            setIsEditPlateOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit plate details</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={
                            plate.ignore
                              ? "text-orange-500 hover:text-orange-700"
                              : ""
                          }
                          onClick={() => {
                            setActivePlate(plate);
                            setIsIgnoreConfirmOpen(true);
                          }}
                        >
                          {plate.ignore ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {plate.ignore ? "Stop ignoring" : "Ignore plate"}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setActivePlate(plate);
                            setIsRemoveConfirmOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">
                            Remove from known plates
                          </span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={isEditPlateOpen} onOpenChange={setIsEditPlateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Known Plate</DialogTitle>
                <DialogDescription>
                  Update details for the plate {activePlate?.plate_number}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={editPlateData.name}
                    onChange={(e) =>
                      setEditPlateData({
                        ...editPlateData,
                        name: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={editPlateData.notes}
                    onChange={(e) =>
                      setEditPlateData({
                        ...editPlateData,
                        notes: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleEditPlate}>
                  Update Plate Details
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isRemoveConfirmOpen}
            onOpenChange={setIsRemoveConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove from Known Plates</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove {activePlate?.plate_number}{" "}
                  from known plates? This action can be undone by adding the
                  plate back to known plates later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRemoveConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRemoveFromKnown}>
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Dialog open={isIgnoreConfirmOpen} onOpenChange={setIsIgnoreConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activePlate?.ignore ? "Stop Ignoring Plate" : "Ignore Plate"}
            </DialogTitle>
            <DialogDescription>
              {activePlate?.ignore
                ? "This plate number will now be accepted into the recognition feed."
                : "This plate will be ignored in the recognition feed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsIgnoreConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={activePlate?.ignore ? "default" : "destructive"}
              onClick={handleToggleIgnore}
            >
              {activePlate?.ignore ? "Stop Ignoring" : "Ignore Plate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddPlateOpen} onOpenChange={setIsAddPlateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Plate</DialogTitle>
            <DialogDescription>
              Add a new license plate to the known plates database
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plateNumber" className="text-right">
                Plate Number
              </Label>
              <Input
                id="plateNumber"
                value={newPlateData.plateNumber}
                onChange={(e) =>
                  setNewPlateData({
                    ...newPlateData,
                    plateNumber: e.target.value.toUpperCase(),
                  })
                }
                required
                className="col-span-3"
                placeholder="ABC123"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newName" className="text-right">
                Name
              </Label>
              <Input
                id="newName"
                value={newPlateData.name}
                onChange={(e) =>
                  setNewPlateData({
                    ...newPlateData,
                    name: e.target.value,
                  })
                }
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newNotes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="newNotes"
                value={newPlateData.notes}
                onChange={(e) =>
                  setNewPlateData({
                    ...newPlateData,
                    notes: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <div className="w-full flex flex-col gap-2">
              {errorMessage && (
                <p className="text-destructive text-sm">{errorMessage}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddPlateOpen(false);
                    setNewPlateData({ plateNumber: "", name: "", notes: "" });
                    setErrorMessage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={async () => {
                    if (!newPlateData.plateNumber?.trim()) {
                      setErrorMessage("Plate number is required");
                      return;
                    }
                    if (!newPlateData.name?.trim()) {
                      setErrorMessage("Name is required");
                      return;
                    }

                    const formData = new FormData();
                    formData.append("plateNumber", newPlateData.plateNumber);
                    formData.append("name", newPlateData.name);
                    formData.append("notes", newPlateData.notes);

                    const result = await addKnownPlate(formData);
                    if (result.success) {
                      setData([
                        ...data,
                        {
                          plate_number: newPlateData.plateNumber,
                          name: newPlateData.name,
                          notes: newPlateData.notes,
                          created_at: new Date().toISOString(),
                          tags: [],
                        },
                      ]);
                      setIsAddPlateOpen(false);
                      setNewPlateData({ plateNumber: "", name: "", notes: "" });
                      setErrorMessage("");
                    }
                  }}
                >
                  Add Plate
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
