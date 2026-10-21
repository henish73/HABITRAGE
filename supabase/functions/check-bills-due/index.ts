// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This serves the Edge Function to check bills due today, tomorrow, or in 3 days.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate dates: today, +1 day, +3 days
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 1);
    const day1Str = d1.toISOString().split("T")[0];

    const d3 = new Date(now);
    d3.setDate(d3.getDate() + 3);
    const day3Str = d3.toISOString().split("T")[0];

    // Query unpaid bills due in next 3 days
    const { data: bills, error } = await supabase
      .from("bills")
      .select("*, linked_account:accounts(account_name, bank_name)")
      .eq("is_paid", false)
      .lte("next_due_date", day3Str)
      .gte("next_due_date", todayStr);

    if (error) throw error;

    const notifications = [];
    for (const bill of bills || []) {
      const isToday = bill.next_due_date === todayStr;
      const isTomorrow = bill.next_due_date === day1Str;
      const urgency = isToday ? "DUE TODAY" : isTomorrow ? "Due Tomorrow" : "Due in 3 Days";

      notifications.push({
        title: `Bill Reminder: ${bill.name} (${urgency})`,
        body: `Amount: $${bill.amount} is due on ${bill.next_due_date}.`,
        billId: bill.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedAt: todayStr,
        billsFound: bills?.length || 0,
        notifications,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
