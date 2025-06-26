import React, { useState, useEffect, useCallback } from "react";
import BaseDialog from "./BaseDialog";
import { useApi } from "app/components/Api";
import { NumericInput, Spinner, Switch, Intent, HTMLSelect, FormGroup } from "@blueprintjs/core";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "app/atoms";
import keyring from "@polkadot/ui-keyring";
import { signAndSend } from "app/utils/sign";
import useToaster from "../../hooks/useToaster";
import { useTranslation } from "react-i18next";

// Constants
const DEFAULT_MAX_VALUE = 100000000;

interface DialogCreateAssetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  prefillObjIdx?: number;
  prefillPropIdx?: number;
  objectProperties?: Array<{ propIdx: number; maxValue: number }>;
}

export default function DialogCreateAsset({ isOpen, onClose, onCreated, prefillObjIdx, prefillPropIdx, objectProperties }: DialogCreateAssetProps) {
  const { t } = useTranslation();
  const api = useApi();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [assetId, setAssetId] = useState<number | undefined>();
  const [minBalance, setMinBalance] = useState<number | undefined>();
  const [withObj, setWithObj] = useState(false);
  const [objIdx, setObjIdx] = useState<number | undefined>();
  const [propIdx, setPropIdx] = useState<number | undefined>();
  const [maxSupply, setMaxSupply] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: number; maxValue: number }[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);

  // Memoized callbacks for event handlers
  const handleAssetIdChange = useCallback((v: number | string) => {
    setAssetId(Number(v));
  }, []);

  const handleMinBalanceChange = useCallback((v: number | string) => {
    setMinBalance(Number(v));
  }, []);

  const handleWithObjChange = useCallback(() => {
    setWithObj(v => !v);
  }, []);

  const handleObjIdxChange = useCallback((v: number | string) => {
    setObjIdx(Number(v));
  }, []);

  const handlePropIdxChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPropIdx = Number(e.target.value);
    setPropIdx(newPropIdx);
    // Update maxSupply to the property's default maxValue
    const selectedProperty = propertyOptions.find(opt => opt.value === newPropIdx);
    if (selectedProperty) {
      setMaxSupply(selectedProperty.maxValue);
    }
  }, [propertyOptions]);

  const handleMaxSupplyChange = useCallback((v: number | string) => {
    const selectedProperty = propertyOptions.find(opt => opt.value === propIdx);
    const newValue = Number(v);
    
    // Prevent setting values greater than the property's max value
    if (selectedProperty && newValue > selectedProperty.maxValue) {
      setMaxSupply(selectedProperty.maxValue); // Cap at max value
      return;
    }
    
    setMaxSupply(newValue);
  }, [propertyOptions, propIdx]);

  const handleSignAndSendCallback = useCallback(({ status }: { status: any }) => {
    if (!status.isInBlock) return;
    toaster.show({
      icon: "endorsed",
      intent: Intent.SUCCESS,
      message: t("messages.lbl_asset_created_success") || "Asset created successfully!"
    });
    if (onCreated) onCreated();
    onClose();
  }, [toaster, t, onCreated, onClose]);

  // Helper function to decode hex string to readable text
  const decodeHexString = (hexString: string): string => {
    if (!hexString.startsWith('0x')) {
      return hexString; // Already decoded
    }
    
    try {
      const hex = hexString.slice(2); // Remove '0x' prefix
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode === 0) break; // Stop at null terminator
        result += String.fromCharCode(charCode);
      }
      return result || hexString; // Return original if decoding fails
    } catch (error) {
      console.warn('Failed to decode hex string:', hexString, error);
      return hexString; // Return original if decoding fails
    }
  };

  // Fetch property options for the object's properties
  useEffect(() => {
    async function fetchPropertyOptions() {
      if (!api) {
        setPropertyOptions([]);
        return;
      }
      
      setPropertyOptionsLoading(true);
      try {
        let allPropIdxs: number[] = [];
        
        if (objectProperties && objectProperties.length > 0) {
          // If object properties are provided, use those plus Share
          allPropIdxs = [1]; // Start with Share
          const objectPropIdxs = objectProperties.map((p) => Number(p.propIdx));
          // Filter out Share (propIdx: 1) since it's already included
          const nonShareProps = objectPropIdxs.filter(idx => idx !== 1);
          allPropIdxs.push(...nonShareProps);
        } else {
          // If no object properties provided, fetch all available properties (0-20)
          allPropIdxs = Array.from({ length: 21 }, (_, i) => i);
        }
        
        const queries = allPropIdxs.map((idx) => api.query.poScan.properties(idx) as Promise<unknown>);
        const results = await Promise.all(queries);
        const options: { label: string; value: number; maxValue: number }[] = [];
        
        results.forEach((result, index) => {
          const propIdx = allPropIdxs[index];
          // Type assertion to handle Option type
          if (result && typeof result === 'object' && 'isSome' in result && 'unwrap' in result) {
            const optionResult = result as { isSome: boolean; unwrap: () => { toJSON: () => Record<string, unknown> } };
            if (optionResult?.isSome) {
              const property = optionResult.unwrap().toJSON() as Record<string, unknown>;
              const rawName = (property?.name as string) || `Property ${propIdx}`;
              const name = decodeHexString(rawName);
              
              // Only include properties that have a meaningful name (not just "Property X")
              // Skip properties that don't have a proper name or are empty
              if (name && name.trim() !== '' && name !== `Property ${propIdx}`) {
                // Determine maxValue based on context
                let maxValue: number;
                if (objectProperties && objectProperties.length > 0) {
                  // If object properties provided, use object's maxValue or default
                  if (propIdx === 1) {
                    maxValue = DEFAULT_MAX_VALUE; // Default for Share
                  } else {
                    const objectProp = objectProperties.find(p => Number(p.propIdx) === propIdx);
                    maxValue = objectProp?.maxValue || DEFAULT_MAX_VALUE;
                  }
                } else {
                  // If no object properties, use property definition's maxValue or default
                  maxValue = (property?.maxValue as number) || DEFAULT_MAX_VALUE;
                }
                
                options.push({
                  label: name,
                  value: propIdx,
                  maxValue: maxValue
                });
              }
            } else if (objectProperties && objectProperties.length > 0) {
              // For object properties, include them even if property definition not found
              // (they might be custom properties for this object)
              const objectProp = objectProperties.find(p => Number(p.propIdx) === propIdx);
              if (objectProp) {
                options.push({
                  label: `Property ${propIdx}`,
                  value: propIdx,
                  maxValue: objectProp.maxValue
                });
              }
            }
            // Skip properties that don't exist and aren't part of object properties
          }
        });
        
        // Sort by name for better UX
        options.sort((a, b) => a.label.localeCompare(b.label));
        setPropertyOptions(options);
      } catch (error) {
        console.error('Failed to fetch property options:', error);
        toaster.show({
          icon: "error",
          intent: Intent.DANGER,
          message: 'Failed to load property options'
        });
      } finally {
        setPropertyOptionsLoading(false);
      }
    }
    
    fetchPropertyOptions();
  }, [api, objectProperties]);

  // Update form when prefill values are provided
  React.useEffect(() => {
    if (prefillObjIdx !== undefined && prefillPropIdx !== undefined) {
      setWithObj(true);
      setObjIdx(prefillObjIdx);
      setPropIdx(prefillPropIdx);
    }
  }, [prefillObjIdx, prefillPropIdx]);

  // Set maxSupply when property options are loaded and we have a prefill propIdx
  React.useEffect(() => {
    if (propertyOptions.length > 0 && prefillPropIdx !== undefined && propIdx === prefillPropIdx) {
      const selectedProperty = propertyOptions.find(opt => opt.value === prefillPropIdx);
      if (selectedProperty) {
        setMaxSupply(selectedProperty.maxValue);
      }
    }
  }, [propertyOptions, prefillPropIdx, propIdx]);

  // Get the KeyringPair for the selected account
  const pair = (() => {
    try {
      if (selectedAccount && selectedAccount.trim() !== '') {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get keyring pair:', error);
      return null;
    }
  })();

  const handleSubmit = () => {
    if (!api) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: "API not ready"
      });
      return;
    }
    if (assetId === undefined || !selectedAccount || minBalance === undefined) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_fill_required_fields") || "Please fill all required fields."
      });
      return;
    }
    if (!pair) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_no_account_selected") || "No account selected or unable to get keyring pair."
      });
      return;
    }
    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked") || "Account is locked."
      });
      return;
    }
    setLoading(true);
    try {
      let objDetails = null;
      if (withObj && objIdx !== undefined && propIdx !== undefined && maxSupply !== undefined) {
        objDetails = { objIdx, propIdx, maxSupply };
      }
      // Compose the extrinsic
      const tx = api.tx.poscanAssets.create(
        assetId,
        selectedAccount,
        minBalance,
        objDetails ? objDetails : null
      );
      // Use signAndSend for transaction signing
      signAndSend(tx, pair, {}, handleSignAndSendCallback);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("dlg_asset.create_title") || "Create New Asset"}
      primaryButton={{
        text: t("dlg_asset.create_btn") || "Create",
        icon: "plus",
        onClick: handleSubmit,
        intent: "primary",
        loading,
        disabled: loading,
      }}
    >
      <div className="flex flex-col gap-4">
        <NumericInput
          fill
          min={0}
          placeholder={t("dlg_asset.asset_id") || "Asset ID"}
          value={assetId}
          onValueChange={handleAssetIdChange}
          required
        />
        <NumericInput
          fill
          min={0}
          placeholder={t("dlg_asset.min_balance") || "Min balance"}
          value={minBalance}
          onValueChange={handleMinBalanceChange}
          required
        />
        <Switch
          checked={withObj}
          label={t("dlg_asset.link_object") || "Link to an Object"}
          onChange={handleWithObjChange}
        />
        {withObj && (
          <div className="flex flex-col gap-2">
            <NumericInput
              fill
              min={0}
              placeholder={t("dlg_asset.obj_idx") || "Object Index (objIdx)"}
              value={objIdx}
              onValueChange={handleObjIdxChange}
              required
            />
            <FormGroup label="Property">
              {propertyOptionsLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner size={16} />
                  <span>Loading properties...</span>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <HTMLSelect
                    options={propertyOptions}
                    value={propIdx}
                    onChange={handlePropIdxChange}
                    placeholder="Select Property"
                    style={{ minWidth: '200px' }}
                  />
                  <NumericInput
                    min={(() => {
                      const selectedProperty = propertyOptions.find(opt => opt.value === propIdx);
                      if (!selectedProperty) return 0;
                      
                      // Check if this is a non-fungible property (maxValue = 1)
                      if (selectedProperty.maxValue === 1) {
                        return 1; // NFT - must have exactly 1 token
                      }
                      
                      return 0; // Fungible token - can have 0 or more
                    })()}
                    max={(() => {
                      const selectedProperty = propertyOptions.find(opt => opt.value === propIdx);
                      if (!selectedProperty) return DEFAULT_MAX_VALUE;
                      
                      // Check if this is a non-fungible property (maxValue = 1)
                      if (selectedProperty.maxValue === 1) {
                        return 1; // NFT - only 1 token can exist
                      }
                      
                      return selectedProperty.maxValue; // Fungible token
                    })()}
                    placeholder={t("dlg_asset.max_supply") || "Max Supply"}
                    value={maxSupply}
                    onValueChange={handleMaxSupplyChange}
                    disabled={(() => {
                      const selectedProperty = propertyOptions.find(opt => opt.value === propIdx);
                      return selectedProperty && selectedProperty.maxValue === 1;
                    })()}
                    required
                  />
                </div>
              )}
            </FormGroup>
          </div>
        )}
      </div>
    </BaseDialog>
  );
} 