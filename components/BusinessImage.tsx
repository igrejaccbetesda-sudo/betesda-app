"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import { useEffect, useState } from "react";
import { getBrowserImageUrl } from "../src/lib/drive-image";

type BusinessImageProps = {
  src?: string | null;
  file?: File | null;
  alt: string;
  tipo?: string | null;
  sizes: string;
  priority?: boolean;
  iconSize: number;
};

export default function BusinessImage({
  src,
  file,
  alt,
  tipo,
  sizes,
  priority = false,
  iconSize,
}: BusinessImageProps) {
  const isLogo = tipo === "logo" || tipo === "logo_escuro" || tipo === "logo_claro";
  const backgroundClass =
    tipo === "logo_claro" ? "bg-[#F7F4EE]" : "bg-[#0D0D0C]";
  const [unavailable, setUnavailable] = useState(false);
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setFileUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imageSrc = fileUrl || (src ? getBrowserImageUrl(src) : src);

  useEffect(() => {
    setUnavailable(false);
  }, [imageSrc]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        isLogo ? backgroundClass : "bg-[#EFE2C0]"
      }`}
    >
      {imageSrc && !unavailable ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          onError={() => setUnavailable(true)}
          className={isLogo ? "object-contain p-4" : "object-cover"}
        />
      ) : (
        <Store
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#8A7A45]"
          size={iconSize}
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}
