"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvatarCell } from "@/components/tables/avatar-cell";
import {
  uploadMemberPhotoAction,
  removeMemberPhotoAction,
} from "@/server/actions/member-photo";

type Props = {
  memberId: string;
  memberName: string;
  currentUrl: string | null;
  /** Stable seed for the fallback gradient avatar */
  avatarSeed: string;
};

export function MemberPhotoUploader({
  memberId,
  memberName,
  currentUrl,
  avatarSeed,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload
    const fd = new FormData();
    fd.append("memberId", memberId);
    fd.append("file", file);

    startTransition(async () => {
      const result = await uploadMemberPhotoAction(fd);
      if (result.ok) {
        toast.success("Photo uploaded.");
        setPreview(result.data.url);
        router.refresh();
      } else {
        toast.error(result.error);
        setPreview(currentUrl);
      }
      URL.revokeObjectURL(objectUrl);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMemberPhotoAction(memberId);
      if (result.ok) {
        toast.success("Photo removed.");
        setPreview(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {preview ? (
          <Image
            src={preview}
            alt={memberName}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-card"
            unoptimized
          />
        ) : (
          <AvatarCell name={memberName} seed={avatarSeed} size="lg" className="h-20 w-20 text-base" />
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={pending}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {preview ? <Camera className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {preview ? "Change photo" : "Upload photo"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · Max 4 MB</p>
      </div>
    </div>
  );
}
