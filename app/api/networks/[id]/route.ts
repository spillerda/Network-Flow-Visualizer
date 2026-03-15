import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await req.json()
    const network = await prisma.network.update({
      where: { id },
      data
    })
    return NextResponse.json(network)
  } catch (error) {
    console.error('Failed to update network:', error)
    return NextResponse.json({ error: 'Failed to update network' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.network.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete network:', error)
    return NextResponse.json({ error: 'Failed to delete network' }, { status: 500 })
  }
}
