import { ParamsSerializerOptions } from 'axios';

export function paramsSerializer(params: Record<string, unknown>, options?: ParamsSerializerOptions) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
    }

    return searchParams.toString();
}
