// Sends an outbound WhatsApp message via the Twilio REST API.
// Never throws — a notification failure must never block a sale. Configure via
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM and WHATSAPP_OWNER_NUMBER;
// if any are missing, this silently no-ops (useful for local dev without Twilio set up).
export async function sendWhatsAppMessage(body: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM
    const to = process.env.WHATSAPP_OWNER_NUMBER

    if (!accountSid || !authToken || !from || !to) {
        console.log('WhatsApp notification skipped: Twilio env vars not configured')
        return
    }

    try {
        const params = new URLSearchParams({
            From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
            To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
            Body: body
        })

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
                },
                body: params
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error('WhatsApp notification failed:', response.status, error)
        }
    } catch (error) {
        console.error('WhatsApp notification error:', error)
    }
}
