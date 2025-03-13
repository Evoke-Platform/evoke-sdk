import { ExpandedProperty, Obj, Property, PROPERTY_TYPES, PropertyType, TaskObj } from '../objects';

// Move the mutateTaskObj function here
export function mutateTaskObj(obj: Pick<Obj, 'id' | 'properties'> | Obj): void {
    if (obj.id !== 'sys__task') {
        return;
    }

    const taskObj = obj as TaskObj;

    taskObj.properties = taskObj.properties?.filter(
        ({ id }) => id !== 'closingEvents' && id !== 'userPool',
    ) as TaskObj['properties'];
}

// Move the flattenProperties function here
export const flattenProperties = (properties: ExpandedProperty[]): ExpandedProperty[] => {
    return properties.reduce((acc: ExpandedProperty[], prop) => {
        if (prop.type === 'user') {
            acc.push(
                {
                    id: `${prop.id}.id`,
                    name: `${prop.name} ID`,
                    type: 'string',
                },
                {
                    id: `${prop.id}.name`,
                    name: `${prop.name} Name`,
                    type: 'string',
                },
            );
        } else if (prop.type === 'address') {
            const addressFieldNames: { [key: string]: string } = {
                line1: 'Line 1',
                line2: 'Line 2',
                city: 'City',
                state: 'State',
                zipCode: 'Zip Code',
                county: 'County',
            };

            const addressProps = Object.entries(addressFieldNames).map(([field, displayName]) => ({
                id: `${prop.id}.${field}`,
                name: `${prop.name} ${displayName}`,
                type: PROPERTY_TYPES.string,
            }));
            acc.push(...addressProps);
        } else if (prop.type === 'object') {
            acc.push({
                ...prop,
                id: prop.id,
                children: [{ id: `${prop.id}-loading`, name: 'Loading...', type: 'loading' as PropertyType }],
            });
        } else {
            acc.push({
                ...prop,
                id: prop.id,
            });
        }
        return acc;
    }, []);
};

// Move the getPrefixedUrl function here
export function getPrefixedUrl(url: string) {
    const wcsMatchers = ['/apps', '/pages', '/widgets', '/logo'];
    const dataMatchers = ['/objects', '/instances', '/reports'];
    const accessManagementMatchers = ['/users', '/roles'];
    const adminMatchers = ['/tenant'];

    if (wcsMatchers.some((endpoint) => url.startsWith(endpoint))) return `/webContent${url}`;
    if (dataMatchers.some((endpoint) => url.startsWith(endpoint))) return `/data${url}`;
    if (accessManagementMatchers.some((endpoint) => url.startsWith(endpoint))) return `/accessManagement${url}`;
    if (adminMatchers.some((endpoint) => url.startsWith(endpoint))) return `/admin${url}`;

    return url;
}

/**
 * Traverses a property path within an object hierarchy to retrieve detailed property information.
 *
 * @param {string} propertyPath - The dot-separated path of the property to traverse.
 * @param {Obj} rootObject - The root object from which to start the traversal.
 * @param {FetchObjectFunction} fetchObject - A function to fetch an object by its ID.
 * @returns {Promise<ObjectProperty | null>} A promise that resolves to an ObjectProperty if found, or null otherwise.
 */
export const traversePropertyPath = async (
    propertyPath: string,
    rootObject: Obj,
    fetchObject: (objectId: string) => Promise<Obj | undefined>,
): Promise<Property | null> => {
    const segments = propertyPath.split('.');
    let currentObject = rootObject;
    let fullPath = '';
    let namePath = '';

    for (let i = 0; i < segments.length; i++) {
        const remainingPath = segments.slice(i).join('.');

        let prop = currentObject.properties?.find((p) => p.id === remainingPath);
        if (prop) {
            // flattened address or user properties
            fullPath = fullPath ? `${fullPath}.${remainingPath}` : remainingPath;
            namePath = namePath ? `${namePath} / ${prop.name}` : prop.name;
            return {
                ...prop,
                id: fullPath,
                name: namePath,
            };
        } else {
            prop = currentObject.properties?.find((p) => p.id === segments[i]);
            if (!prop) {
                return null;
            }

            fullPath = fullPath ? `${fullPath}.${prop.id}` : prop.id;
            namePath = namePath ? `${namePath} / ${prop.name}` : prop.name;

            if (i === segments.length - 1) {
                return {
                    ...prop,
                    id: fullPath,
                    name: namePath,
                };
            }

            if (prop.type === 'object' && prop.objectId) {
                const fetchedObject = await fetchObject(prop.objectId);
                if (fetchedObject) {
                    currentObject = fetchedObject;
                } else {
                    return null;
                }
            }
        }
    }

    return null;
};
