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

    const { booking, status } = req.body || {};
    if (!booking) {
        return res.status(400).json({ success: false, error: 'Missing booking details' });
    }

    const RESEND_API_KEY = 're_LCHt2fDi_8mRbBmfnuQCm46HWnc4KykSx';
    const SMS_API_TOKEN = '585|qUoYlvu9KBpRefBdBJYw7BL14dPcTaVbVzctQEPY';

    const passengerEmail = booking.user_email;
    const fareFormatted = parseFloat(booking.fare || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const isRejected = status === 'rejected';

    // ── 1. PREPARE EMAIL CONTENT ──────────────────────────────────
    let emailHtml = '';
    let emailSubject = '';
    let textContent = '';

    if (isRejected) {
        emailSubject = `FleetX Ride Request #${booking.id} Notice`;
        emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a1a; padding: 35px; border-radius: 12px; border: 1px solid #e5e5e5;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #111111; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">FLEETX</h1>
                    <p style="color: #666666; font-size: 13px; margin-top: 4px;">Reservation Status Update</p>
                </div>
                <div style="background: #fef2f2; padding: 22px; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 28px;">
                    <h2 style="color: #991b1b; margin: 0 0 8px 0; font-size: 18px;">Dispatch Notice</h2>
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">We regret to inform you that ride reservation <b>#${booking.id}</b> could not be dispatched at this time due to high vehicle demand.</p>
                </div>
                <div style="text-align: center; border-top: 1px solid #e5e5e5; padding-top: 24px; font-size: 12px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0;">Support Desk: ops@bitsync.site | +94 11 234 5678</p>
                    <p style="margin: 12px 0 0 0; color: #9ca3af;">&copy; 2026 FleetX Transit Infrastructure.</p>
                </div>
            </div>
        `;
        textContent = `FLEETX NOTICE\n\nReservation #${booking.id} could not be confirmed due to high vehicle demand.\n\nSupport Desk: ops@bitsync.site | +94 11 234 5678`;
    } else {
        emailSubject = `FleetX Ride Confirmation #${booking.id}`;
        emailHtml = `
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
                    <p style="margin: 12px 0 0 0; color: #9ca3af;">&copy; 2026 FleetX Transit Infrastructure.</p>
                </div>
            </div>
        `;
        textContent = `FLEETX - RIDE CONFIRMATION\n\nReservation #${booking.id} Confirmed\n\nService Class: ${booking.service || 'City Ride'}\nPickup Location: ${booking.pickup || '—'}\nDrop-off Location: ${booking.drop || '—'}\nTotal Fare: LKR ${fareFormatted}\n\nSupport Desk: ops@bitsync.site | +94 11 234 5678`;
    }

    // ── 2. EXTRACT PHONE NUMBER FOR SMSAPI.LK ─────────────────────
    let rawPhone = booking.user_phone || '';
    if (!rawPhone && booking.pickup) {
        const telMatch = booking.pickup.match(/\[Tel:\s*([+0-9\s-]+)\]/i);
        if (telMatch && telMatch[1]) rawPhone = telMatch[1];
    }

    let smsRecipient = null;
    if (rawPhone) {
        let digits = rawPhone.replace(/\D/g, '');
        if (digits.startsWith('0') && digits.length === 10) digits = '94' + digits.substring(1);
        if (digits.length === 9) digits = '94' + digits;
        if (digits.startsWith('94') && digits.length === 11) smsRecipient = digits;
    }

    const smsText = isRejected
        ? `FleetX Alert: Ride #${booking.id} could not be confirmed due to high fleet demand. Help: 0112345678`
        : `FleetX Confirmed: Ride #${booking.id} (${booking.service || 'City Ride'}) is dispatched. Driver en route. Help: 0112345678`;

    let emailResult = null;
    let smsResult = null;

    // ── 3. DISPATCH EMAIL VIA RESEND ──────────────────────────────
    if (passengerEmail) {
        try {
            const emailResp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + RESEND_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'FleetX Dispatch <dispatch@bitsync.site>',
                    reply_to: 'ops@bitsync.site',
                    to: [passengerEmail],
                    subject: emailSubject,
                    text: textContent,
                    html: emailHtml
                })
            });
            emailResult = await emailResp.json();
        } catch (eErr) {
            console.error('Email send failure:', eErr);
        }
    }

    // ── 4. DISPATCH SMS VIA SMSAPI.LK ─────────────────────────────
    if (smsRecipient) {
        const smsPayload = {
            recipient: smsRecipient,
            sender_id: 'SMSAPI Demo',
            type: 'plain',
            message: smsText
        };

        try {
            const smsResp = await fetch('https://dashboard.smsapi.lk/api/v3/sms/send', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + SMS_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(smsPayload)
            });
            smsResult = await smsResp.json();
            console.log('SMSAPI response:', smsResult);
        } catch (sErr) {
            console.error('SMS send failure:', sErr);
            smsResult = { error: sErr.message };
        }
    }

    return res.status(200).json({
        success: true,
        dispatched: {
            email: emailResult ? true : false,
            sms: smsResult ? true : false,
            sms_recipient: smsRecipient
        },
        data: { emailResult, smsResult }
    });
};
