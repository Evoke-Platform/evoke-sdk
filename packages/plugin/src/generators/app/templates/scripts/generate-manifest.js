(async () => {
    const fs = require('fs');

    //1. Read from the "widgets" folder
    const folderName = 'src/widgets';
    const getWidgetProperties = async (widgetsList) => {
        const temp = [];
        console.log('');
        for await (const widget of widgetsList) {
            try {
                const widget_folder_path = folderName + '/' + widget;
                // eslint-disable-next-line node/no-unsupported-features/es-syntax
                let WidgetProperties = await import('../' + widget_folder_path + '/WidgetProperties.json', {
                    assert: { type: 'json' },
                });
                WidgetProperties.default.src = widget_folder_path;
                temp.push(WidgetProperties.default);
                console.info(WidgetProperties.default.name + ' widget -- READ');
            } catch (e) {
                if (e.code === 'ERR_MODULE_NOT_FOUND')
                    console.error(widget + ' widget -- WidgetProperties not defined.');
                else console.error('ERROR while reading properties for ' + widget + ':: ', e);
                continue;
            }
        }
        return temp;
    };
    try {
        let widgetsList = [];
        fs.accessSync(folderName, fs.constants.R_OK);
        widgetsList = fs.readdirSync(folderName).map((widget) => widget);
        let WidgetProperties = await getWidgetProperties(widgetsList);
        console.log('');
        const outputJSON = {
            name: '<%= projectName %>',
            description: '',
            widgets: WidgetProperties,
        };
        fs.writeFileSync('manifest.json', JSON.stringify(outputJSON, null, 2), 'utf-8', (err) => {
            if (err) console.error('Manifest generation error::', err);
        });
    } catch (error) {
        console.error('Error while generating manifest.json::', error);
    } finally {
        console.info('manifest.json created');
    }
})();
