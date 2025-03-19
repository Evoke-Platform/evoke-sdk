import React, { createContext, useRef } from 'react';
import { useApiServices } from '../api';
import { Obj, PROPERTY_TYPES } from '../objects';
import { flattenProperties, getPrefixedUrl, mutateTaskObj } from '../objects/utils';

export type ObjectCacheContextType = {
    /**
     * Fetches and caches object data by ID
     * - Returns cached object if already fetched
     * - Fetches from API if not in cache
     * - Persists in a ref-based Map without triggering re-renders
     * - Sorts the object properties alphabetically by name
     * @param objectId - ID of the object to fetch
     * @returns Promise resolving to object or undefined if an error occurs
     */
    fetchObject: (objectId: string) => Promise<Obj | undefined>;
};

export const ObjectCacheContext = createContext<ObjectCacheContextType>({
    fetchObject: async (objectId: string) => {
        console.warn('fetchObject called before Provider was initialized');
        return undefined;
    },
});

/**
 * - Provides a context for fetching and caching objects by ID
 */
export const ObjectCacheProvider = ({ children }: { children: React.ReactNode }) => {
    const objectCacheRef = useRef<Map<string, Obj | Promise<Obj | undefined>>>(new Map());
    const api = useApiServices();

    const fetchObject = async (objectId: string): Promise<Obj | undefined> => {
        const cachedValue = objectCacheRef.current.get(objectId);

        if (cachedValue) {
            return cachedValue;
        }

        const fetchPromise = api
            .get<Obj>(getPrefixedUrl(`/objects/${objectId}/effective`), {
                params: { filter: { fields: ['id', 'name', 'properties'] } },
            })
            .then((object) => {
                mutateTaskObj(object);

                // add id prop
                const instanceProperty = { id: 'id', name: 'ID', type: PROPERTY_TYPES.string, required: true };

                // Alphabetize, and flatten properties
                const processedObject: Obj = {
                    ...object,
                    properties: flattenProperties(
                        [...(object.properties ?? []), instanceProperty].sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
                        ),
                    ),
                };
                objectCacheRef.current.set(objectId, processedObject);
                return processedObject;
            })
            .catch((error) => {
                console.error('Error fetching object:', error);
                // remove promise if error occurred
                objectCacheRef.current.delete(objectId);
                return undefined;
            });

        objectCacheRef.current.set(objectId, fetchPromise);
        return fetchPromise;
    };

    return <ObjectCacheContext.Provider value={{ fetchObject }}>{children}</ObjectCacheContext.Provider>;
};
