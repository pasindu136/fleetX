module.exports = async function handler(req, res) {
    // Enable CORS for frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { booking } = req.body || {};
    if (!booking || !booking.user_email) {
        return res.status(400).json({ success: false, error: 'Missing booking details or passenger email' });
    }

    const RESEND_API_KEY = 're_LCHt2fDi_8mRbBmfnuQCm46HWnc4KykSx';
    const passengerEmail = booking.user_email;
    const fareFormatted = parseFloat(booking.fare || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d0d; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #ffcc00; margin: 0; font-size: 28px; letter-spacing: 2px;">FLEET X</h1>
                <p style="color: #888; font-size: 12px; text-transform: uppercase; margin-top: 5px;">Premium Passenger Transit &middot; Sri Lanka</p>
            </div>
            <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #00e676; margin-bottom: 25px;">
                <h2 style="color: #00e676; margin: 0 0 10px 0; font-size: 20px;">Ride Dispatched &amp; Confirmed!</h2>
                <p style="margin: 0; color: #ccc; font-size: 14px; line-height: 1.5;">Your dispatch request <b>#${booking.id}</b> has been approved by executive administration. Your chauffeur vehicle is en route.</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #262626;">
                    <td style="padding: 12px 0; color: #888;">Service Tier</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #ffcc00;">${booking.service || 'City Ride'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #262626;">
                    <td style="padding: 12px 0; color: #888;">Pickup Vector</td>
                    <td style="padding: 12px 0; text-align: right; color: #fff;">${booking.pickup || '—'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #262626;">
                    <td style="padding: 12px 0; color: #888;">Drop Vector</td>
                    <td style="padding: 12px 0; text-align: right; color: #fff;">${booking.drop || '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #888;">Guaranteed Tariff</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #00e676;">LKR ${fareFormatted}</td>
                </tr>
            </table>
            <div style="text-align: center; border-top: 1px solid #262626; padding-top: 20px; font-size: 12px; color: #666;">
                <p style="margin: 0;">24/7 Operations Terminal: +94 11 234 5678 | ops@fleetx.lk</p>
                <p style="margin: 5px 0 0 0;">&copy; 2026 FleetX Mobility Technologies.</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + RESEND_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'FleetX Dispatch <dispatch@bitsync.site>',
                to: [passengerEmail],
                subject: 'Ride Confirmed (#' + booking.id + ') — FleetX Dispatch',
                html: emailHtml
            })
        });

        const data = await response.json();
        if (response.ok) {
            return res.status(200).json({ success: true, data });
        } else {
            console.error('Resend API Error:', data);
            return res.status(400).json({ success: false, error: data });
        }
    } catch (err) {
        console.error('Server Fetch Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
