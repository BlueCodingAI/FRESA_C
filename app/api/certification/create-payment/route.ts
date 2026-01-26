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
    // Check if prisma is available
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 }
      );
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has already paid
    // Check if certificatePayment model exists
    if (!prisma.certificatePayment) {
      console.error("CertificatePayment model not found in Prisma client. Please run: npx prisma generate");
      return NextResponse.json(
        { error: "Certificate payment feature is not available. Please contact support." },
        { status: 500 }
      );
    }

    const existingPayment = await prisma.certificatePayment.findFirst({
      where: {
        userId: user.id,
        status: "completed",
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "You have already purchased the certificate" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Florida Real Estate Course - Certificate",
              description: "Official PDF Certificate of Completion",
            },
            unit_amount: 20000, // $200.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/certification?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/certification?payment=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        userName: user.name,
      },
    });

    // Create payment record
    await prisma.certificatePayment.create({
      data: {
        userId: user.id,
        stripePaymentId: session.id,
        amount: 20000,
        status: "pending",
      },
    });

    // Return the checkout URL instead of sessionId
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating payment session:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Check if it's a Prisma model error
    if (error.message?.includes("findFirst") || error.message?.includes("certificatePayment")) {
      return NextResponse.json(
        { 
          error: "Database model not found. Please restart the development server after running: npx prisma generate",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create payment session" },
      { status: 500 }
    );
  }
}

