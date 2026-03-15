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
    const client = await prisma.client.create({ data })
    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to create client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
