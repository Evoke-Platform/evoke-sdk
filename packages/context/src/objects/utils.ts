import { Obj, Property, TaskObj } from './objects.js';

export function mutateTaskObj(obj: Pick<Obj, 'id' | 'properties'> | Obj): void {
    if (obj.id !== 'sys__task') {
        return;
    }

    const taskObj = obj as TaskObj;

    taskObj.properties = taskObj.properties?.filter(
        ({ id }) => id !== 'closingEvents' && id !== 'userPool',
    ) as TaskObj['properties'];
}

export const flattenProperties = (properties: Property[]): Property[] => {
    return properties.reduce((acc: Property[], prop) => {
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

            const addressProps = Object.entries(addressFieldNames).map(
                ([field, displayName]) =>
                    ({
                        id: `${prop.id}.${field}`,
                        name: `${prop.name} ${displayName}`,
                        type: 'string',
                    }) as Property,
            );
            acc.push(...addressProps);
        } else if (prop.type === 'object') {
            acc.push({
                ...prop,
                id: prop.id,
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
