import { ParamsSerializerOptions } from 'axios';

export function paramsSerializer(params: Record<string, unknown>, options?: ParamsSerializerOptions) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (!validateParamKey(key) || !validateParamValue(value)) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                searchParams.append(key, typeof item !== 'string' ? JSON.stringify(item) : item);
            }
        } else {
            searchParams.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }
    }

    return searchParams.toString();
}

function validateParamKey(item: string) {
    return item.length;
}

function validateParamValue(item?: unknown) {
    return item !== undefined;
}
