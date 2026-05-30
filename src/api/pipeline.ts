// ============================================================
// API ROUTE: POST /api/pipeline
// Runs full 5-agent pipeline for a keyword
// Usage: Next.js App Router — rename to route.ts under /app/api/pipeline/
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runFullPipeline } from '../services/pipeline';
import { validateContentRequirements } from '../services/publishService';
import { supabase } from '../db/supabase';

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json();

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Run the pipeline
    const result = await runFullPipeline(keyword.trim());

    // Validate content requirements
    const { valid, missing } = validateContentRequirements(result);
    if (!valid) {
      return NextResponse.json(
        { error: 'Content missing required fields', missing },
        { status: 422 }
      );
    }

    // Save to database
    const { data: keyword_record } = await supabase
      .from('keywords')
      .upsert({ keyword: keyword.trim(), intent: result.research.intent })
      .select()
      .single();

    const { data: content_record, error: contentError } = await supabase
      .from('content')
      .insert({
        keyword_id: keyword_record?.id,
        title: result.content.title,
        meta_description: result.content.meta_description,
        direct_answer: result.content.direct_answer,
        outline: result.content.outline,
        faq: result.content.faq,
        schema_type: result.content.schema_type,
        word_count: result.content.word_count,
        research_data: result.research,
        optimization_data: result.optimization,
        quality_score: result.quality.total_score,
        quality_breakdown: result.quality.breakdown,
        quality_reasoning: result.quality.reasoning,
        status: result.final_status,
        published_at: result.final_status === 'auto_published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (contentError) throw contentError;

    // If needs approval, create approval record
    if (result.final_status === 'pending_approval') {
      await supabase.from('approvals').insert({
        content_id: content_record.id,
        action: 'pending',
        quality_score_at_review: result.quality.total_score,
      });
    }

    return NextResponse.json({ success: true, result, content_id: content_record?.id });
  } catch (error: any) {
    console.error('[Pipeline API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
