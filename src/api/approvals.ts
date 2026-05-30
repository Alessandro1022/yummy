// ============================================================
// API ROUTE: /api/approvals
// GET: list pending approvals
// POST: approve or reject
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../db/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      *,
      content (
        id, title, meta_description, quality_score, status,
        quality_breakdown, quality_reasoning, outline, faq, direct_answer
      )
    `)
    .eq('action', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ approvals: data });
}

export async function POST(req: NextRequest) {
  const { approval_id, content_id, action, reason } = await req.json();

  if (!['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update approval record
  await supabase
    .from('approvals')
    .update({ action, reason, reviewed_at: new Date().toISOString() })
    .eq('id', approval_id);

  // Update content status
  const newStatus = action === 'approved' ? 'published' : 'rejected';
  await supabase
    .from('content')
    .update({
      status: newStatus,
      published_at: action === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', content_id);

  return NextResponse.json({ success: true, status: newStatus });
}
