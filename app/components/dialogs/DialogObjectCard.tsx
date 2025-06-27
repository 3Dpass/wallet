import React, { useEffect, useState, useRef } from "react";
import BaseDialog from "./BaseDialog";
import ObjectCard from "../assets/ObjectCard";
import { useApi } from "app/components/Api";

interface DialogObjectCardProps {
  isOpen: boolean;
  onClose: () => void;
  objectIndex: number;
}

type ObjectData = {
  whenCreated?: number;
  when_created?: number;
  numApprovals?: number;
  num_approvals?: number;
  [key: string]: unknown;
};

export default function DialogObjectCard({ isOpen, onClose, objectIndex }: DialogObjectCardProps) {
  const api = useApi();
  const [objectData, setObjectData] = useState<ObjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isOpen) return;
    mountedRef.current = true;
    async function fetchObject() {
      setLoading(true);
      setError(null);
      try {
        if (!api) throw new Error("API not ready");
        // @ts-expect-error - poscan is a custom RPC
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
        if (mountedRef.current) setObjectData(patchedResult);
      } catch (e: unknown) {
        if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
    fetchObject();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return () => { mountedRef.current = false; };
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