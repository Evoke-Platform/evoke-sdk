#!/usr/bin/env node

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

const path = require('path');
const packageJson = require(path.resolve(process.cwd(), './package.json'));
const { Scanner } = require('../dist');

(async () => {
    const scanner = new Scanner('src', { defaultVersion: packageJson.version });
    const { widgets, paymentGateways } = await scanner.scan();

    const fs = require('fs');

    //1. Read from the "widgets" folder
    const folderName = path.resolve(process.cwd(), 'src/widgets');
    const getWidgetProperties = async (widgetsList) => {
        console.log('');
        for (const widget of widgetsList) {
            try {
                const widget_folder_path = path.join(folderName, widget);
                const WidgetProperties = require(`${widget_folder_path}/WidgetProperties.json`);

                if (!WidgetProperties.id) {
                    console.error(`Missing widget id in ${widget_folder_path}/WidgetProperties.json`);

                    continue;
                }

                WidgetProperties.src = 'src/widgets/' + widget;

                widgets[WidgetProperties.id] = WidgetProperties;

                console.info(WidgetProperties.name + ' widget -- READ');
            } catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND') {
                    console.error('ERROR while reading properties for ' + widget + ':: ', e);
                }
            }
        }
    };

    try {
        let widgetsList = [];
        fs.accessSync(folderName, fs.constants.R_OK);
        widgetsList = fs.readdirSync(folderName).map((widget) => widget);
        await getWidgetProperties(widgetsList);
        console.log('');
        const outputJSON = {
            name: packageJson.name,
            description: '',
            widgets: Object.values(widgets),
            paymentGateways: Object.values(paymentGateways),
        };
        if (!fs.existsSync('./dist')) {
            fs.mkdirSync('./dist');
        }
        fs.writeFileSync('./dist/manifest.json', JSON.stringify(outputJSON, null, 2), 'utf-8', (err) => {
            if (err) console.error('Manifest generation error::', err);
        });

        console.info('manifest.json created');
    } catch (error) {
        console.error('Error while generating manifest.json::', error);
    }
})();
