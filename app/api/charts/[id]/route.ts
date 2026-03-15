import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params
    const data = await request.json()

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.viewState !== undefined) updateData.viewState = data.viewState

    const chart = await prisma.chart.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(chart)
  } catch (error) {
    console.error(`Failed to update chart ${error}`,)
    return NextResponse.json({ error: 'Failed to update chart' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params
    await prisma.chart.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Failed to delete chart ${error}`,)
    return NextResponse.json({ error: 'Failed to delete chart' }, { status: 500 })
  }
}
