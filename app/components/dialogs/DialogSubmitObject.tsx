import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Button,
  Dialog,
  Classes,
  FormGroup,
  InputGroup,
  Switch,
  NumericInput,
  HTMLSelect,
  Intent,
  Callout,
  Spinner,
  RadioGroup,
  Radio,
} from "@blueprintjs/core";
import { useDropzone } from "react-dropzone";
import { OBJLoader } from "three-stdlib";
import { Canvas } from "@react-three/fiber";
import { Object3D, BufferGeometry } from "three";
import ThreeDObject from "../block/ThreeDObject.client";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { lastSelectedAccountAtom } from "../../atoms";
import { useApi, useKeyringLoaded } from "../Api";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import keyring from "@polkadot/ui-keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { SignerOptions } from "@polkadot/api/types";
import type { SubmittableResult } from "@polkadot/api";

// Constants
const DEFAULT_MAX_VALUE = 100000000;

// TODO: Update the API method name in handleSubmit() to match the actual blockchain API
// The current implementation tries multiple possible method names, but you may need to
// replace them with the correct method name from your blockchain's API.

const CATEGORY_OPTIONS = [
  { label: "Objects3D: Grid2dLow", value: "Objects3D_Grid2dLow" },
  { label: "Objects3D: Grid2dHigh", value: "Objects3D_Grid2dHigh" },
  { label: "Drawings2D", value: "Drawings2D" },
  { label: "Music", value: "Music" },
  { label: "Biometrics", value: "Biometrics" },
  { label: "Movements", value: "Movements" },
  { label: "Texts", value: "Texts" },
];

export default function DialogSubmitObject({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const keyringLoaded = useKeyringLoaded();
  const toaster = useToaster();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [isPrivate, setIsPrivate] = useState(false);
  const [objFile, setObjFile] = useState<File | null>(null);
  const [objString, setObjString] = useState<string | null>(null);
  const [mesh, setMesh] = useState<Object3D & { geometry?: BufferGeometry } | null>(null);
  const [numApprovals, setNumApprovals] = useState(1);
  const [hashesEnabled, setHashesEnabled] = useState(false);
  const [hashes, setHashes] = useState<{ id: number; value: string }[]>([]);
  const [properties, setProperties] = useState<{ id: number; propIdx: number; maxValue: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: number; maxValue: number }[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);
  const [nextHashId, setNextHashId] = useState(1);

  // Memoized callbacks for JSX props
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  }, []);

  const handleIsPrivateChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    setIsPrivate(e.currentTarget.value === "private");
  }, []);

  const handleNumApprovalsChange = useCallback((v: number) => {
    setNumApprovals(Number(v));
  }, []);

  const handleHashesEnabledToggle = useCallback(() => {
    setHashesEnabled(v => !v);
  }, []);

  // Handlers for hashes
  const handleHashChange = (idx: number, value: string) => {
    setHashes((prev) => prev.map((h, i) => (i === idx ? { ...h, value } : h)));
  };
  const addHash = useCallback(() => {
    if (hashes.length < 10) {
      setHashes([...hashes, { id: nextHashId, value: "" }]);
      setNextHashId(nextHashId + 1);
    }
  }, [hashes.length, nextHashId]);
  const removeHash = (idx: number) => {
    setHashes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleHashInputChange = useCallback((idx: number, value: string) => {
    handleHashChange(idx, value);
  }, [handleHashChange]);

  // Handlers for properties
  const handlePropChange = (idx: number, key: "propIdx" | "maxValue", value: number) => {
    setProperties((prev) => {
      const newProps = prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p));
      
      // If changing propIdx, also update maxValue to the property's default maxValue
      if (key === "propIdx") {
        const selectedProperty = propertyOptions.find(opt => opt.value === value);
        if (selectedProperty) {
          newProps[idx] = { ...newProps[idx], maxValue: selectedProperty.maxValue };
        }
      }
      
      return newProps;
    });
  };
  const addProperty = useCallback(() => {
    // Set default to first available property if any exist
    const defaultPropIdx = propertyOptions.length > 0 ? propertyOptions[0].value : 0;
    const defaultMaxValue = propertyOptions.length > 0 ? propertyOptions[0].maxValue : DEFAULT_MAX_VALUE;
    setProperties([...properties, { id: Date.now() + Math.random(), propIdx: defaultPropIdx, maxValue: defaultMaxValue }]);
  }, [propertyOptions, properties]);
  const removeProperty = (idx: number) => {
    setProperties((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePropertyValueChange = useCallback((idx: number, value: number) => {
    handlePropChange(idx, "maxValue", value);
  }, [handlePropChange]);

  const handlePropertySelectChange = useCallback((idx: number, value: number) => {
    handlePropChange(idx, "propIdx", value);
  }, [handlePropChange]);

  // Create memoized callbacks for input changes with index parameters
  const createHashInputChangeCallback = useCallback((idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleHashInputChange(idx, e.target.value);
  }, []);

  const createPropertySelectChangeCallback = useCallback((idx: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    handlePropertySelectChange(idx, Number(e.target.value));
  }, []);

  const createPropertyValueChangeCallback = useCallback((idx: number) => (value: number) => {
    handlePropertyValueChange(idx, value);
  }, [handlePropertyValueChange]);

  const createRemoveHashCallback = useCallback((idx: number) => () => {
    removeHash(idx);
  }, []);

  const createRemovePropertyCallback = useCallback((idx: number) => () => {
    removeProperty(idx);
  }, []);

  // Get the KeyringPair for the selected account
  const pair: KeyringPair | null = (() => {
    try {
      if (keyringLoaded && selectedAccount && selectedAccount.trim() !== '') {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get keyring pair:', error);
      return null;
    }
  })();

  // Check if we can submit
  useEffect(() => {
    setCanSubmit(Boolean(api !== undefined && keyringLoaded && pair !== null && objFile !== null && selectedAccount && selectedAccount.trim() !== ''));
  }, [api, keyringLoaded, pair, objFile, selectedAccount]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

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

  // Fetch property options
  useEffect(() => {
    async function fetchPropertyOptions() {
      if (!api) return;
      
      setPropertyOptionsLoading(true);
      try {
        // Fetch all properties (we'll try indices 0-20 to cover the range)
        const propertyPromises = Array.from({ length: 21 }, (_, i) => 
          api.query.poScan.properties(i)
        );
        
        const propertyResults = await Promise.all(propertyPromises);
        const options: { label: string; value: number; maxValue: number }[] = [];
        
        propertyResults.forEach((result, index) => {
          // Type assertion to handle Option type
          if (result && typeof result === 'object' && 'isSome' in result && 'unwrap' in result) {
            const optionResult = result as { isSome: boolean; unwrap: () => { toJSON: () => Record<string, unknown> } };
            if (optionResult?.isSome) {
              const unwrapped = optionResult.unwrap();
              const property = unwrapped.toJSON();
              const rawName = (property?.name as string) || `Property ${index}`;
              const name = decodeHexString(rawName);
              const maxValue = (property?.maxValue as number) || DEFAULT_MAX_VALUE;
              
              options.push({
                label: name,
                value: index,
                maxValue
              });
            }
          }
        });
        
        // Sort by name for better UX
        options.sort((a, b) => a.label.localeCompare(b.label));
        setPropertyOptions(options);
      } catch (error) {
        console.error('Failed to fetch property options:', error);
        setError('Failed to load property options');
      } finally {
        setPropertyOptionsLoading(false);
      }
    }
    
    fetchPropertyOptions();
  }, [api]);

  // OBJ file drag-and-drop with preview functionality
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setObjFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setObjString(text);
        try {
          const loader = new OBJLoader();
          const parsed = loader.parse(text) as { children: Object3D[] };
          setMesh(parsed.children[0]);
        } catch (e) {
          setError("Failed to parse OBJ file");
          setMesh(null);
        }
      };
      reader.readAsText(file);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/plain': ['.obj'] } });

  // Helper functions to avoid arrow functions in JSX
  const filterNonEmptyHashes = useCallback((hash: { id: number; value: string }) => hash.value.trim() !== '', []);
  
  const filterValidProperties = useCallback((prop: { id: number; propIdx: number; maxValue: number }) => 
    prop.propIdx >= 0 && prop.maxValue >= 0, []);
  
  const mapPropertyToApiFormat = useCallback((prop: { id: number; propIdx: number; maxValue: number }) => ({
    propIdx: Number(prop.propIdx),
    maxValue: BigInt(prop.maxValue)
  }), []);

  const handleSignAndSendCallback = useCallback((result: SubmittableResult) => {
    if (!result.isInBlock) {
      return;
    }
    toaster.show({
      icon: "endorsed",
      intent: Intent.SUCCESS,
      message: t("Object submitted successfully"),
    });
    setIsLoading(false);
    onClose();
  }, [toaster, t, onClose]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!api || !pair || !objString) {
      return;
    }

    const isLocked = pair.isLocked && !pair.meta.isInjected;
    if (isLocked) {
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: t("messages.lbl_account_locked"),
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert category string to proper enum structure
      const categoryEnum = category === "Objects3D_Grid2dLow" 
        ? { Objects3D: "grid2dlow" }
        : category === "Objects3D_Grid2dHigh"
        ? { Objects3D: "grid2dhigh" }
        : { [category]: null };

      // Create the transaction using the correct API method with proper data types
      const tx = api.tx.poScan.putObject(
        categoryEnum, // SpConsensusPoscanObjectCategory
        isPrivate, // bool
        objString, // Bytes - the OBJ file content
        numApprovals, // u8
        hashesEnabled ? hashes.filter(filterNonEmptyHashes).map(h => h.value) : null, // Option<Vec<H256>> - null when disabled
        properties.filter(filterValidProperties).map(mapPropertyToApiFormat) // Vec<SpConsensusPoscanPropValue>
      );
      
      const options: Partial<SignerOptions> = {};

      await signAndSend(tx, pair, options, handleSignAndSendCallback);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      toaster.show({
        icon: "error",
        intent: Intent.DANGER,
        message: errorMessage,
      });
      setIsLoading(false);
    }
  }, [api, pair, objString, category, isPrivate, numApprovals, hashesEnabled, hashes, properties, toaster, t, handleSignAndSendCallback]);

  // Clear form function
  const clearForm = useCallback(() => {
    setCategory(CATEGORY_OPTIONS[0].value);
    setIsPrivate(false);
    setObjFile(null);
    setObjString(null);
    setMesh(null);
    setNumApprovals(1);
    setHashesEnabled(false);
    setHashes([]);
    setProperties([]);
    setError(null);
  }, []);

  // Handle dialog close with form reset
  const handleClose = useCallback(() => {
    clearForm();
    onClose();
  }, [clearForm, onClose]);

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Submit New Object" 
      canEscapeKeyClose 
      canOutsideClickClose
      style={{ width: '800px', maxWidth: '90vw' }}
    >
      <div className={Classes.DIALOG_BODY}>
        {error && <Callout intent={Intent.DANGER}>{error}</Callout>}
        
        <FormGroup label="Category">
          <HTMLSelect 
            options={CATEGORY_OPTIONS} 
            value={category} 
            onChange={handleCategoryChange} 
          />
        </FormGroup>
        <FormGroup label="Rights">
          <RadioGroup
            inline
            selectedValue={isPrivate ? "private" : "public"}
            onChange={handleIsPrivateChange}
          >
            <Radio label="Public" value="public" />
            <Radio label="Private" value="private" />
          </RadioGroup>
        </FormGroup>
        <FormGroup label="OBJ File">
          <div {...getRootProps()} className={`border-dashed border-2 rounded p-4 text-center cursor-pointer ${isDragActive ? 'bg-blue-50' : ''}`}> 
            <input {...getInputProps()} />
            {objFile ? <span>{objFile.name}</span> : <span>Drag & drop or click to select .obj file</span>}
          </div>
          {mesh && (
            <div className="w-full h-48 mt-2">
              <Canvas camera={{ fov: 30, near: 0.1, far: 1000, position: [0, 0, 2] }}>
                <Suspense fallback={null}>
                  <ThreeDObject geometry={mesh.geometry as BufferGeometry} />
                </Suspense>
              </Canvas>
            </div>
          )}
        </FormGroup>
        <FormGroup label="Approvals">
          <NumericInput min={1} max={255} value={numApprovals} onValueChange={handleNumApprovalsChange} />
        </FormGroup>
        <FormGroup label="Hash ID">
          <Switch checked={hashesEnabled} label="Add Hashes Manually" onChange={handleHashesEnabledToggle} />
          {hashesEnabled && (
            <div className="space-y-2 mt-2">
              {hashes.map((h, i) => (
                <div key={`hash-${h.id}`} className="flex gap-2 items-center">
                  <InputGroup value={h.value} onChange={createHashInputChangeCallback(i)} placeholder="Hash (H256)" />
                  <Button icon="cross" minimal onClick={createRemoveHashCallback(i)} />
                </div>
              ))}
              {hashes.length < 10 && <Button icon="plus" minimal onClick={addHash}>Add Hash</Button>}
            </div>
          )}
        </FormGroup>
        <FormGroup label="Properties">
          {propertyOptionsLoading ? (
            <div className="flex items-center gap-2">
              <Spinner size={16} />
              <span>Loading properties...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((p, i) => {
                const selectedProperty = propertyOptions.find(opt => opt.value === p.propIdx);
                const isShare = selectedProperty?.label.toLowerCase() === 'share';
                
                return (
                  <div key={`property-${p.id}`} className="flex gap-2 items-center">
                    <HTMLSelect
                      options={propertyOptions}
                      value={p.propIdx}
                      onChange={createPropertySelectChangeCallback(i)}
                      placeholder="Select Property"
                      style={{ minWidth: '200px' }}
                    />
                    <NumericInput 
                      min={0} 
                      value={p.maxValue} 
                      onValueChange={createPropertyValueChangeCallback(i)} 
                      placeholder="Max Value" 
                      disabled={isShare}
                    />
                    <Button icon="cross" minimal onClick={createRemovePropertyCallback(i)} />
                    {isShare && (
                      <span className="text-sm text-gray-500">(Auto-applied)</span>
                    )}
                  </div>
                );
              })}
              <Button icon="plus" minimal onClick={addProperty}>Add Property</Button>
            </div>
          )}
        </FormGroup>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={clearForm} disabled={isLoading} intent={Intent.WARNING}>
            Clear
          </Button>
          <Button 
            intent={Intent.PRIMARY} 
            onClick={handleSubmit} 
            disabled={!canSubmit || isLoading}
            loading={isLoading}
          >
            Submit
          </Button>
        </div>
      </div>
    </Dialog>
  );
}