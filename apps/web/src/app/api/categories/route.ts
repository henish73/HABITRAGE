import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countCategory = searchParams.get('countFor');
    if (countCategory) {
      const count = await db.getCategoryUsageCount(countCategory);
      return NextResponse.json({ success: true, category: countCategory, count });
    }

    const categories = await db.getCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const created = await db.createCategory({
      name: body.name.trim(),
      color: body.color || null,
      icon: body.icon || null,
    });

    return NextResponse.json({ success: true, category: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let nameOrId: string | null = null;
    let reassignTo: string | undefined = undefined;
    let newCategoryName: string | undefined = undefined;

    const { searchParams } = new URL(req.url);
    nameOrId = searchParams.get('id') || searchParams.get('name');
    reassignTo = searchParams.get('reassignTo') || undefined;
    newCategoryName = searchParams.get('newCategoryName') || undefined;

    // Check JSON body if provided
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const body = await req.json();
        if (body.name || body.id) nameOrId = body.name || body.id;
        if (body.reassignTo !== undefined) reassignTo = body.reassignTo;
        if (body.newCategoryName !== undefined) newCategoryName = body.newCategoryName;
      } catch {}
    }

    if (!nameOrId) {
      return NextResponse.json(
        { success: false, error: 'Category name or id is required' },
        { status: 400 }
      );
    }

    // If newCategoryName is requested, create it first
    if (newCategoryName && newCategoryName.trim()) {
      const created = await db.createCategory({ name: newCategoryName.trim() });
      reassignTo = created.name;
    }

    const result = await db.deleteCategory(nameOrId, reassignTo);
    return NextResponse.json({
      success: result.success,
      affectedCount: result.affectedCount,
      reassignedTo: reassignTo || 'General',
      deletedCategory: nameOrId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
