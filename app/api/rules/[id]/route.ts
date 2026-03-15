import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALLOWED_RULE_FIELDS = [
  'description', 'ports', 'action', 'priority', 'active',
]

function sanitizeRuleData(data: any) {
  const clean: any = {}
  for (const key of ALLOWED_RULE_FIELDS) {
    if (key in data) {
      clean[key] = data[key]
    }
  }
  // Convert priority to number if present
  if ('priority' in clean && clean.priority !== null) {
    clean.priority = parseInt(clean.priority, 10) || 100
  }
  return clean
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rawData = await req.json()
    const data = sanitizeRuleData(rawData)
    
    // For updates, we delete existing sources/destinations and recreate them to avoid complex diffing
    if (rawData.sources || rawData.destinations) {
      // Begin a transaction to ensure atomic updates
      await prisma.$transaction(async (tx: any) => {
        // Only delete/recreate if the arrays are provided
        if (rawData.sources && Array.isArray(rawData.sources)) {
          await tx.ruleSource.deleteMany({ where: { ruleId: id } })
          data.sources = { create: rawData.sources }
        }
        if (rawData.destinations && Array.isArray(rawData.destinations)) {
          await tx.ruleDest.deleteMany({ where: { ruleId: id } })
          data.destinations = { create: rawData.destinations }
        }
        
        await tx.rule.update({
          where: { id },
          data
        })
      })
      
      const updatedRule = await prisma.rule.findUnique({
        where: { id },
        include: { sources: true, destinations: true }
      })
      return NextResponse.json(updatedRule)
    } else {
      // Simple update (e.g. just changing description/action)
      const rule = await prisma.rule.update({
        where: { id },
        data,
        include: { sources: true, destinations: true }
      })
      return NextResponse.json(rule)
    }
  } catch (error) {
    console.error('Failed to update rule:', error)
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.rule.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete rule:', error)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}
