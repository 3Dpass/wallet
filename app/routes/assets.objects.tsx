import {
  Button,
  Card,
  Elevation,
  Icon,
  InputGroup,
  Spinner,
  Switch,
} from "@blueprintjs/core";
import { lastSelectedAccountAtom } from "app/atoms";
import { useAccounts, useApi } from "app/components/Api";
import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AssetsSection from "../components/assets/AssetsSection";
import ObjectCard from "../components/assets/ObjectCard";
import DialogSubmitObject from "../components/dialogs/DialogSubmitObject";

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
  const [objects, setObjects] = useState<(Record<string, unknown> | null)[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [objectsWithOwners, setObjectsWithOwners] = useState<
    (Record<string, unknown> | null)[]
  >([]);
  const [objectsWithIdentities, setObjectsWithIdentities] = useState<
    (Record<string, unknown> | null)[]
  >([]);
  const [_refreshTrigger, setRefreshTrigger] = useState(0);
  const [userToggledShowAll, setUserToggledShowAll] = useState(false);
  const [isFetchingSpecificObject, setIsFetchingSpecificObject] =
    useState(false);

  // Memoized callbacks for JSX props
  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleLoadNext = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const handleLoadPrevious = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  // Function to fetch a specific object by index
  const fetchObjectByIndex = useCallback(
    async (index: number) => {
      if (!api) return;

      setIsFetchingSpecificObject(true);
      setLoadingObjects(true);
      setLoadingOwners(true);
      setError(null);

      try {
        // Fetch the specific object
        const objectResult = await api.query.poScan.objects(index);
        if (
          !objectResult ||
          typeof objectResult !== "object" ||
          !("isSome" in objectResult) ||
          !("unwrap" in objectResult)
        ) {
          setError(t("assets_objects.object_not_found", { index }));
          return;
        }

        const option = objectResult as unknown as {
          isSome: boolean;
          unwrap: () => unknown;
        };

        if (!option.isSome) {
          setError(t("assets_objects.object_not_found", { index }));
          return;
        }

        const unwrapped = option.unwrap();
        if (
          !unwrapped ||
          typeof unwrapped !== "object" ||
          !("toJSON" in unwrapped)
        ) {
          setError(t("assets_objects.object_not_found", { index }));
          return;
        }

        const objectData = (
          unwrapped as { toJSON: () => Record<string, unknown> }
        ).toJSON();

        // Fetch owner data for this object
        let ownerData = objectData;
        if (objectData?.owner && typeof objectData.owner === "string") {
          try {
            const accountInfo = await api.derive.accounts.info(
              objectData.owner
            );
            if (accountInfo.identity?.display) {
              ownerData = {
                ...objectData,
                identity: accountInfo.identity.display,
              };
            }
          } catch (error) {
            console.warn(
              t("assets_objects.failed_fetch_identity", {
                owner: objectData.owner,
              }),
              error
            );
          }
        }

        // Set the object data and update the view
        setObjectIndexes([index]);
        setObjects([objectData]);
        setObjectsWithOwners([ownerData]);
        setObjectsWithIdentities([ownerData]);
        setObjCount(1);
        setShowAll(true); // Switch to "All objects" view to show the result
        setUserToggledShowAll(true); // Prevent auto-switching from interfering
        setCurrentPage(1); // Show only this object
      } catch (e) {
        setError(t("assets_objects.failed_fetch_object", { index }));
        console.error("Failed to fetch object by index", e);
      } finally {
        setLoadingObjects(false);
        setLoadingOwners(false);
        // Don't reset isFetchingSpecificObject here - let it stay true until user resets
      }
    },
    [api, t]
  );

  // Memoized callback for handling search suggestion clicks
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const clearSearchAndSuggestions = () => {
        setSearch("");
        setSearchSuggestions([]);
      };

      // Extract the search term from the suggestion
      if (suggestion.startsWith("Find the object: ")) {
        const indexStr = suggestion.replace("Find the object: ", "");
        const index = Number.parseInt(indexStr, 10);
        if (!Number.isNaN(index)) {
          fetchObjectByIndex(index).then(clearSearchAndSuggestions);
          return;
        }
      } else if (
        suggestion.includes(
          t("assets_objects.search_suggestions.public_objects")
        )
      ) {
        setSearch("public");
      } else if (
        suggestion.includes(
          t("assets_objects.search_suggestions.private_objects")
        )
      ) {
        setSearch("private");
      } else if (suggestion.endsWith(" objects")) {
        // Handle state-based suggestions like "Created objects", "Approved objects"
        setSearch(suggestion);
      } else if (
        suggestion.includes(
          t("assets_objects.search_suggestions.identity", {
            identity: "",
          }).replace("{{identity}}", "")
        )
      ) {
        setSearch(
          suggestion.split(
            t("assets_objects.search_suggestions.identity", {
              identity: "",
            }).replace("{{identity}}", "")
          )[1]
        );
      } else if (suggestion.includes(": ")) {
        setSearch(suggestion.split(": ")[1]);
      } else {
        setSearch(suggestion);
      }

      setSearchSuggestions([]); // Clear suggestions for all cases
    },
    [t, fetchObjectByIndex]
  );

  // Function to create click handler for each suggestion
  const createSuggestionClickHandler = useCallback(
    (suggestion: string) => {
      return () => handleSuggestionClick(suggestion);
    },
    [handleSuggestionClick]
  );

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
  const handleShowAllToggle = useCallback(() => {
    setShowAll((v) => !v);
    setUserToggledShowAll(true);
  }, []);

  // Helper function to get state display name
  const getStateDisplayName = useCallback(
    (stateKey: string) => {
      return t(`assets_objects.state_names.${stateKey}`, stateKey);
    },
    [t]
  );

  // Generate search suggestions based on current objects
  const generateSearchSuggestions = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setSearchSuggestions([]);
        return;
      }

      const suggestions: string[] = [];
      const term = searchTerm.toLowerCase();
      const allStates = [
        "created",
        "estimating",
        "estimated",
        "approving",
        "approved",
        "notApproved",
      ];

      // Check if the search term is a number for "Find the object: index" suggestion
      if (/^\d+$/.test(searchTerm.trim())) {
        const index = Number.parseInt(searchTerm.trim());
        suggestions.push(
          t("assets_objects.search_suggestions.find_object", { index })
        );
      }

      // Add state suggestions based on search term
      allStates.forEach((state) => {
        const displayName = getStateDisplayName(state);
        if (displayName.toLowerCase().includes(term)) {
          suggestions.push(`${displayName} objects`);
        }
      });

      if (objectsWithIdentities.length === 0) {
        setSearchSuggestions(suggestions);
        return;
      }

      // Generate suggestions from existing objects
      objectsWithIdentities.forEach((obj, index) => {
        if (!obj) return;

        const objectIndex = objectIndexes[index];

        // Index suggestions
        if (String(objectIndex).includes(term)) {
          suggestions.push(
            t("assets_objects.search_suggestions.index", { index: objectIndex })
          );
        }

        // Created block suggestions
        if (obj.whenCreated && String(obj.whenCreated).includes(term)) {
          suggestions.push(
            t("assets_objects.search_suggestions.created", {
              block: obj.whenCreated,
            })
          );
        }

        // State suggestions
        if (obj.state) {
          Object.entries(obj.state).forEach(([stateKey, stateValue]) => {
            if (
              typeof stateValue === "number" &&
              String(stateValue).includes(term)
            ) {
              const stateName = getStateDisplayName(stateKey);
              suggestions.push(`${stateName}: ${stateValue}`);
            }
          });
        }

        // Public/Private suggestions
        if (term === "public" && obj.isPrivate === false) {
          suggestions.push(
            t("assets_objects.search_suggestions.public_objects")
          );
        }
        if (term === "private" && obj.isPrivate === true) {
          suggestions.push(
            t("assets_objects.search_suggestions.private_objects")
          );
        }

        // Property suggestions
        if (Array.isArray(obj.prop)) {
          obj.prop.forEach((p: Record<string, unknown>) => {
            if (p && typeof p === "object") {
              if (p.name && String(p.name).toLowerCase().includes(term)) {
                suggestions.push(
                  t("assets_objects.search_suggestions.property", {
                    name: p.name,
                  })
                );
              }
              if (
                p.maxValue !== undefined &&
                String(p.maxValue).includes(term)
              ) {
                suggestions.push(
                  t("assets_objects.search_suggestions.property_value", {
                    value: p.maxValue,
                  })
                );
              }
            }
          });
        }

        // Owner suggestions
        if (obj.owner && String(obj.owner).toLowerCase().includes(term)) {
          suggestions.push(
            t("assets_objects.search_suggestions.owner", { owner: obj.owner })
          );
        }

        // Identity suggestions
        if (obj.identity && String(obj.identity).toLowerCase().includes(term)) {
          suggestions.push(
            t("assets_objects.search_suggestions.identity", {
              identity: obj.identity,
            })
          );
        }
      });

      // Remove duplicates and limit to 10 suggestions
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
      setSearchSuggestions(uniqueSuggestions);
    },
    [t, objectsWithIdentities, objectIndexes, getStateDisplayName]
  );

  // Function to reset view to show all objects
  const resetToAllObjects = useCallback(() => {
    setShowAll(true);
    setCurrentPage(1);
    setSearch("");
    setError(null);
    setUserToggledShowAll(false); // Reset the manual toggle flag
    setIsFetchingSpecificObject(false); // Reset the specific object flag
    // Force a refresh by incrementing the refresh trigger
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Update search suggestions when search term changes
  useEffect(() => {
    generateSearchSuggestions(search);
  }, [search, generateSearchSuggestions]);

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
              setError(t("assets_objects.storage_not_available"));
              setObjectIndexes([]);
            }
            return;
          }
          const result = await api.query.poScan.owners(selectedAccount);
          const owned = result.toJSON() as number[];
          indexes = Array.isArray(owned) ? owned : [];
        } else {
          if (!api.query?.poScan?.objCount) {
            if (mounted) {
              setObjCount(null);
              setError(t("assets_objects.storage_not_available"));
              setObjectIndexes([]);
            }
            return;
          }
          const count = await api.query.poScan.objCount();
          const n = Number(count.toString());
          // For now, let's use a simpler approach: assume all objects 0 to n-1 exist
          // The RPC limit issue suggests we need to be more conservative with batch sizes
          // We'll let the object fetching handle the actual existence checking
          indexes = Array.from({ length: n }, (_, i) => i);
        }
        if (mounted) {
          // Reverse the indexes to show newest objects first
          const reversedIndexes = [...indexes].reverse();
          setObjectIndexes(reversedIndexes);
          setObjCount(indexes.length);
        }
      } catch (e) {
        if (mounted) {
          setObjCount(null);
          setError(t("assets_objects.failed_fetch_indexes"));
          setObjectIndexes([]);
        }
        // eslint-disable-next-line no-console
        console.error("Failed to fetch object indexes", e);
      } finally {
        if (mounted) {
          setLoadingIndexes(false);
        }
      }
    }
    fetchIndexes();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return () => {
      mounted = false;
    };
  }, [api, selectedAccount, showAll, isFetchingSpecificObject, t]);

  // Fetch object data for the current page only
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;

    let mounted = true;
    let abortController: AbortController | null = null;
    
    async function fetchObjectsForPage() {
      if (!api || objectIndexes.length === 0) {
        setObjects([]);
        setLoadingObjects(false);
        setObjectsWithOwners([]);
        setObjectsWithIdentities([]);
        setLoadingOwners(false);
        setLoadingIdentities(false);
        return;
      }

      // Cancel any ongoing request
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const { signal } = abortController;

      setLoadingObjects(true);
      setError(null);
      
      try {
        // Calculate which objects to fetch for the current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageObjectIndexes = objectIndexes.slice(startIndex, endIndex);
        
        if (pageObjectIndexes.length === 0) {
          setObjects([]);
          return;
        }

        // Fetch only the objects for the current page
        const queries = pageObjectIndexes.map((idx) => api.query.poScan.objects(idx));
        const results = await Promise.all(queries);
        
        const parsed = results.map((opt) => {
          if (
            opt &&
            typeof opt === "object" &&
            "isSome" in opt &&
            "unwrap" in opt
          ) {
            const option = opt as { isSome: boolean; unwrap: () => unknown };
            if (option.isSome) {
              const unwrapped = option.unwrap();
              if (
                unwrapped &&
                typeof unwrapped === "object" &&
                "toJSON" in unwrapped
              ) {
                return (
                  unwrapped as { toJSON: () => Record<string, unknown> }
                ).toJSON();
              }
            }
            return null;
          }
          return null;
        });
        
        if (mounted && !signal.aborted) {
          setObjects(parsed);
        }
      } catch (e) {
        if (mounted && !signal.aborted) {
          setObjects([]);
          setError(t("assets_objects.failed_fetch_objects"));
        }
        // eslint-disable-next-line no-console
        console.error("Failed to fetch objects for page", e);
      } finally {
        if (mounted && !signal.aborted) {
          setLoadingObjects(false);
        }
      }
    }
    
    fetchObjectsForPage();
    
    return () => {
      mounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, isFetchingSpecificObject, objectIndexes, currentPage, itemsPerPage, t]);

  // Reset currentPage when objectIndexes change
  useEffect(() => {
    setCurrentPage(1);
  }, [objectIndexes]);

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
  }, []);

  // Fetch owner data for objects on current page only
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;

    let mounted = true;
    let abortController: AbortController | null = null;
    
    async function fetchOwnerData() {
      if (!api || objects.length === 0) {
        setObjectsWithOwners([]);
        setLoadingOwners(false);
        return;
      }

      // Cancel any ongoing request
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const { signal } = abortController;

      setLoadingOwners(true);
      try {
        // Calculate which object indexes correspond to the current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageObjectIndexes = objectIndexes.slice(startIndex, endIndex);
        
        const objectsWithOwnerData = await Promise.all(
          objects.map(async (obj, index) => {
            if (!obj) return obj;

            const objectIndex = pageObjectIndexes[index];

            // For "My objects", always verify ownership to catch storage inconsistencies
            if (!showAll) {
              try {
                // @ts-expect-error - poscan is a custom RPC
                const rpcResult = await api.rpc.poscan.getPoscanObject(objectIndex);
                if (rpcResult?.owner) {
                  const actualOwner = rpcResult.owner;

                  // Only include if the actual owner matches selectedAccount
                  if (selectedAccount && actualOwner === selectedAccount) {
                    return { ...obj, owner: selectedAccount };
                  }
                  console.warn(
                    t("assets_objects.ownership_mismatch", {
                      index: objectIndex,
                      storageOwner: selectedAccount,
                      actualOwner,
                    })
                  );
                  return null; // Exclude this object
                }
              } catch (error) {
                console.warn(
                  t("assets_objects.failed_fetch_owner", {
                    index: objectIndex,
                  }),
                  error
                );
                // If we can't verify ownership for "My objects", exclude the object to be safe
                return null;
              }
            } else {
              // For "All objects", try to get owner data but don't exclude on failure
              try {
                // @ts-expect-error - poscan is a custom RPC
                const rpcResult = await api.rpc.poscan.getPoscanObject(objectIndex);
                if (rpcResult?.owner) {
                  return { ...obj, owner: rpcResult.owner };
                }
              } catch (error) {
                console.warn(
                  t("assets_objects.failed_fetch_owner", {
                    index: objectIndex,
                  }),
                  error
                );
                // For "All objects", keep the object even if we can't get owner data
              }
            }

            // Return the object as-is if no owner data could be fetched
            return obj;
          })
        );

        if (mounted && !signal.aborted) {
          setObjectsWithOwners(objectsWithOwnerData);
        }
      } catch (error) {
        console.error(t("assets_objects.failed_fetch_owner_data"), error);
        if (mounted && !signal.aborted) {
          setObjectsWithOwners(objects);
        }
      } finally {
        if (mounted && !signal.aborted) {
          setLoadingOwners(false);
        }
      }
    }

    fetchOwnerData();
    return () => {
      mounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [
    api,
    objects,
    objectIndexes,
    currentPage,
    itemsPerPage,
    isFetchingSpecificObject,
    showAll,
    selectedAccount,
    t,
  ]);

  // Fetch identity data for owners on current page only
  useEffect(() => {
    // Skip if we're fetching a specific object
    if (isFetchingSpecificObject) return;

    let mounted = true;
    let abortController: AbortController | null = null;
    
    async function fetchIdentityData() {
      if (!api || objectsWithOwners.length === 0) {
        setObjectsWithIdentities([]);
        setLoadingIdentities(false);
        return;
      }

      // Cancel any ongoing request
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const { signal } = abortController;

      setLoadingIdentities(true);
      try {
        const objectsWithIdentityData = await Promise.all(
          objectsWithOwners.map(async (obj) => {
            if (!obj?.owner) return obj;

            try {
              // Fetch identity information for the owner
              const owner = obj.owner as string;
              const accountInfo = await api.derive.accounts.info(owner);
              if (accountInfo.identity?.display) {
                return { ...obj, identity: accountInfo.identity.display };
              }
            } catch (error) {
              const owner = obj.owner as string;
              console.warn(
                t("assets_objects.failed_fetch_identity", { owner }),
                error
              );
            }
            return obj;
          })
        );

        if (mounted && !signal.aborted) {
          setObjectsWithIdentities(objectsWithIdentityData);
        }
      } catch (error) {
        console.error(t("assets_objects.failed_fetch_identity_data"), error);
        if (mounted && !signal.aborted) {
          setObjectsWithIdentities(objectsWithOwners);
        }
      } finally {
        if (mounted && !signal.aborted) {
          setLoadingIdentities(false);
        }
      }
    }

    fetchIdentityData();
    return () => {
      mounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [api, objectsWithOwners, isFetchingSpecificObject, t]);

  // Manage overall loading state
  useEffect(() => {
    const isAnyLoading =
      loadingIndexes || loadingObjects || loadingOwners || loadingIdentities;
    setLoading(isAnyLoading);
  }, [loadingIndexes, loadingObjects, loadingOwners, loadingIdentities]);

  // Add this handler above the return statement in the component
  const handleSuggestionKeyDown = useCallback(
    (suggestion: string, e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        createSuggestionClickHandler(suggestion)();
      }
    },
    [createSuggestionClickHandler]
  );

  // Helper function to check if object matches search term
  const matchesSearch = useCallback(
    (
      obj: Record<string, unknown>,
      originalIndex: number,
      searchTermLower: string
    ) => {
      return (
        // Index
        String(objectIndexes[originalIndex]).includes(searchTermLower) ||
        // Created block
        (obj.whenCreated && String(obj.whenCreated).includes(searchTermLower)) ||
        // Public/Private
        (searchTermLower === "public" && obj.isPrivate === false) ||
        (searchTermLower === "private" && obj.isPrivate === true) ||
        // Properties (by name or value)
        (Array.isArray(obj.prop) &&
          obj.prop.some(
            (p) =>
              p &&
              typeof p === "object" &&
              ((p.name &&
                String(p.name).toLowerCase().includes(searchTermLower)) ||
                (p.maxValue !== undefined &&
                  String(p.maxValue).includes(searchTermLower)))
          )) ||
        // Non-Fungible (by property name)
        (searchTermLower === "non-fungible" &&
          Array.isArray(obj.prop) &&
          obj.prop.some(
            (p) =>
              p &&
              typeof p === "object" &&
              p.name &&
              String(p.name).toLowerCase().includes("non-fungible")
          )) ||
        // State search
        (obj.state &&
          Object.keys(obj.state as Record<string, unknown>).some((stateKey) =>
            stateKey.toLowerCase().includes(searchTermLower)
          )) ||
        // Owner search
        (obj.owner &&
          String(obj.owner).toLowerCase().includes(searchTermLower)) ||
        // Identity search
        (obj.identity &&
          String(obj.identity).toLowerCase().includes(searchTermLower))
      );
    },
    [objectIndexes]
  );

  // Calculate pagination values - now we work with the total object count and current page objects
  const totalPages = Math.ceil(objectIndexes.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Filter current page objects based on search
  const filteredCurrentObjects = useMemo(() => {
    if (objectsWithIdentities.length === 0) return [];

    return objectsWithIdentities
      .map((obj, index) => ({ obj, index }))
      .filter(({ obj, index }) => {
        if (!obj) return false;
        // Always show if fetching a specific object
        if (isFetchingSpecificObject) return true;
        // Search filter
        if (!search.trim()) return true;

        const searchTermLower = search.trim().toLowerCase();

        // State-based searches (e.g., "Created objects", "Approved objects")
        if (searchTermLower.endsWith(" objects")) {
          const stateSearch = searchTermLower.replace(" objects", "");
          const allStates = [
            "created",
            "estimating",
            "estimated",
            "approving",
            "approved",
            "notApproved",
          ];
          const matchingState = allStates.find(
            (state) => getStateDisplayName(state).toLowerCase() === stateSearch
          );
          if (
            matchingState &&
            obj.state &&
            (obj.state as Record<string, unknown>)[matchingState] !== undefined
          ) {
            return true;
          }
        }

        // Calculate the actual object index for this page object
        const startIndex = (currentPage - 1) * itemsPerPage;
        const actualObjectIndex = objectIndexes[startIndex + index];
        return matchesSearch(obj, actualObjectIndex, searchTermLower);
      });
  }, [
    objectsWithIdentities,
    search,
    isFetchingSpecificObject,
    matchesSearch,
    getStateDisplayName,
    currentPage,
    itemsPerPage,
    objectIndexes,
  ]);

  return (
    <AssetsSection>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center mb-0">
          {t("assets_objects.title")}
          {loading ? (
            <Spinner size={16} className="ml-2" />
          ) : objCount !== null ? (
            <span className="ml-2">({objCount})</span>
          ) : (
            <span className="ml-2 text-gray-400">(–)</span>
          )}
        </h2>
        <div className="flex items-center gap-6">
          <Button
            icon="plus"
            intent="primary"
            className="mr-4"
            onClick={handleOpenDialog}
          >
            {t("assets_objects.new_object")}
          </Button>
          <Switch
            checked={showAll}
            label={
              showAll
                ? t("assets_objects.all_objects")
                : t("assets_objects.my_objects")
            }
            onChange={handleShowAllToggle}
          />
        </div>
      </div>
      <div className="mb-4">
        <div className="relative">
          <InputGroup
            leftIcon="search"
            placeholder={t("assets_objects.search_placeholder")}
            value={search}
            onChange={handleSearchChange}
            fill
          />
          {searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-b shadow-lg z-10 max-h-48 overflow-y-auto">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-600 last:border-b-0 text-gray-200"
                  onClick={createSuggestionClickHandler(suggestion)}
                  onKeyDown={(e) => handleSuggestionKeyDown(suggestion, e)}
                  aria-label={`Select suggestion: ${suggestion}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Show "Show all objects" button when viewing a single object */}
        {objCount === 1 && objectIndexes.length === 1 && (
          <div className="mt-2">
            <Button icon="list" minimal onClick={resetToAllObjects}>
              {t("assets_objects.show_all_objects")}
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
                    {!showAll
                      ? t("assets_objects.no_objects_found_account")
                      : t("assets_objects.no_objects_found")}
                  </div>
                </div>
              )}
              {filteredCurrentObjects.map(({ obj, index }) =>
                obj ? (
                  <ObjectCard
                    key={
                      (() => {
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const actualObjectIndex = objectIndexes[startIndex + index];
                        return actualObjectIndex !== undefined
                          ? `${actualObjectIndex}-${index}`
                          : index;
                      })()
                    }
                    objectIndex={(() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      return objectIndexes[startIndex + index];
                    })()}
                    objectData={obj}
                  />
                ) : null
              )}
            </div>
            <div className="flex justify-center mt-4">
              <Button
                icon="chevron-left"
                minimal
                onClick={handleLoadPrevious}
                disabled={!hasPreviousPage}
              />
              <span className="mx-4">
                {currentPage} / {totalPages}
              </span>
              <Button
                icon="chevron-right"
                minimal
                onClick={handleLoadNext}
                disabled={!hasNextPage}
              />
            </div>
            <DialogSubmitObject
              isOpen={isDialogOpen}
              onClose={handleCloseDialog}
            />
          </>
        )}
      </Card>
    </AssetsSection>
  );
}
