import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const payment = await prisma.certificatePayment.findFirst({
      where: {
        userId: decoded.id,
        status: "completed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (payment && !payment.pdfDownloaded) {
      await prisma.certificatePayment.update({
        where: { id: payment.id },
        data: { pdfDownloaded: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking as downloaded:", error);
    return NextResponse.json(
      { error: "Failed to update download status" },
      { status: 500 }
    );
  }
}

