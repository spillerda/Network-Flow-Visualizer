import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomPastelColor(): string {
  const h = Math.floor(Math.random() * 360)
  return `hsl(${h}, 70%, 85%)`
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    if (!data.color) data.color = randomPastelColor()
    const network = await prisma.network.create({ data })
    return NextResponse.json(network)
  } catch (error) {
    console.error('Failed to create network:', error)
    return NextResponse.json({ error: 'Failed to create network' }, { status: 500 })
  }
}
