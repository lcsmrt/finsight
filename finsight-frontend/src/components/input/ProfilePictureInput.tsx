import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/avatar/Avatar";
import { Camera, CircleUser } from "lucide-react";
import { useMemo, useRef } from "react";
import { Button } from "../button/Button";
import { getFirstAndLastInitials } from "@/utils/string/formatters";

type ProfilePictureInputProps = {
  value?: File;
  onChange: (file: File) => void;
  fallback?: string;
};

export function ProfilePictureInput({
  value,
  onChange,
  fallback,
}: ProfilePictureInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    return value ? URL.createObjectURL(value) : null;
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar
          className="size-36 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? (
            <AvatarImage src={previewUrl} className="object-cover" />
          ) : (
            <AvatarFallback className="p-6">
              {fallback ? (
                <span className="text-5xl font-semibold">
                  {getFirstAndLastInitials(fallback)}
                </span>
              ) : (
                <CircleUser className="h-full w-full opacity-50" />
              )}
            </AvatarFallback>
          )}
        </Avatar>

        <Button
          type="button"
          size="icon-lg"
          onClick={() => inputRef.current?.click()}
          className="absolute right-1 bottom-1 rounded-full"
        >
          <Camera className="h-5 w-5" />
          <span className="sr-only">Alterar foto</span>
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
    </div>
  );
}
