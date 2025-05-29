"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/MainLayout";
import TitleNavbar from "@/components/layout/TitleNav";
import { getTags, addTag, removeTag, updateTag } from "@/actions";
import { cn } from "@/lib/utils";

const TagDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
}) => {
  const [tagName, setTagName] = useState(initialData?.name ?? "");
  const [tagColor, setTagColor] = useState(initialData?.color ?? "#22c55e");

  useEffect(() => {
    if (isOpen) {
      setTagName(initialData?.name ?? "");
      setTagColor(initialData?.color ?? "#22c55e");
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tagName.trim()) {
      const formData = new FormData();
      formData.append("name", tagName.trim());
      formData.append("color", tagColor);
      if (mode === "edit") {
        formData.append("originalName", initialData.name);
      }
      onSubmit(formData);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "Create New Tag" : "Edit Tag"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tagName">Tag Name</Label>
          <Input
            id="tagName"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Enter tag name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagColor">Tag Color</Label>
          <div className="flex space-x-2">
            <Input
              id="tagColor"
              type="color"
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
              className="w-12 p-1 h-10"
            />
            <Input
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
              placeholder="#RRGGBB"
              className="flex-grow"
            />
          </div>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1 sm:mr-2"
          >
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">
            {mode === "create" ? "Create Tag" : "Save Changes"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};

const ElegantTagManagement = () => {
  const [tags, setTags] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);

  useEffect(() => {
    const loadTags = async () => {
      const result = await getTags();
      if (result.success) {
        setTags(result.data);
      }
    };
    loadTags();
  }, []);

  const onCreateTag = async (formData) => {
    try {
      const result = await addTag(formData);
      if (result.success) {
        setTags([...tags, result.data]);
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const onUpdateTag = async (formData) => {
    try {
      const result = await updateTag(formData);
      if (result.success) {
        setTags(
          tags.map((tag) =>
            tag.name === formData.get("originalName") ? result.data : tag
          )
        );
        setIsEditDialogOpen(false);
        setEditingTag(null);
      }
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleDeleteClick = (tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const onDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      const formData = new FormData();
      formData.append("name", tagToDelete.name);
      const result = await removeTag(formData);
      if (result.success) {
        setTags(tags.filter((tag) => tag.name !== tagToDelete.name));
      }
    } catch (error) {
      console.error("Failed to delete tag:", error);
    } finally {
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <TitleNavbar title="Plate Database">
        <div className="w-full rounded-md border p-4 dark:bg-[#0e0e10]">
          <div className="flex justify-between pb-4 border-b">
            <h3 className="text-lg sm:text-xl font-semibold">Tags</h3>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="sm:size-default">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap">Add Tag</span>
                </Button>
              </DialogTrigger>
              <TagDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSubmit={onCreateTag}
                initialData={null}
                mode="create"
              />
            </Dialog>
          </div>

          <ScrollArea className="h-[250px] sm:h-[300px] mt-4 pr-2">
            <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 sm:pt-4">
              {tags?.length === 0 ? (
                <div className="w-full text-center py-6 text-muted-foreground">
                  No tags available. Create your first tag with the &ldquo;Add
                  Tag&rdquo; button.
                </div>
              ) : (
                tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-4 flex items-center space-x-1 sm:space-x-2 hover:shadow-sm transition-shadow"
                  >
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                    <div className="flex items-center space-x-1 ml-1 sm:ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-secondary rounded-full"
                        onClick={() => {
                          setEditingTag(tag);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="sr-only">Edit {tag.name} tag</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                        onClick={() => handleDeleteClick(tag)}
                      >
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="sr-only">Delete {tag.name} tag</span>
                      </Button>
                    </div>
                  </Badge>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <TagDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setEditingTag(null);
            }}
            onSubmit={onUpdateTag}
            initialData={editingTag}
            mode="edit"
          />
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the tag {tagToDelete?.name}. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel
                onClick={() => setDeleteDialogOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteTag}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TitleNavbar>
    </DashboardLayout>
  );
};

export default ElegantTagManagement;
