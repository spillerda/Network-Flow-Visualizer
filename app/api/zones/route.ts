import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomPastelColor(): string {
  const h = Math.floor(Math.random() * 360)
  return `hsl(${h}, 70%, 85%)`
}

function randomBorderColor(): string {
  const h = Math.floor(Math.random() * 360)
  return `hsl(${h}, 65%, 50%)`
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    if (!data.color) data.color = randomPastelColor()
    if (!data.borderColor) data.borderColor = randomBorderColor()
    const zone = await prisma.zone.create({ data })
    return NextResponse.json(zone)
  } catch (error) {
    console.error('Failed to create zone:', error)
    return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 })
  }
}
