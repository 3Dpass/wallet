import React, { useEffect, useState } from "react";
import BaseDialog from "./BaseDialog";
import ObjectCard from "../assets/ObjectCard";
import { useApi } from "app/components/Api";

interface DialogObjectCardProps {
  isOpen: boolean;
  onClose: () => void;
  objectIndex: number;
}

export default function DialogObjectCard({ isOpen, onClose, objectIndex }: DialogObjectCardProps) {
  const api = useApi();
  const [objectData, setObjectData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    async function fetchObject() {
      setLoading(true);
      setError(null);
      try {
        if (!api) throw new Error("API not ready");
        // @ts-ignore - poscan is a custom RPC
        const result = await api.rpc.poscan.getPoscanObject(objectIndex);
        // Patch snake_case to camelCase for ObjectCard compatibility
        let patchedResult = result;
        if (result) {
          patchedResult = {
            ...result,
            whenCreated: result.whenCreated ?? result.when_created,
            numApprovals: result.numApprovals ?? result.num_approvals,
          };
        }
        if (mounted) setObjectData(patchedResult);
      } catch (e: any) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchObject();
    return () => { mounted = false; };
  }, [api, isOpen, objectIndex]);

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title="Object Details" className="w-[98vw] max-w-5xl">
      {loading ? (
        <div className="flex items-center justify-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : objectData ? (
        <ObjectCard objectIndex={objectIndex} objectData={objectData} />
      ) : null}
    </BaseDialog>
  );
} 