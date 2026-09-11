// Sends an outbound WhatsApp message via the Infobip API.
// Never throws — a notification failure must never block a sale. Configure via
// INFOBIP_BASE_URL, INFOBIP_API_KEY, INFOBIP_WHATSAPP_FROM and WHATSAPP_OWNER_NUMBER;
// if any are missing, this silently no-ops (useful for local dev without Infobip set up).
export async function sendWhatsAppMessage(body: string) {
    const baseUrl = process.env.INFOBIP_BASE_URL
    const apiKey = process.env.INFOBIP_API_KEY
    const from = process.env.INFOBIP_WHATSAPP_FROM
    const to = process.env.WHATSAPP_OWNER_NUMBER

    if (!baseUrl || !apiKey || !from || !to) {
        console.log('WhatsApp notification skipped: Infobip env vars not configured')
        return
    }

    // Infobip expects phone numbers as digits only (no "+", no "whatsapp:" prefix)
    const normalize = (num: string) => num.replace(/\D/g, '')

    try {
        const response = await fetch(`https://${baseUrl}/whatsapp/1/message/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `App ${apiKey}`
            },
            body: JSON.stringify({
                from: normalize(from),
                to: normalize(to),
                content: { text: body }
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('WhatsApp notification failed:', response.status, error)
        }
    } catch (error) {
        console.error('WhatsApp notification error:', error)
    }
}
