import React, { useRef, useState, useEffect } from "react";
import { Suspense } from "react";
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
  Tag,
  Spinner,
  RadioGroup,
  Radio,
} from "@blueprintjs/core";
import { useDropzone } from "react-dropzone";
import { OBJLoader } from "three-stdlib";
import { Canvas } from "@react-three/fiber";
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
import { AccountName } from "../common/AccountName";

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
  const [mesh, setMesh] = useState<any>(null);
  const [numApprovals, setNumApprovals] = useState(1);
  const [hashesEnabled, setHashesEnabled] = useState(false);
  const [hashes, setHashes] = useState<string[]>([]);
  const [properties, setProperties] = useState<{ propIdx: number; maxValue: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: number; maxValue: number }[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);

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
          const optionResult = result as unknown as { isSome: boolean; unwrap: () => any };
          if (optionResult?.isSome) {
            const property = optionResult.unwrap().toJSON() as any;
            const rawName = property?.name || `Property ${index}`;
            const name = decodeHexString(rawName);
            const maxValue = property?.maxValue || DEFAULT_MAX_VALUE;
            
            options.push({
              label: name,
              value: index,
              maxValue: maxValue
            });
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
          const parsed = loader.parse(text);
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

  // Handlers for hashes
  const handleHashChange = (idx: number, value: string) => {
    setHashes((prev) => prev.map((h, i) => (i === idx ? value : h)));
  };
  const addHash = () => {
    if (hashes.length < 10) setHashes([...hashes, ""]);
  };
  const removeHash = (idx: number) => {
    setHashes((prev) => prev.filter((_, i) => i !== idx));
  };

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
  const addProperty = () => {
    // Set default to first available property if any exist
    const defaultPropIdx = propertyOptions.length > 0 ? propertyOptions[0].value : 0;
    const defaultMaxValue = propertyOptions.length > 0 ? propertyOptions[0].maxValue : DEFAULT_MAX_VALUE;
    setProperties([...properties, { propIdx: defaultPropIdx, maxValue: defaultMaxValue }]);
  };
  const removeProperty = (idx: number) => {
    setProperties((prev) => prev.filter((_, i) => i !== idx));
  };

  // Clear form function
  const clearForm = () => {
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
  };

  // Submit handler
  const handleSubmit = async () => {
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
        hashesEnabled ? hashes.filter(h => h.trim() !== '') : null, // Option<Vec<H256>> - null when disabled
        properties.filter(p => p.propIdx >= 0 && p.maxValue >= 0).map(p => ({
          propIdx: Number(p.propIdx), // u32
          maxValue: BigInt(p.maxValue) // u128
        })) // Vec<SpConsensusPoscanPropValue>
      );
      
      const options: Partial<SignerOptions> = {};

      await signAndSend(tx, pair, options, ({ status }) => {
        if (!status.isInBlock) {
          return;
        }
        toaster.show({
          icon: "endorsed",
          intent: Intent.SUCCESS,
          message: t("Object submitted successfully"),
        });
        setIsLoading(false);
        onClose();
      });
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
  };

  // Handle dialog close with form reset
  const handleClose = () => {
    clearForm();
    onClose();
  };

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
            onChange={e => setCategory(e.target.value)} 
          />
        </FormGroup>
        <FormGroup label="Rights">
          <RadioGroup
            inline
            selectedValue={isPrivate ? "private" : "public"}
            onChange={e => setIsPrivate(e.currentTarget.value === "private")}
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
                  <ThreeDObject geometry={mesh.geometry} />
                </Suspense>
              </Canvas>
            </div>
          )}
        </FormGroup>
        <FormGroup label="Approvals">
          <NumericInput min={1} max={255} value={numApprovals} onValueChange={v => setNumApprovals(Number(v))} />
        </FormGroup>
        <FormGroup label="Hash ID">
          <Switch checked={hashesEnabled} label="Add Hashes Manually" onChange={() => setHashesEnabled(v => !v)} />
          {hashesEnabled && (
            <div className="space-y-2 mt-2">
              {hashes.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <InputGroup value={h} onChange={e => handleHashChange(i, e.target.value)} placeholder="Hash (H256)" />
                  <Button icon="cross" minimal onClick={() => removeHash(i)} />
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
                  <div key={i} className="flex gap-2 items-center">
                    <HTMLSelect
                      options={propertyOptions}
                      value={p.propIdx}
                      onChange={e => handlePropChange(i, "propIdx", Number(e.target.value))}
                      placeholder="Select Property"
                      style={{ minWidth: '200px' }}
                    />
                    <NumericInput 
                      min={0} 
                      value={p.maxValue} 
                      onValueChange={v => handlePropChange(i, "maxValue", Number(v))} 
                      placeholder="Max Value" 
                      disabled={isShare}
                    />
                    <Button icon="cross" minimal onClick={() => removeProperty(i)} />
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