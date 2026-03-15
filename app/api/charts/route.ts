import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const charts = await prisma.chart.findMany({
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(charts)
  } catch (error) {
    console.error('Failed to fetch charts:', error)
    return NextResponse.json({ error: 'Failed to fetch charts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const chart = await prisma.chart.create({
      data: {
        name: data.name || 'Untitled',
        viewState: data.viewState || null
      }
    })
    return NextResponse.json(chart)
  } catch (error) {
    console.error('Failed to create chart:', error)
    return NextResponse.json({ error: 'Failed to create chart' }, { status: 500 })
  }
}
