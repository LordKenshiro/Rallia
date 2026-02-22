/**
 * Program Registration API Route
 *
 * POST /api/programs/[id]/register - Register for a program
 */

import { createClient } from '@/lib/supabase/server';
import {
  createRegistration,
  calculateInstallmentSchedule,
  createInstallmentPayments,
  checkProgramCapacity,
  addToWaitlist,
} from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: programId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const playerId = body.playerId || user.id;

    // Check capacity
    const capacity = await checkProgramCapacity(supabase, programId);

    if (!capacity.hasCapacity) {
      // Check if waitlist is enabled
      const { data: program } = await supabase
        .from('program')
        .select('waitlist_enabled')
        .eq('id', programId)
        .single();

      if (program?.waitlist_enabled && body.addToWaitlistIfFull) {
        // Add to waitlist instead
        const waitlistResult = await addToWaitlist(supabase, {
          programId,
          playerId,
          addedBy: user.id,
          notes: body.notes,
        });

        if (!waitlistResult.success) {
          return NextResponse.json({ error: waitlistResult.error }, { status: 400 });
        }

        return NextResponse.json(
          {
            type: 'waitlist',
            waitlistEntry: waitlistResult.data,
            message: 'Added to waitlist - program is at full capacity',
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          error: 'Program is at full capacity',
          waitlistEnabled: program?.waitlist_enabled,
        },
        { status: 400 }
      );
    }

    // Get program details for payment calculation
    const { data: program } = await supabase
      .from('program')
      .select('price_cents, currency, allow_installments, installment_count, start_date')
      .eq('id', programId)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Determine payment plan
    const useInstallments = body.paymentPlan === 'installment' && program.allow_installments;

    // Create registration
    const result = await createRegistration(supabase, {
      programId,
      playerId,
      registeredBy: user.id,
      paymentPlan: useInstallments ? 'installment' : 'full',
      stripeCustomerId: body.stripeCustomerId,
      notes: body.notes,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Create payment records
    if (
      useInstallments &&
      program.installment_count &&
      program.installment_count > 1 &&
      program.price_cents
    ) {
      const schedule = calculateInstallmentSchedule(
        program.price_cents,
        program.installment_count,
        new Date(program.start_date)
      );

      await createInstallmentPayments(supabase, result.data!.id, schedule, body.stripeCustomerId);
    } else {
      // Single payment
      await createInstallmentPayments(
        supabase,
        result.data!.id,
        [
          {
            installmentNumber: 1,
            amountCents: program.price_cents,
            dueDate: new Date(),
          },
        ],
        body.stripeCustomerId
      );
    }

    // TODO: Create Stripe PaymentIntent for first payment
    // TODO: Return client secret for Stripe Elements

    return NextResponse.json(
      {
        type: 'registration',
        registration: result.data,
        // clientSecret: paymentIntent.clientSecret, // For Stripe
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering for program:', error);
    return NextResponse.json({ error: 'Failed to register for program' }, { status: 500 });
  }
}
