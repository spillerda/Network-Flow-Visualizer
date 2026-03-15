import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        networks: {
          include: {
            clients: true
          }
        }
      }
    })

    const rules = await prisma.rule.findMany({
      include: {
        sources: true,
        destinations: true
      }
    })

    return NextResponse.json({ zones, rules })
  } catch (error) {
    console.error('Failed to fetch topology:', error)
    return NextResponse.json({ error: 'Failed to fetch topology' }, { status: 500 })
  }
}
