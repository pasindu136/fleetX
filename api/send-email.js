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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a1a; padding: 35px; border-radius: 12px; border: 1px solid #e5e5e5;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111111; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">FLEETX</h1>
                <p style="color: #666666; font-size: 13px; margin-top: 4px;">Official Ride Confirmation</p>
            </div>
            <div style="background: #f8f9fa; padding: 22px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 28px;">
                <h2 style="color: #065f46; margin: 0 0 8px 0; font-size: 18px;">Driver Assigned &amp; Dispatched</h2>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Your ride reservation <b>#${booking.id}</b> has been confirmed. Your driver is en route to the pickup location.</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 14px 0; color: #6b7280;">Service Class</td>
                    <td style="padding: 14px 0; text-align: right; font-weight: 600; color: #111827;">${booking.service || 'City Ride'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 14px 0; color: #6b7280;">Pickup Location</td>
                    <td style="padding: 14px 0; text-align: right; color: #111827; font-weight: 500;">${booking.pickup || '—'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 14px 0; color: #6b7280;">Drop-off Location</td>
                    <td style="padding: 14px 0; text-align: right; color: #111827; font-weight: 500;">${booking.drop || '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 16px 0; color: #374151; font-weight: 600;">Total Fare</td>
                    <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">LKR ${fareFormatted}</td>
                </tr>
            </table>
            <div style="text-align: center; border-top: 1px solid #e5e5e5; padding-top: 24px; font-size: 12px; color: #6b7280; line-height: 1.6;">
                <p style="margin: 0;">Need assistance? Reply directly to this email or contact our support desk.</p>
                <p style="margin: 4px 0 0 0;">Support Desk: ops@bitsync.site | +94 11 234 5678</p>
                <p style="margin: 12px 0 0 0; color: #9ca3af;">&copy; 2026 FleetX Transit Infrastructure. All rights reserved.</p>
            </div>
        </div>
    `;

    const textContent = `FLEETX - RIDE CONFIRMATION\n\nReservation #${booking.id} Confirmed\n\nService Class: ${booking.service || 'City Ride'}\nPickup Location: ${booking.pickup || '—'}\nDrop-off Location: ${booking.drop || '—'}\nTotal Fare: LKR ${fareFormatted}\n\nSupport Desk: ops@bitsync.site | +94 11 234 5678`;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + RESEND_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'FleetX Dispatch <dispatch@bitsync.site>',
                reply_to: 'ops@bitsync.site',
                to: [passengerEmail],
                subject: `FleetX Ride Confirmation #${booking.id}`,
                text: textContent,
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
