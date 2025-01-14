import { ParamsSerializerOptions } from 'axios';
import _ from 'lodash';

export function paramsSerializer(params: Record<string, unknown>, options?: ParamsSerializerOptions) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (!validateParamKey(key) || !validateParamValue(value)) {
            continue;
        }

        searchParams.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
    }

    return searchParams.toString();
}

function validateParamKey(item?: string) {
    return !_.isNil(item) && !_.isUndefined(item) && !(_.isString(item) && _.isEmpty(item));
}

function validateParamValue(item?: unknown) {
    return !_.isUndefined(item);
}
