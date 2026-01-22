import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit, canDelete } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = verifyToken(token)
    if (!user || !canEdit(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const students = await prisma.user.findMany({
      where: { role: 'Student' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ students })
  } catch (e) {
    console.error('[admin/students GET] error:', e)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = verifyToken(token)
    if (!user || !canDelete(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const id = (body?.id || '').toString()
    if (!id) return NextResponse.json({ error: 'Student id is required' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    if (target.role !== 'Student') return NextResponse.json({ error: 'Only students can be deleted here' }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/students DELETE] error:', e)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}


