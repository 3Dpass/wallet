import { useApi } from "app/components/Api";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseDialog from "./BaseDialog";
import ObjectCard from "app/components/assets/ObjectCard";

interface DialogObjectCardProps {
  isOpen: boolean;
  onClose: () => void;
  objectIndex: number;
}

// Type for the mapped data that ObjectCard expects
interface MappedObjectData {
  state?: Record<string, number | string>;
  isPrivate?: boolean;
  whenCreated?: number;
  numApprovals?: number;
  [key: string]: unknown;
}

export default function DialogObjectCard({
  isOpen,
  onClose,
  objectIndex,
}: DialogObjectCardProps) {
  const { t } = useTranslation();
  const api = useApi();
  const [mappedData, setMappedData] = useState<MappedObjectData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const _abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen || !api) return;

    console.log('DialogObjectCard opened with objectIndex:', objectIndex);

    const fetchObject = async () => {
      if (!api) throw new Error("API not ready");

      setIsLoading(true);
      setError(null);
      try {
        // @ts-expect-error - poscan is a custom RPC
        const result = await api.rpc.poscan.getPoscanObject(objectIndex);
        console.log('API result for objectIndex', objectIndex, ':', result);

        // Map the RPC data to the format expected by ObjectCard
        const mapped: MappedObjectData = {
          ...result,
          whenCreated: result?.when_created,
          numApprovals: result?.num_approvals,
        };
        setMappedData(mapped);
      } catch (error) {
        console.error("Failed to fetch object:", error);
        setMappedData(null);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchObject();
  }, [isOpen, api, objectIndex]);

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("assets.object_details")}
      className="w-[98vw] max-w-5xl"
    >
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">
                {t("object_card.loading")}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <div className="text-lg font-semibold mb-2">
              {t("object_card.no_preview")}
            </div>
            <div className="text-xs mt-2">Error: {error}</div>
          </div>
        ) : mappedData ? (
          <ObjectCard objectIndex={objectIndex} objectData={mappedData} inDialog={true} />
        ) : (
          <div className="text-center py-12">
            <div className="text-lg font-semibold mb-2">
              {t("object_card.no_preview")}
            </div>
          </div>
        )}
      </div>
    </BaseDialog>
  );
}
