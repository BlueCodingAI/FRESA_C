import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Check Stripe session status
    console.log("Retrieving Stripe session:", sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Stripe session details:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      client_reference_id: session.client_reference_id,
      metadata: session.metadata,
    });

    if (session.payment_status === "paid" || session.status === "complete") {
      // Find or create payment record
      let payment = await prisma.certificatePayment.findFirst({
        where: {
          stripePaymentId: sessionId,
        },
      });

      console.log("Existing payment record:", payment);

      if (!payment) {
        // Create payment record if it doesn't exist
        // Use userId from metadata or client_reference_id, or from token
        const userId = session.metadata?.userId || session.client_reference_id || decoded.id;
        
        console.log("Creating new payment record for userId:", userId);
        payment = await prisma.certificatePayment.create({
          data: {
            userId: userId as string,
            stripePaymentId: sessionId,
            amount: session.amount_total || 20000,
            status: "completed",
          },
        });
        console.log("Created payment record:", payment);
      } else if (payment.status !== "completed") {
        // Update status if not already completed
        console.log("Updating payment status to completed");
        payment = await prisma.certificatePayment.update({
          where: { id: payment.id },
          data: { status: "completed" },
        });
        console.log("Updated payment record:", payment);
      }

      return NextResponse.json({ 
        success: true, 
        payment: {
          id: payment.id,
          status: payment.status,
          pdfDownloaded: payment.pdfDownloaded,
        }
      });
    }

    console.log("Payment not completed. Session status:", session.payment_status);
    return NextResponse.json({ 
      success: false, 
      message: "Payment not completed",
      payment_status: session.payment_status,
      session_status: session.status,
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}

