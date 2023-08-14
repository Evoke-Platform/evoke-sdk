// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

type BaseType = {
    base: string;
};

type PropsType = BaseType & {
    textProperty: string;
};

/** @widget */
function PropsIntersectionType(props: PropsType) {
    return null;
}

export default PropsIntersectionType;
