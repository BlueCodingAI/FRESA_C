import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("Processing checkout.session.completed for session:", session.id);
      console.log("Session metadata:", session.metadata);
      console.log("Client reference ID:", session.client_reference_id);
      
      // Try to find payment by session ID first
      let payment = await prisma.certificatePayment.findFirst({
        where: {
          stripePaymentId: session.id,
        },
      });

      // If not found by session ID, try to find by user ID from metadata or client_reference_id
      if (!payment && (session.metadata?.userId || session.client_reference_id)) {
        const userId = session.metadata?.userId || session.client_reference_id;
        payment = await prisma.certificatePayment.findFirst({
          where: {
            userId: userId as string,
            status: "pending",
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }

      if (payment) {
        // Update payment status to completed
        await prisma.certificatePayment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            stripePaymentId: session.id, // Ensure session ID is saved
          },
        });

        console.log("✅ Payment marked as completed:", {
          paymentId: payment.id,
          userId: payment.userId,
          sessionId: session.id,
        });
      } else {
        // If payment record doesn't exist, create one
        const userId = session.metadata?.userId || session.client_reference_id;
        if (userId) {
          await prisma.certificatePayment.create({
            data: {
              userId: userId as string,
              stripePaymentId: session.id,
              amount: session.amount_total || 20000,
              status: "completed",
            },
          });
          console.log("✅ Created new payment record for session:", session.id);
        } else {
          console.error("❌ No user ID found in session metadata or client_reference_id");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}

