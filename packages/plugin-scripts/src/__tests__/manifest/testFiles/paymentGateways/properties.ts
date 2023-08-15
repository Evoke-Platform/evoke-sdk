// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type GatewayProperties = {
    text: string;
    num?: number;
};

/**
 * @paymentGateway
 */
export class TestGatewayProperties {
    constructor(props: GatewayProperties) {}
}
