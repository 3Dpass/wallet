import {
  Button,
  Callout,
  Classes,
  Dialog,
  FormGroup,
  HTMLSelect,
  InputGroup,
  Intent,
  NumericInput,
  Radio,
  RadioGroup,
  Spinner,
  Switch,
} from "@blueprintjs/core";
import type { SubmittableResult } from "@polkadot/api";
import type { SignerOptions } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import keyring from "@polkadot/ui-keyring";
import { Canvas } from "@react-three/fiber";
import { useAtom } from "jotai";
import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from "three";
import { OBJLoader } from "three-stdlib";
import { lastSelectedAccountAtom } from "../../atoms";
import useToaster from "../../hooks/useToaster";
import { signAndSend } from "../../utils/sign";
import { useApi, useKeyringLoaded } from "../Api";
import ThreeDObject from "../block/ThreeDObject.client";

// Constants
const DEFAULT_MAX_VALUE = 100000000;

// Types
interface Hash {
  id: number;
  value: string;
}

interface Property {
  id: number;
  propIdx: number;
  maxValue: number;
}

interface PropertyOption {
  label: string;
  value: number;
  maxValue: number;
}

// Custom OBJ parser that handles malformed data (used as fallback only)
const parseOBJRobust = (objString: string): BufferGeometry | null => {
  try {
    const lines = objString.split("\n");
    const vertices: Vector3[] = [];
    const faces: number[][] = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;
      const parts = trimmedLine.split(/\s+/);
      if (parts.length === 0) continue;
      const type = parts[0];
      try {
        switch (type) {
          case "v":
            if (parts.length >= 4) {
              const x = Number.parseFloat(parts[1]);
              const y = Number.parseFloat(parts[2]);
              const z = Number.parseFloat(parts[3]);
              if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
                vertices.push(new Vector3(x, y, z));
              }
            }
            break;
          case "vn":
            // Only warn for malformed normals if fallback parser is used
            if (parts.length < 4) {
              continue;
            }
            break;
          case "f":
            if (parts.length >= 4) {
              const face: number[] = [];
              for (let j = 1; j < parts.length; j++) {
                const vertexPart = parts[j].split("/")[0];
                const vertexIndex = Number.parseInt(vertexPart);
                if (!Number.isNaN(vertexIndex) && vertexIndex > 0) {
                  face.push(vertexIndex - 1);
                }
              }
              if (face.length >= 3) {
                faces.push(face);
              }
            }
            break;
        }
      } catch {}
    }
    if (vertices.length === 0 || faces.length === 0) {
      return null;
    }
    const positions: number[] = [];
    for (const face of faces) {
      if (face.length === 3) {
        for (const vertexIndex of face) {
          if (vertexIndex < vertices.length) {
            const vertex = vertices[vertexIndex];
            positions.push(vertex.x, vertex.y, vertex.z);
          }
        }
      } else if (face.length > 3) {
        for (let j = 1; j < face.length - 1; j++) {
          const indices = [face[0], face[j], face[j + 1]];
          for (const vertexIndex of indices) {
            if (vertexIndex < vertices.length) {
              const vertex = vertices[vertexIndex];
              positions.push(vertex.x, vertex.y, vertex.z);
            }
          }
        }
      }
    }
    if (positions.length === 0) {
      return null;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  } catch (_error) {
    return null;
  }
};

const CATEGORY_OPTIONS = [
  { label: "Objects3D: Grid2dLow", value: "Objects3D_Grid2dLow" },
  { label: "Objects3D: Grid2dHigh", value: "Objects3D_Grid2dHigh" },
  { label: "Drawings2D", value: "Drawings2D" },
  { label: "Music", value: "Music" },
  { label: "Biometrics", value: "Biometrics" },
  { label: "Movements", value: "Movements" },
  { label: "Texts", value: "Texts" },
];

export default function DialogSubmitObject({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
  const [numApprovals, setNumApprovals] = useState(10);
  const [hashesEnabled, setHashesEnabled] = useState(false);
  const [hashes, setHashes] = useState<Hash[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);
  const [nextHashId, setNextHashId] = useState(1);

  // Memoized callbacks for JSX props
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCategory(e.target.value);
    },
    []
  );

  const handleIsPrivateChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      setIsPrivate(e.currentTarget.value === "private");
    },
    []
  );

  const handleNumApprovalsChange = useCallback((v: number) => {
    setNumApprovals(Number(v));
  }, []);

  const handleHashesEnabledToggle = useCallback(() => {
    setHashesEnabled((v) => !v);
  }, []);

  // Handlers for hashes
  const handleHashChange = useCallback((idx: number, value: string) => {
    setHashes((prev) => prev.map((h, i) => (i === idx ? { ...h, value } : h)));
  }, []);

  const addHash = useCallback(() => {
    if (hashes.length < 10) {
      setHashes([...hashes, { id: nextHashId, value: "" }]);
      setNextHashId(nextHashId + 1);
    }
  }, [hashes.length, nextHashId, hashes]);

  const removeHash = useCallback((idx: number) => {
    setHashes((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Handlers for properties
  const handlePropChange = useCallback(
    (idx: number, key: "propIdx" | "maxValue", value: number) => {
      setProperties((prev) => {
        return prev.map((p, i) => {
          if (i === idx) {
            if (key === "propIdx") {
              const selectedProperty = propertyOptions.find(
                (opt) => opt.value === value
              );
              if (selectedProperty) {
                const propertyName = selectedProperty.label.toLowerCase();
                const isNonFungible =
                  propertyName.includes("non-fungible") ||
                  propertyName.includes("nonfungible") ||
                  propertyName.includes("non fungible");
                // Always set maxValue to the selected property's maxValue (or 1 for Non-Fungible)
                return {
                  ...p,
                  propIdx: value,
                  maxValue: isNonFungible ? 1 : selectedProperty.maxValue,
                };
              }
              // If property not found, reset maxValue
              return { ...p, propIdx: value, maxValue: DEFAULT_MAX_VALUE };
            }
            // For maxValue changes, just update the value
            return { ...p, [key]: value };
          }
          return p;
        });
      });
    },
    [propertyOptions]
  );

  const addProperty = useCallback(() => {
    // Get all propIdx values already selected
    const selectedPropIdxs = new Set(properties.map((p) => p.propIdx));
    // Find the first property not already selected
    const availableProperty = propertyOptions.find(
      (opt) => !selectedPropIdxs.has(opt.value)
    );
    if (!availableProperty) return; // No more properties to add
    const propertyName = availableProperty.label.toLowerCase();
    const isNonFungible =
      propertyName.includes("non-fungible") ||
      propertyName.includes("nonfungible") ||
      propertyName.includes("non fungible");
    const defaultMaxValue = isNonFungible ? 1 : availableProperty.maxValue;
    setProperties([
      ...properties,
      {
        id: Date.now() + Math.random(),
        propIdx: availableProperty.value,
        maxValue: defaultMaxValue,
      },
    ]);
  }, [propertyOptions, properties]);

  const removeProperty = useCallback((idx: number) => {
    setProperties((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePropertyValueChange = useCallback(
    (idx: number, value: number) => {
      // Validate that the value doesn't exceed the property's max value
      setProperties((prev) => {
        const property = prev[idx];
        const selectedProperty = propertyOptions.find(
          (opt) => opt.value === property.propIdx
        );

        if (selectedProperty) {
          const propertyName = selectedProperty.label.toLowerCase();
          const isNonFungible =
            propertyName.includes("non-fungible") ||
            propertyName.includes("nonfungible") ||
            propertyName.includes("non fungible");
          const maxAllowedValue = isNonFungible ? 1 : selectedProperty.maxValue;
          const validatedValue = Math.min(value, maxAllowedValue);
          return prev.map((p, i) =>
            i === idx ? { ...p, maxValue: validatedValue } : p
          );
        }
        return prev.map((p, i) => (i === idx ? { ...p, maxValue: value } : p));
      });
    },
    [propertyOptions]
  );

  const handlePropertySelectChange = useCallback(
    (idx: number, value: number) => {
      handlePropChange(idx, "propIdx", value);
    },
    [handlePropChange]
  );

  // Create memoized callbacks for input changes with index parameters
  const createHashInputChangeCallback = useCallback(
    (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      handleHashChange(idx, e.target.value);
    },
    [handleHashChange]
  );

  const createPropertySelectChangeCallback = useCallback(
    (idx: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      handlePropertySelectChange(idx, Number(e.target.value));
    },
    [handlePropertySelectChange]
  );

  const createPropertyValueChangeCallback = useCallback(
    (idx: number) => (value: number) => {
      handlePropertyValueChange(idx, value);
    },
    [handlePropertyValueChange]
  );

  const createRemoveHashCallback = useCallback(
    (idx: number) => () => {
      removeHash(idx);
    },
    [removeHash]
  );

  const createRemovePropertyCallback = useCallback(
    (idx: number) => () => {
      removeProperty(idx);
    },
    [removeProperty]
  );

  // Get the KeyringPair for the selected account
  const pair: KeyringPair | null = (() => {
    try {
      if (keyringLoaded && selectedAccount && selectedAccount.trim() !== "") {
        return keyring.getPair(selectedAccount);
      }
      return null;
    } catch (error) {
      console.warn("Failed to get keyring pair:", error);
      return null;
    }
  })();

  // Check if we can submit
  useEffect(() => {
    setCanSubmit(
      Boolean(
        api !== undefined &&
          keyringLoaded &&
          pair !== null &&
          objFile !== null &&
          selectedAccount &&
          selectedAccount.trim() !== ""
      )
    );
  }, [api, keyringLoaded, pair, objFile, selectedAccount]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setError(null);
      setNumApprovals(10);
    }
  }, [isOpen]);

  // Helper function to decode hex string to readable text
  const decodeHexString = useCallback((hexString: string): string => {
    if (!hexString.startsWith("0x")) {
      return hexString; // Already decoded
    }

    try {
      const hex = hexString.slice(2); // Remove '0x' prefix
      let result = "";
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = Number.parseInt(hex.substr(i, 2), 16);
        if (charCode === 0) break; // Stop at null terminator
        result += String.fromCharCode(charCode);
      }
      return result || hexString; // Return original if decoding fails
    } catch (error) {
      console.warn("Failed to decode hex string:", hexString, error);
      return hexString; // Return original if decoding fails
    }
  }, []);

  // Fetch property options
  useEffect(() => {
    async function fetchPropertyOptions() {
      if (!api) return;
      setPropertyOptionsLoading(true);
      try {
        // Fetch all property entries (key-value pairs)
        const entries = await api.query.poScan.properties.entries();
        const options: PropertyOption[] = [];

        entries.forEach(([storageKey, property]) => {
          // Extract the index from the storage key
          const propIdx = Number.parseInt(storageKey.args[0].toString(), 10);
          const prop = property.toJSON ? property.toJSON() : property;
          if (
            prop &&
            typeof prop === "object" &&
            "name" in prop &&
            "maxValue" in prop
          ) {
            const rawName = (prop.name as string) || `Property ${propIdx}`;
            const name = decodeHexString(rawName);
            const maxValue = (prop.maxValue as number) || DEFAULT_MAX_VALUE;
            options.push({ label: name, value: propIdx, maxValue });
          }
        });

        options.sort((a, b) => a.label.localeCompare(b.label));
        setPropertyOptions(options);
      } catch (_error) {
        setError("Failed to load property options");
      } finally {
        setPropertyOptionsLoading(false);
      }
    }
    fetchPropertyOptions();
  }, [api, decodeHexString]);

  // Parse OBJ to mesh using the same robust pattern as ObjectCard
  const mesh = useMemo(() => {
    if (!objString) return null;
    if (typeof objString !== "string" || objString.trim().length === 0) {
      return null;
    }
    if (!objString.includes("v ") && !objString.includes("f ")) {
      return null;
    }
    // Try standard OBJLoader first
    try {
      const loader = new OBJLoader();
      const parsed = loader.parse(objString);
      if (!parsed || !parsed.children || parsed.children.length === 0) {
        throw new Error("No children");
      }
      const firstChild = parsed.children[0];
      if (!firstChild) {
        throw new Error("No first child");
      }
      if (!(firstChild as Mesh).isMesh) {
        throw new Error("Not a mesh");
      }
      if (!(firstChild as Mesh).geometry) {
        throw new Error("No geometry");
      }
      const geometry = (firstChild as Mesh).geometry;
      if (!geometry.attributes || !geometry.attributes.position) {
        throw new Error("No position attributes");
      }
      const positionCount = geometry.attributes.position.count;
      if (positionCount === 0) {
        throw new Error("No vertices");
      }
      return firstChild as Mesh;
    } catch (_e) {
      // Try robust parser as fallback
      try {
        const geometry = parseOBJRobust(objString);
        if (
          geometry?.attributes?.position &&
          geometry.attributes.position.count > 0
        ) {
          return new Mesh(geometry);
        }
      } catch (_robustError) {
        // Silent fallback - both parsers failed
      }
      return null;
    }
  }, [objString]);

  // OBJ file drag-and-drop with preview functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 1024 * 1024) {
        // 1MB = 1024*1024 bytes
        setError("OBJ file must be 1MB or less.");
        setObjFile(null);
        setObjString(null);
        return;
      }
      setObjFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setObjString(text);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".obj"] },
  });

  // Helper functions to avoid arrow functions in JSX
  const filterNonEmptyHashes = useCallback(
    (hash: Hash) => hash.value.trim() !== "",
    []
  );

  const filterValidProperties = useCallback(
    (prop: Property) => prop.propIdx >= 0 && prop.maxValue >= 0,
    []
  );

  const mapPropertyToApiFormat = useCallback(
    (prop: Property) => ({
      propIdx: Number(prop.propIdx),
      maxValue: BigInt(prop.maxValue),
    }),
    []
  );

  const handleSignAndSendCallback = useCallback(
    (result: SubmittableResult) => {
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
    },
    [toaster, t, onClose]
  );

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
      const categoryEnum =
        category === "Objects3D_Grid2dLow"
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
        hashesEnabled
          ? hashes.filter(filterNonEmptyHashes).map((h) => h.value)
          : null, // Option<Vec<H256>> - null when disabled
        properties
          .filter(filterValidProperties)
          .map(mapPropertyToApiFormat) // Vec<SpConsensusPoscanPropValue>
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
  }, [
    api,
    pair,
    objString,
    category,
    isPrivate,
    numApprovals,
    hashesEnabled,
    hashes,
    properties,
    toaster,
    t,
    handleSignAndSendCallback,
    filterNonEmptyHashes,
    filterValidProperties,
    mapPropertyToApiFormat,
  ]);

  // Clear form function
  const clearForm = useCallback(() => {
    setCategory(CATEGORY_OPTIONS[0].value);
    setIsPrivate(false);
    setObjFile(null);
    setObjString(null);
    setNumApprovals(10);
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

  // Helper to get the Share property option
  const getSharePropertyOption = useCallback(() => {
    return propertyOptions.find((opt) =>
      opt.label.toLowerCase().includes("share")
    );
  }, [propertyOptions]);

  // Ensure Share property is always present when dialog opens or propertyOptions change
  useEffect(() => {
    const shareOption = getSharePropertyOption();
    if (!shareOption) return;
    const hasShare = properties.some((p) => p.propIdx === shareOption.value);
    if (!hasShare) {
      setProperties((prev) => [
        {
          id: Date.now() + Math.random(),
          propIdx: shareOption.value,
          maxValue: shareOption.maxValue,
        },
        ...prev,
      ]);
    }
  }, [getSharePropertyOption, properties]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit New Object"
      canEscapeKeyClose
      canOutsideClickClose
      style={{ width: "800px", maxWidth: "90vw" }}
    >
      <div className={Classes.DIALOG_BODY}>
        {error && <Callout intent={Intent.DANGER}>{error}</Callout>}

        <FormGroup label={<span className="text-gray-500">Category:</span>}>
          <HTMLSelect
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={handleCategoryChange}
          />
        </FormGroup>
        <FormGroup
          label={<span className="text-gray-500">Property rights:</span>}
        >
          <RadioGroup
            inline
            selectedValue={isPrivate ? "private" : "public"}
            onChange={handleIsPrivateChange}
          >
            <Radio label="Public" value="public" />
            <Radio label="Private" value="private" />
          </RadioGroup>
        </FormGroup>
        <FormGroup
          label={
            <span className="text-gray-500">
              OBJ File <i>(1 Mb max)</i>:
            </span>
          }
        >
          <div
            {...getRootProps()}
            className={`border-dashed border-2 rounded p-4 text-center cursor-pointer ${isDragActive ? "bg-blue-50" : ""}`}
          >
            <input {...getInputProps()} />
            {objFile ? (
              <span>{objFile.name}</span>
            ) : (
              <span>Drag & drop or click to select .obj file</span>
            )}
          </div>
          {objString && (
            <div className="w-full h-48 mt-2 relative">
              {mesh?.geometry ? (
                <Canvas
                  camera={{
                    fov: 30,
                    near: 0.1,
                    far: 1000,
                    position: [0, 0, 2],
                  }}
                >
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <Spinner size={24} />
                      </div>
                    }
                  >
                    <ThreeDObject geometry={mesh.geometry} />
                  </Suspense>
                </Canvas>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center border border-gray-200 rounded">
                  <span className="text-gray-400 text-sm mb-1">
                    Preview not available
                  </span>
                  <span className="text-gray-500 text-xs max-w-full break-words">
                    {objString.includes("v ") || objString.includes("f ")
                      ? "Failed to parse OBJ geometry (may have malformed data)"
                      : "Invalid OBJ format"}
                  </span>
                </div>
              )}
            </div>
          )}
        </FormGroup>
        <FormGroup
          label={
            <span className="text-gray-500">
              Approvals: <i>(N of confirmations of the object authenticity)</i>
            </span>
          }
        >
          <NumericInput
            min={1}
            max={255}
            value={numApprovals}
            onValueChange={handleNumApprovalsChange}
          />
        </FormGroup>
        <FormGroup label={<span className="text-gray-500">Hash ID:</span>}>
          <Switch
            checked={hashesEnabled}
            label="Add Hashes Manually"
            onChange={handleHashesEnabledToggle}
          />
          {hashesEnabled && (
            <div className="space-y-2 mt-2">
              {hashes.map((h, i) => (
                <div key={`hash-${h.id}`} className="flex gap-2 items-center">
                  <InputGroup
                    value={h.value}
                    onChange={createHashInputChangeCallback(i)}
                    placeholder="Hash (H256)"
                  />
                  <Button
                    icon="cross"
                    minimal
                    onClick={createRemoveHashCallback(i)}
                  />
                </div>
              ))}
              {hashes.length < 10 && (
                <Button icon="plus" minimal onClick={addHash}>
                  Add Hash
                </Button>
              )}
            </div>
          )}
        </FormGroup>
        <FormGroup
          label={
            <span className="text-gray-500">Set the object properties:</span>
          }
        >
          {propertyOptionsLoading ? (
            <div className="flex items-center gap-2">
              <Spinner size={16} />
              <span>Loading properties...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((p, i) => {
                const selectedProperty = propertyOptions.find(
                  (opt) => opt.value === p.propIdx
                );
                const propertyName =
                  selectedProperty?.label.toLowerCase() || "";
                const isNonFungible =
                  propertyName.includes("non-fungible") ||
                  propertyName.includes("nonfungible") ||
                  propertyName.includes("non fungible");
                const isShare = propertyName.includes("share");
                // For this dropdown, allow the current property even if it's already selected
                const selectedPropIdxs = new Set(
                  properties.filter((_, idx) => idx !== i).map((p) => p.propIdx)
                );
                const isShareProperty =
                  p.propIdx === getSharePropertyOption()?.value;
                return (
                  <div
                    key={`property-${p.id}`}
                    className="flex gap-2 items-center"
                  >
                    <HTMLSelect
                      options={propertyOptions
                        .filter(
                          (opt) =>
                            !selectedPropIdxs.has(opt.value) ||
                            opt.value === p.propIdx
                        )
                        .map((opt) => ({ label: opt.label, value: opt.value }))}
                      value={p.propIdx}
                      onChange={createPropertySelectChangeCallback(i)}
                      placeholder="Select Property"
                      style={{ minWidth: "200px" }}
                      disabled={isShareProperty}
                    />
                    <NumericInput
                      min={0}
                      max={
                        selectedProperty
                          ? isNonFungible
                            ? 1
                            : selectedProperty.maxValue
                          : undefined
                      }
                      value={
                        selectedProperty
                          ? isNonFungible
                            ? 1
                            : Math.min(p.maxValue, selectedProperty.maxValue)
                          : p.maxValue
                      }
                      onValueChange={createPropertyValueChangeCallback(i)}
                      placeholder="Max Value"
                      disabled={isNonFungible || isShare}
                    />
                    <Button
                      icon="cross"
                      minimal
                      onClick={createRemovePropertyCallback(i)}
                      disabled={isShareProperty}
                    />
                    {isNonFungible && (
                      <span className="text-sm text-gray-500">
                        (Fixed at 1)
                      </span>
                    )}
                    {isShare && (
                      <span className="text-sm text-gray-500 hidden sm:inline">
                        (Auto-applied)
                      </span>
                    )}
                    {selectedProperty && !isNonFungible && !isShare && (
                      <span className="text-sm text-gray-500 hidden sm:inline">
                        (Max: {selectedProperty.maxValue.toLocaleString()})
                      </span>
                    )}
                  </div>
                );
              })}
              <Button
                icon="plus"
                minimal
                onClick={addProperty}
                disabled={properties.length >= propertyOptions.length}
              >
                Add Property
              </Button>
            </div>
          )}
        </FormGroup>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={clearForm}
            disabled={isLoading}
            intent={Intent.WARNING}
          >
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
