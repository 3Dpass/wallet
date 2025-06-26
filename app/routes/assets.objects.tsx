import { Card, Elevation, Spinner, Switch, InputGroup, Button, Icon } from "@blueprintjs/core";
import AssetsSection from "../components/assets/AssetsSection";
import { useApi, useAccounts } from "app/components/Api";
import React, { useEffect, useState } from "react";
import { useAtom } from 'jotai';
import { lastSelectedAccountAtom } from 'app/atoms';
import ObjectCard from '../components/assets/ObjectCard';
import DialogSubmitObject from '../components/dialogs/DialogSubmitObject';
import { useTranslation } from "react-i18next";

export default function AssetsObjects() {
  const { t } = useTranslation();
  const api = useApi();
  const accounts = useAccounts();
  const [selectedAccount] = useAtom(lastSelectedAccountAtom);
  const [objCount, setObjCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [loadingIdentities, setLoadingIdentities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [objectIndexes, setObjectIndexes] = useState<number[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [objectsWithOwners, setObjectsWithOwners] = useState<any[]>([]);
  const [objectsWithIdentities, setObjectsWithIdentities] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userToggledShowAll, setUserToggledShowAll] = useState(false);
  const [isFetchingSpecificObject, setIsFetchingSpecificObject] = useState(false);

  // Auto-switch between "My objects" and "All objects" based on account presence, unless user toggled manually
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;
    
    if (!userToggledShowAll) {
      if (accounts.length === 0 && !showAll) {
        setShowAll(true);
      } else if (accounts.length > 0 && showAll) {
        setShowAll(false);
      }
    }
  }, [accounts.length, showAll, userToggledShowAll, isFetchingSpecificObject]);

  // When user toggles the switch, set the manual flag
  const handleShowAllToggle = () => {
    setShowAll((v) => !v);
    setUserToggledShowAll(true);
  };

  // Helper function to get state display name
  const getStateDisplayName = (stateKey: string) => {
    return t(`assets_objects.state_names.${stateKey}`, stateKey);
  };

  // Generate search suggestions based on current objects
  const generateSearchSuggestions = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions: string[] = [];
    const term = searchTerm.toLowerCase();

    // Check if the search term is a number for "Find the object: index" suggestion
    if (/^\d+$/.test(searchTerm.trim())) {
      const index = parseInt(searchTerm.trim());
      suggestions.push(t('assets_objects.search_suggestions.find_object', { index }));
    }

    // Add state suggestions based on search term
    const allStates = ['created', 'estimating', 'estimated', 'approving', 'approved', 'notApproved'];
    allStates.forEach(state => {
      const displayName = getStateDisplayName(state);
      if (displayName.toLowerCase().includes(term)) {
        suggestions.push(`${displayName} objects`);
      }
    });

    if (objectsWithIdentities.length === 0) {
      setSearchSuggestions(suggestions);
      return;
    }

    objectsWithIdentities.forEach((obj, index) => {
      if (!obj) return;

      // Index suggestions
      const objectIndex = objectIndexes[index];
      if (String(objectIndex).includes(term)) {
        suggestions.push(t('assets_objects.search_suggestions.index', { index: objectIndex }));
      }

      // Created block suggestions
      if (obj.whenCreated && String(obj.whenCreated).includes(term)) {
        suggestions.push(t('assets_objects.search_suggestions.created', { block: obj.whenCreated }));
      }

      // State suggestions
      if (obj.state) {
        Object.entries(obj.state).forEach(([stateKey, stateValue]) => {
          if (typeof stateValue === 'number' && String(stateValue).includes(term)) {
            const stateName = getStateDisplayName(stateKey);
            suggestions.push(`${stateName}: ${stateValue}`);
          }
        });
      }

      // Public/Private suggestions
      if (term === 'public' && obj.isPrivate === false) {
        suggestions.push(t('assets_objects.search_suggestions.public_objects'));
      }
      if (term === 'private' && obj.isPrivate === true) {
        suggestions.push(t('assets_objects.search_suggestions.private_objects'));
      }

      // Property suggestions
      if (Array.isArray(obj.prop)) {
        obj.prop.forEach((p: any) => {
          if (p && typeof p === 'object') {
            if (p.name && String(p.name).toLowerCase().includes(term)) {
              suggestions.push(t('assets_objects.search_suggestions.property', { name: p.name }));
            }
            if (p.maxValue !== undefined && String(p.maxValue).includes(term)) {
              suggestions.push(t('assets_objects.search_suggestions.property_value', { value: p.maxValue }));
            }
          }
        });
      }

      // Owner suggestions
      if (obj.owner && String(obj.owner).toLowerCase().includes(term)) {
        suggestions.push(t('assets_objects.search_suggestions.owner', { owner: obj.owner }));
      }

      // Identity suggestions
      if (obj.identity && String(obj.identity).toLowerCase().includes(term)) {
        suggestions.push(t('assets_objects.search_suggestions.identity', { identity: obj.identity }));
      }
    });

    // Remove duplicates and limit to 10 suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
    setSearchSuggestions(uniqueSuggestions);
  };

  // Function to reset view to show all objects
  const resetToAllObjects = () => {
    setShowAll(true);
    setVisibleCount(10);
    setSearch('');
    setError(null);
    setUserToggledShowAll(false); // Reset the manual toggle flag
    setIsFetchingSpecificObject(false); // Reset the specific object flag
    // Force a refresh by incrementing the refresh trigger
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to fetch a specific object by index
  const fetchObjectByIndex = async (index: number) => {
    if (!api) return;
    
    setIsFetchingSpecificObject(true);
    setLoadingObjects(true);
    setError(null);
    
    try {
      // Fetch the specific object
      const objectResult = await api.query.poScan.objects(index) as any;
      if (!objectResult.isSome) {
        setError(t('assets_objects.object_not_found', { index }));
        setLoadingObjects(false);
        setIsFetchingSpecificObject(false);
        return;
      }
      
      const objectData = objectResult.unwrap().toJSON();
      
      // Fetch owner data for this object
      setLoadingOwners(true);
      let ownerData = null;
      if (objectData?.owner) {
        try {
          const accountInfo = await api.derive.accounts.info(objectData.owner);
          if (accountInfo.identity?.display) {
            ownerData = { ...objectData, identity: accountInfo.identity.display };
          } else {
            ownerData = objectData;
          }
        } catch (error) {
          console.warn(t('assets_objects.failed_fetch_identity', { owner: objectData.owner }), error);
          ownerData = objectData;
        }
      } else {
        ownerData = objectData;
      }
      setLoadingOwners(false);
      
      // Set the object data and update the view
      setObjectIndexes([index]);
      setObjects([objectData]);
      setObjectsWithOwners([ownerData]);
      setObjectsWithIdentities([ownerData]);
      setObjCount(1);
      setShowAll(true); // Switch to "All objects" view to show the result
      setUserToggledShowAll(true); // Prevent auto-switching from interfering
      setVisibleCount(1); // Show only this object
      
    } catch (e) {
      setError(t('assets_objects.failed_fetch_object', { index }));
      console.error('Failed to fetch object by index', e);
    } finally {
      setLoadingObjects(false);
      setLoadingOwners(false);
      // Don't reset isFetchingSpecificObject here - let it stay true until user resets
    }
  };

  // Update search suggestions when search term changes
  useEffect(() => {
    generateSearchSuggestions(search);
  }, [search, objectsWithIdentities, objectIndexes, t]);

  // Fetch object indexes for the current view
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;
    
    let mounted = true;
    async function fetchIndexes() {
      if (!api) return;
      setLoadingIndexes(true);
      setError(null);
      try {
        let indexes: number[] = [];
        if (!showAll) {
          if (!api.query?.poScan?.owners || !selectedAccount) {
            if (mounted) {
              setObjCount(null);
              setError(t('assets_objects.storage_not_available'));
              setObjectIndexes([]);
            }
            return;
          }
          const result = await api.query.poScan.owners(selectedAccount);
          const owned = result.toJSON() as number[];
          indexes = Array.isArray(owned) ? owned : [];
          console.log(`Storage says account ${selectedAccount} owns objects:`, indexes);
        } else {
          if (!api.query?.poScan?.objCount) {
            if (mounted) {
              setObjCount(null);
              setError(t('assets_objects.storage_not_available'));
              setObjectIndexes([]);
            }
            return;
          }
          const count = await api.query.poScan.objCount();
          const n = Number(count.toString());
          indexes = Array.from({ length: n }, (_, i) => i);
        }
        if (mounted) {
          // Reverse the indexes to show newest objects first
          setObjectIndexes([...indexes].reverse());
          setObjCount(indexes.length);
        }
      } catch (e) {
        if (mounted) {
          setObjCount(null);
          setError(t('assets_objects.failed_fetch_indexes'));
          setObjectIndexes([]);
        }
        // eslint-disable-next-line no-console
        console.error('Failed to fetch object indexes', e);
      } finally {
        if (mounted) {
          setLoadingIndexes(false);
        }
      }
    }
    fetchIndexes();
    return () => { mounted = false; };
  }, [api, selectedAccount, showAll, refreshTrigger, isFetchingSpecificObject, t]);

  // Fetch object data for the current indexes
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;
    
    let mounted = true;
    async function fetchObjects() {
      if (!api || objectIndexes.length === 0) {
        setObjects([]);
        setLoadingObjects(false);
        setObjectsWithOwners([]);
        setObjectsWithIdentities([]);
        setLoadingOwners(false);
        setLoadingIdentities(false);
        return;
      }
      setLoadingObjects(true);
      try {
        const queries = objectIndexes.map(idx => api.query.poScan.objects(idx) as Promise<any>);
        const results = await Promise.all(queries);
        const parsed = results.map((opt: any) => (opt.isSome ? opt.unwrap().toJSON() : null));
        if (mounted) setObjects(parsed);
      } catch (e) {
        if (mounted) setObjects([]);
        // eslint-disable-next-line no-console
        console.error('Failed to fetch objects', e);
      } finally {
        if (mounted) setLoadingObjects(false);
      }
    }
    fetchObjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, objectIndexes.join(","), isFetchingSpecificObject]);

  // Reset visibleCount when objectIndexes change
  useEffect(() => {
    setVisibleCount(10);
  }, [objectIndexes.join(",")]);

  // Reset loading states when account changes
  useEffect(() => {
    setLoadingIndexes(false);
    setLoadingObjects(false);
    setLoadingOwners(false);
    setLoadingIdentities(false);
    setObjects([]);
    setObjectsWithOwners([]);
    setObjectsWithIdentities([]);
    setError(null);
    setIsFetchingSpecificObject(false);
  }, [selectedAccount]);

  // Fetch owner data for objects (simplified - no need to verify ownership for "My objects")
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;
    
    let mounted = true;
    async function fetchOwnerData() {
      if (!api || objects.length === 0) {
        setObjectsWithOwners([]);
        setLoadingOwners(false);
        return;
      }

      setLoadingOwners(true);
      try {
        const objectsWithOwnerData = await Promise.all(
          objects.map(async (obj, index) => {
            if (!obj) return obj;
            
            // For "My objects", always verify ownership to catch storage inconsistencies
            if (!showAll) {
              try {
                // @ts-ignore - poscan is a custom RPC
                const rpcResult = await api.rpc.poscan.getPoscanObject(objectIndexes[index]);
                if (rpcResult?.owner) {
                  const actualOwner = rpcResult.owner;
                  
                  // Only include if the actual owner matches selectedAccount
                  if (selectedAccount && actualOwner === selectedAccount) {
                    return { ...obj, owner: selectedAccount };
                  } else {
                    console.warn(t('assets_objects.ownership_mismatch', { 
                      index: objectIndexes[index], 
                      storageOwner: selectedAccount, 
                      actualOwner 
                    }));
                    return null; // Exclude this object
                  }
                }
              } catch (error) {
                console.warn(t('assets_objects.failed_fetch_owner', { index: objectIndexes[index] }), error);
                // If we can't verify ownership for "My objects", exclude the object to be safe
                return null;
              }
            } else {
              // For "All objects", try to get owner data but don't exclude on failure
              try {
                // @ts-ignore - poscan is a custom RPC
                const rpcResult = await api.rpc.poscan.getPoscanObject(objectIndexes[index]);
                if (rpcResult?.owner) {
                  return { ...obj, owner: rpcResult.owner };
                }
              } catch (error) {
                console.warn(t('assets_objects.failed_fetch_owner', { index: objectIndexes[index] }), error);
                // For "All objects", keep the object even if we can't get owner data
              }
            }
            
            // Return the object as-is if no owner data could be fetched
            return obj;
          })
        );
        
        if (mounted) {
          setObjectsWithOwners(objectsWithOwnerData);
        }
      } catch (error) {
        console.error(t('assets_objects.failed_fetch_owner_data'), error);
        if (mounted) {
          setObjectsWithOwners(objects);
        }
      } finally {
        if (mounted) {
          setLoadingOwners(false);
        }
      }
    }

    fetchOwnerData();
    return () => { mounted = false; };
  }, [api, objects, objectIndexes, isFetchingSpecificObject, showAll, selectedAccount, t]);

  // Fetch identity data for owners
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;
    
    let mounted = true;
    async function fetchIdentityData() {
      if (!api || objectsWithOwners.length === 0) {
        setObjectsWithIdentities([]);
        setLoadingIdentities(false);
        return;
      }

      setLoadingIdentities(true);
      try {
        const objectsWithIdentityData = await Promise.all(
          objectsWithOwners.map(async (obj) => {
            if (!obj?.owner) return obj;
            
            try {
              // Fetch identity information for the owner
              const accountInfo = await api.derive.accounts.info(obj.owner);
              if (accountInfo.identity?.display) {
                return { ...obj, identity: accountInfo.identity.display };
              }
            } catch (error) {
              console.warn(t('assets_objects.failed_fetch_identity', { owner: obj.owner }), error);
            }
            return obj;
          })
        );
        
        if (mounted) {
          setObjectsWithIdentities(objectsWithIdentityData);
        }
      } catch (error) {
        console.error(t('assets_objects.failed_fetch_identity_data'), error);
        if (mounted) {
          setObjectsWithIdentities(objectsWithOwners);
        }
      } finally {
        if (mounted) {
          setLoadingIdentities(false);
        }
      }
    }

    fetchIdentityData();
    return () => { mounted = false; };
  }, [api, objectsWithOwners, isFetchingSpecificObject, t]);

  // Manage overall loading state
  useEffect(() => {
    const isAnyLoading = loadingIndexes || loadingObjects || loadingOwners || loadingIdentities;
    setLoading(isAnyLoading);
  }, [loadingIndexes, loadingObjects, loadingOwners, loadingIdentities]);

  return (
    <AssetsSection>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center mb-0">
          {t('assets_objects.title')}
          {loading ? (
            <Spinner size={16} className="ml-2" />
          ) : objCount !== null ? (
            <span className="ml-2">({objCount})</span>
          ) : (
            <span className="ml-2 text-gray-400">(–)</span>
          )}
        </h2>
        <div className="flex items-center gap-6">
          <Button icon="plus" intent="primary" className="mr-4" onClick={() => setIsDialogOpen(true)}>
            {t('assets_objects.new_object')}
          </Button>
          <Switch
            checked={showAll}
            label={showAll ? t('assets_objects.all_objects') : t('assets_objects.my_objects')}
            onChange={handleShowAllToggle}
          />
        </div>
      </div>
      <div className="mb-4">
        <div className="relative">
          <InputGroup
            leftIcon="search"
            placeholder={t('assets_objects.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            fill
          />
          {searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-b shadow-lg z-10 max-h-48 overflow-y-auto">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-600 last:border-b-0 text-gray-200"
                  onClick={() => {
                    // Extract the search term from the suggestion
                    if (suggestion.includes(t('assets_objects.search_suggestions.find_object', { index: '' }).replace('{{index}}', ''))) {
                      const index = parseInt(suggestion.split(t('assets_objects.search_suggestions.find_object', { index: '' }).replace('{{index}}', ''))[1]);
                      fetchObjectByIndex(index);
                      setSearch(''); // Clear the search input
                      setSearchSuggestions([]); // Clear suggestions
                    } else if (suggestion.includes(t('assets_objects.search_suggestions.public_objects'))) {
                      setSearch('public');
                      setSearchSuggestions([]); // Clear suggestions
                    } else if (suggestion.includes(t('assets_objects.search_suggestions.private_objects'))) {
                      setSearch('private');
                      setSearchSuggestions([]); // Clear suggestions
                    } else if (suggestion.endsWith(' objects')) {
                      // Handle state-based suggestions like "Created objects", "Approved objects"
                      setSearch(suggestion);
                      setSearchSuggestions([]); // Clear suggestions
                    } else if (suggestion.includes(t('assets_objects.search_suggestions.identity', { identity: '' }).replace('{{identity}}', ''))) {
                      setSearch(suggestion.split(t('assets_objects.search_suggestions.identity', { identity: '' }).replace('{{identity}}', ''))[1]);
                      setSearchSuggestions([]); // Clear suggestions
                    } else if (suggestion.includes(': ')) {
                      setSearch(suggestion.split(': ')[1]);
                      setSearchSuggestions([]); // Clear suggestions
                    } else {
                      setSearch(suggestion);
                      setSearchSuggestions([]); // Clear suggestions
                    }
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Show "Show all objects" button when viewing a single object */}
        {objCount === 1 && objectIndexes.length === 1 && (
          <div className="mt-2">
            <Button 
              icon="list" 
              minimal 
              onClick={resetToAllObjects}
            >
              {t('assets_objects.show_all_objects')}
            </Button>
          </div>
        )}
      </div>
      <Card elevation={Elevation.ONE} className="p-4">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            <div className="flex flex-col gap-3 max-w-4xl mx-auto">
              {objectsWithIdentities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                  <Icon icon="inbox" iconSize={50} className="mb-4" />
                  <div className="text-lg">
                    {!showAll ? t('assets_objects.no_objects_found_account') : t('assets_objects.no_objects_found')}
                  </div>
                </div>
              )}
              {objectsWithIdentities
                .map((obj, originalIndex) => ({ obj, originalIndex }))
                .filter(({ obj, originalIndex }) => {
                  if (!obj) return false;
                  // Search filter
                  if (!search.trim()) return true;
                  const s = search.trim().toLowerCase();
                  
                  // State-based searches (e.g., "Created objects", "Approved objects")
                  if (s.endsWith(' objects')) {
                    const stateSearch = s.replace(' objects', '');
                    const allStates = ['created', 'estimating', 'estimated', 'approving', 'approved', 'notApproved'];
                    const matchingState = allStates.find(state => 
                      getStateDisplayName(state).toLowerCase() === stateSearch
                    );
                    if (matchingState && obj.state && obj.state[matchingState] !== undefined) {
                      return true;
                    }
                  }
                  
                  // Index
                  if (String(objectIndexes[originalIndex]).includes(s)) return true;
                  // Created block
                  if (obj.whenCreated && String(obj.whenCreated).includes(s)) return true;
                  // Public/Private
                  if (s === 'public' && obj.isPrivate === false) return true;
                  if (s === 'private' && obj.isPrivate === true) return true;
                  // Properties (by name or value)
                  if (Array.isArray(obj.prop)) {
                    for (const p of obj.prop) {
                      if (p && typeof p === 'object') {
                        // Check property name (case-insensitive, partial)
                        if (p.name && String(p.name).toLowerCase().includes(s)) return true;
                        // Check property value
                        if (p.maxValue !== undefined && String(p.maxValue).includes(s)) return true;
                      }
                    }
                  }
                  // Non-Fungible (by property name or value)
                  if (s === 'non-fungible' && Array.isArray(obj.prop)) {
                    for (const p of obj.prop) {
                      if (p && typeof p === 'object' && p.name && String(p.name).toLowerCase().includes('non-fungible')) return true;
                    }
                  }
                  // State search
                  if (obj.state) {
                    const stateKeys = Object.keys(obj.state);
                    for (const stateKey of stateKeys) {
                      if (stateKey.toLowerCase().includes(s)) return true;
                    }
                  }
                  
                  // Owner search
                  if (obj.owner && String(obj.owner).toLowerCase().includes(s)) return true;
                  
                  // Identity search
                  if (obj.identity && String(obj.identity).toLowerCase().includes(s)) return true;
                  
                  return false;
                })
                .slice(0, visibleCount)
                .map(({ obj, originalIndex }) =>
                  obj ? (
                    <ObjectCard 
                      key={
                        objectIndexes[originalIndex] !== undefined
                          ? `${objectIndexes[originalIndex]}-${originalIndex}`
                          : originalIndex
                      }
                      objectIndex={objectIndexes[originalIndex]} 
                      objectData={obj} 
                    />
                  ) : null
                )}
            </div>
            {objects.length > visibleCount && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setVisibleCount((c) => c + 10)}
                >
                  {t('assets_objects.load_more')}
                </button>
              </div>
            )}
            <DialogSubmitObject isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
          </>
        )}
      </Card>
    </AssetsSection>
  );
} 