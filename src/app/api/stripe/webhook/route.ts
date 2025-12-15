import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'

// Use dummy key if not set (for development)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy'

const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-11-17.clover'
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.text()
        const signature = (await headers()).get('stripe-signature')!

        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err) {
            console.error('Webhook signature verification failed:', err)
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            )
        }

        // Handle payment intent succeeded
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent

            // Get order ID from metadata
            const orderId = paymentIntent.metadata.orderId

            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        paymentStatus: 'COMPLETED',
                        status: 'COMPLETED'
                    }
                })
            }
        }

        // Handle payment intent failed
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            const orderId = paymentIntent.metadata.orderId

            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        paymentStatus: 'FAILED'
                    }
                })
            }
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}
