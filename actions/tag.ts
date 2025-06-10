"use server";

import {
  getAvailableTags, createTag,
  updateTagColor, deleteTag, updateTagName,
  getTagsForPlate, addTagToPlate, removeTagFromPlate
} from "@/lib/db";

export type Tag = {
  category: string;
  color: string;
  count: number;
}

export async function getTags() {
  console.log("Fetching tags");
  try {
    return { success: true, data: await getAvailableTags() };
  } catch (error) {
    console.error("Error getting tags:", error);
    return { success: false, error: "Failed to get tags" };
  }
}

export async function addTag(formData: FormData) {
  console.log("Adding tag");
  try {
    const name = formData.get("name");
    const color = (formData.get("color") as string) || "#808080";
    const tag = await createTag(name, color);
    return { success: true, data: tag };
  } catch (error) {
    console.error("Error creating tag:", error);
    return { success: false, error: "Failed to create tag" };
  }
}

export async function updateTag(formData: FormData) {
  console.log("Updating tag");
  try {
    const newName = formData.get("name");
    const color = formData.get("color");
    const originalName = formData.get("originalName");

    let updatedTag;

    if (originalName !== newName) {
      updatedTag = await updateTagName(originalName, newName);
    }

    updatedTag = await updateTagColor(updatedTag?.name || originalName, color);

    return { success: true, data: updatedTag };
  } catch (error) {
    console.error("Error updating tag:", error);
    return { success: false, error: "Failed to update tag" };
  }
}

export async function removeTag(formData: FormData) {
  console.log("Deleting tag");
  try {
    const name = formData.get("name");
    await deleteTag(name);
    return { success: true };
  } catch (error) {
    console.error("Error deleting tag:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

export async function tagPlate(formData: FormData) {
  console.log("Adding tag to plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const tagName = formData.get("tagName");

    // Check if tag already exists on plate
    const existingTags = await getTagsForPlate(plateNumber);
    if (existingTags.includes(tagName)) {
      return {
        success: false,
        error: `Tag "${tagName}" is already added to this plate`,
      };
    }

    await addTagToPlate(plateNumber, tagName);
    return { success: true };
  } catch (error) {
    console.error("Error adding tag to plate:", error);
    return { success: false, error: "Failed to add tag to plate" };
  }
}

export async function untagPlate(formData: FormData) {
  console.log("Removing tag from plate");
  try {
    const plateNumber = formData.get("plateNumber");
    const tagName = formData.get("tagName");
    await removeTagFromPlate(plateNumber, tagName);
    return { success: true };
  } catch (error) {
    console.error("Error removing tag from plate:", error);
    return { success: false, error: "Failed to remove tag from plate" };
  }
}