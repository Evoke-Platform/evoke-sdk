// Sample MSW handlers for the Evoke data API. Container stories opt in via
// `parameters: { msw: { handlers: evokeHandlers } }` — replace these fixtures with
// shapes matching YOUR widget's object. Verify shapes against the installed types and
// live OpenAPI specs — these are dev fixtures, not contract tests.
//
// Browser-observed request map for common widget flows:
// - objectStore.get() -> GET /api/data/objects/:objectId/effective
// - objectStore.findInstances() -> GET /api/data/objects/:objectId/instances
// - objectStore.getInstance() -> GET /api/data/objects/:objectId/instances/:instanceId
// - FormRendererContainer object fetch -> GET /api/data/objects/:objectId/effective
// - FormRendererContainer form fetch -> GET /api/data/forms/:formId/effective
// - FormRendererContainer permission check -> GET .../checkAccess
// - create submit -> POST /api/data/objects/:objectId/instances/actions
// - update submit -> POST /api/data/objects/:objectId/instances/:instanceId/actions
//
// MSW intercepts at the network boundary only: stories render the real widget and the
// real SDK client. When the Storybook preview console warns about an unhandled
// request, add a handler for that exact path here. MSW matches the path without query
// strings, so mock `/api/data/objects/:objectId/instances` rather than trying to embed
// `?filter=...` in the handler path.
import { HttpResponse, http } from 'msw';

// Capture submissions so play functions can assert on what the widget actually sent.
// Call resetRequestLog() in each story's play function before interacting, so
// submissions from prior stories don't leak into assertions.
export const requestLog: { submissions: Array<{ path: string; body: unknown }> } = {
    submissions: [],
};

export function resetRequestLog() {
    requestLog.submissions.length = 0;
}

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

const sampleInstance = {
    id: 'instance-1',
    objectId: 'inspection',
    name: 'Created Instance',
    location: 'HQ',
};

export const evokeHandlers = [
    http.get('/api/data/objects/:objectId/effective', () => HttpResponse.json(sampleObject)),
    http.get('/api/data/objects/:objectId/instances', () => HttpResponse.json([sampleInstance])),
    http.get('/api/data/objects/:objectId/instances/:instanceId', ({ params }) =>
        HttpResponse.json({ ...sampleInstance, id: params.instanceId ?? sampleInstance.id }),
    ),
    http.get('/api/data/forms/:formId/effective', () => HttpResponse.json(sampleForm)),
    http.get(/\/checkAccess$/, () => HttpResponse.json({ result: true })),
    http.post('/api/data/objects/:objectId/instances/actions', async ({ request }) => {
        const body = await request.json();
        requestLog.submissions.push({
            path: '/api/data/objects/:objectId/instances/actions',
            body,
        });

        return HttpResponse.json({
            id: sampleInstance.id,
            objectId: 'inspection',
            name: 'Created Instance',
            ...(typeof body === 'object' && body && 'input' in body ? (body as { input: object }).input : {}),
        });
    }),
    http.post('/api/data/objects/:objectId/instances/:instanceId/actions', async ({ params, request }) => {
        const body = await request.json();
        requestLog.submissions.push({
            path: '/api/data/objects/:objectId/instances/:instanceId/actions',
            body,
        });

        return HttpResponse.json({
            ...sampleInstance,
            id: params.instanceId ?? sampleInstance.id,
            ...(typeof body === 'object' && body && 'input' in body ? (body as { input: object }).input : {}),
        });
    }),
];
