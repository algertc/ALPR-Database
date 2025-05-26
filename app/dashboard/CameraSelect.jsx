import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CameraSelector({ value, onValueChange, cameras, loading }) {
  return (
    <div className="">
      <Select
        value={value || "all"}
        onValueChange={onValueChange}
        disabled={loading}
      >
        <SelectTrigger className="w-44 dark:bg-[#161618]">
          <SelectValue placeholder="Select camera" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cameras</SelectItem>
          {cameras?.map((camera) => (
            <SelectItem key={camera} value={camera}>
              {camera}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
