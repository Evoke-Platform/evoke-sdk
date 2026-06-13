// Sample MSW handlers for the Evoke data API. Container stories opt in via
// `parameters: { msw: { handlers: evokeHandlers } }` — replace these fixtures with
// shapes matching YOUR widget's object. Verify shapes against the installed types
// (node_modules/@evoke-platform/context/dist/objects/objects.d.ts) — these are dev
// fixtures, not contract tests; the real API is the source of truth.
//
// MSW intercepts at the network boundary only: stories render the real widget and the
// real SDK client. When the Storybook preview console warns about an unhandled
// request, add a handler for that exact path here.
import { HttpResponse, http } from 'msw';

// Capture submissions so play functions can assert on what the widget actually sent.
export const requestLog: { submissions: unknown[] } = {
    submissions: [],
};

const sampleObject = {
    id: 'inspection',
    name: 'Inspection',
    rootObjectId: 'inspection',
    properties: [
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'location', name: 'Location', type: 'string' },
    ],
    actions: [
        {
            id: 'createInspection',
            name: 'Create Inspection',
            type: 'create',
            outputEvent: 'Inspection Created',
            parameters: [
                { id: 'name', name: 'Name', type: 'string', required: true },
                { id: 'location', name: 'Location', type: 'string' },
            ],
        },
    ],
};

const sampleForm = {
    id: 'inspection-intake-form',
    name: 'Inspection Intake',
    objectId: 'inspection',
    actionId: 'createInspection',
    display: {
        submitLabel: 'Submit Intake',
    },
    entries: [
        { parameterId: 'name', type: 'input', display: { label: 'Name' } },
        { parameterId: 'location', type: 'input', display: { label: 'Location' } },
    ],
};

export const evokeHandlers = [
    http.get('/api/data/objects/:objectId/effective', () => HttpResponse.json(sampleObject)),
    http.get('/api/data/forms/:formId/effective', () => HttpResponse.json(sampleForm)),
    http.post('/api/data/objects/:objectId/instances/actions', async ({ request }) => {
        const body = await request.json();
        requestLog.submissions.push(body);

        return HttpResponse.json({
            id: 'instance-1',
            objectId: 'inspection',
            name: 'Created Instance',
            ...(typeof body === 'object' && body && 'input' in body ? (body as { input: object }).input : {}),
        });
    }),
];
