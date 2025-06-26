import React from "react";
import BaseDialog from "./BaseDialog";
import AssetCard from "../assets/AssetCard";

interface DialogAssetCardProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
}

export default function DialogAssetCard({ isOpen, onClose, assetId }: DialogAssetCardProps) {
  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title={`Asset #${assetId}`} className="w-[98vw] max-w-4xl">
      <AssetCard assetId={assetId} inDialog={true} />
    </BaseDialog>
  );
} 