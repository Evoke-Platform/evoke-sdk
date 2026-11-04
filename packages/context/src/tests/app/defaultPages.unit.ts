// Copyright (c) 2026 System Automation Corporation.
// This file is licensed under the MIT License.

import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import { getDefaultPageAppsUrl } from '../../app/index.js';

chai.use(dirtyChai);

describe('getDefaultPageAppsUrl', () => {
    it('returns `undefined` when every default page is in the current app', () => {
        const url = getDefaultPageAppsUrl({
            id: 'tasks',
            defaultPages: { task: '/tasks/task/:instanceId', note: 'note/:instanceId', draft: '' },
        });

        expect(url).to.be.undefined();
    });

    it('returns `undefined` when the app has no default pages', () => {
        expect(getDefaultPageAppsUrl({ id: 'tasks' })).to.be.undefined();
    });

    it('asks for each other app once, sorted, with page summaries', () => {
        const url = getDefaultPageAppsUrl({
            id: 'tasks',
            defaultPages: {
                permit: '/permits/permit/:instanceId',
                license: '/licensing/license/:instanceId',
                renewal: '/licensing/renewal/:instanceId',
                task: '/tasks/task/:instanceId',
            },
        });

        expect(url).to.equal(
            'webContent/apps?pages=summary' +
                '&filter=%7B%22where%22%3A%7B%22id%22%3A%7B%22inq%22%3A%5B%22licensing%22%2C%22permits%22%5D%7D%7D%7D',
        );
    });
});
