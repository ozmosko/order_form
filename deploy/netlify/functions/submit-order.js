// Serverless proxy: receives order submissions from the browser and forwards
// them to Make.com. The webhook URL never leaves the server.
//
// Required env var (set in Netlify dashboard → Site settings → Environment variables):
//   MAKE_WEBHOOK_URL = https://hook.eu2.make.com/...

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('MAKE_WEBHOOK_URL environment variable is not set');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server misconfiguration' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error(`Make webhook responded with ${response.status}`);
            return { statusCode: 502, body: JSON.stringify({ error: 'Upstream error' }) };
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
        console.error('Failed to reach Make webhook:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to reach webhook' }) };
    }
};
