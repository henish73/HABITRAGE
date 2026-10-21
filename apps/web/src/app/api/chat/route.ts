import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { formatCAD } from '@financeos/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const history = await db.getAiChatHistory();
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.clearAiChatHistory();
    return NextResponse.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Tool definitions for OpenAI / OpenRouter function calling
const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getAccountBalances',
      description: 'Fetch all user bank accounts and credit cards with current balances and credit limits.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchTransactions',
      description: 'Search user transactions by keyword, merchant name, category, date range, type (Inflow/Outflow/Transfers), or status (posted/pending).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keyword, merchant, or vendor name to search' },
          category: { type: 'string', description: 'Category filter (e.g. Dining & Cafes, Groceries, Transportation)' },
          type: { type: 'string', enum: ['Inflow', 'Outflow', 'Transfers'], description: 'Transaction type' },
          status: { type: 'string', enum: ['posted', 'pending'], description: 'Transaction status' },
          date_from: { type: 'string', description: 'Start date YYYY-MM-DD' },
          date_to: { type: 'string', description: 'End date YYYY-MM-DD' },
          limit: { type: 'number', description: 'Max number of transactions to return (default 25)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSpendingSummary',
      description: 'Calculate comprehensive spending totals: total inflow, total outflow (spending), net savings, and top 5 categories and merchants.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createTransaction',
      description: 'Create a new transaction in the user ledger. Negative for expense/outflow, positive for income/inflow.',
      parameters: {
        type: 'object',
        properties: {
          merchant: { type: 'string', description: 'Merchant or vendor name' },
          amount: { type: 'number', description: 'Amount in CAD (negative for expense, positive for income)' },
          category: { type: 'string', description: 'Category for the transaction' },
          date: { type: 'string', description: 'Transaction date YYYY-MM-DD (defaults to today)' },
          account_name: { type: 'string', description: 'Bank or account name to link to (e.g. CIBC, TD, RBC, Visa)' },
          description: { type: 'string', description: 'Statement description' },
        },
        required: ['merchant', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateTransaction',
      description: 'Update an existing transaction by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID' },
          merchant: { type: 'string', description: 'Updated merchant name' },
          amount: { type: 'number', description: 'Updated amount' },
          category: { type: 'string', description: 'Updated category' },
          type: { type: 'string', enum: ['Inflow', 'Outflow', 'Transfers'] },
          status: { type: 'string', enum: ['posted', 'pending'] },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteTransaction',
      description: 'Delete a transaction from the ledger by ID or by searching for its merchant/description.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID if known' },
          query: { type: 'string', description: 'Merchant or description to search and delete if ID is unknown' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createBill',
      description: 'Create an upcoming or recurring bill payment.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Bill or payee name (e.g. Rogers, Rent, Gym, Netflix)' },
          amount: { type: 'number', description: 'Bill amount in CAD' },
          due_day: { type: 'number', description: 'Day of the month the bill is due (1-31)' },
          frequency: { type: 'string', enum: ['monthly', 'annual', 'weekly'], description: 'Payment frequency' },
          linked_account_name: { type: 'string', description: 'Account name to link autopay from' },
          notes: { type: 'string', description: 'Optional bill notes' },
        },
        required: ['name', 'amount', 'due_day'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBillsDue',
      description: 'Fetch all upcoming and recurring bills with due dates, amounts, and payment status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchCreditReports',
      description: 'Fetch credit bureau scores, credit card utilization rates, and total debt.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// Tool execution handler
async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'getAccountBalances': {
      const accounts = await db.getAccounts();
      return accounts.map((a) => ({
        id: a.id,
        name: a.account_name,
        bank: a.bank_name,
        type: a.type,
        account_type: a.account_type,
        balance: formatCAD(a.balance),
        credit_limit: a.credit_limit ? formatCAD(a.credit_limit) : null,
      }));
    }

    case 'searchTransactions': {
      const res = await db.getTransactions({
        search: args.query,
        categories: args.category ? [args.category] : undefined,
        type: args.type,
        status: args.status,
        date_from: args.date_from,
        date_to: args.date_to,
        limit: args.limit || 25,
      });
      return {
        totalFound: res.total,
        transactions: res.transactions.map((t) => ({
          id: t.id,
          date: t.date,
          account: t.account ? `${t.account.bank_name} ${t.account.account_name}` : 'Account',
          merchant: t.merchant || t.description,
          category: t.category,
          type: t.type,
          amount: formatCAD(t.amount, true),
          status: t.status,
        })),
      };
    }

    case 'getSpendingSummary': {
      const allTx = await db.getTransactions({ limit: 10000 });
      let totalSpent = 0;
      let totalIncome = 0;
      const categoryTotals: Record<string, number> = {};
      const merchantTotals: Record<string, number> = {};

      for (const t of allTx.transactions) {
        if (t.status !== 'posted') continue;
        if (t.amount < 0) {
          const expense = Math.abs(t.amount);
          totalSpent += expense;
          categoryTotals[t.category || 'Other'] = (categoryTotals[t.category || 'Other'] || 0) + expense;
          merchantTotals[t.merchant || t.description || 'Other'] =
            (merchantTotals[t.merchant || t.description || 'Other'] || 0) + expense;
        } else {
          totalIncome += t.amount;
        }
      }

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => ({ category: k, total: formatCAD(v) }));

      const topMerchants = Object.entries(merchantTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => ({ merchant: k, total: formatCAD(v) }));

      return {
        totalSpent: formatCAD(totalSpent),
        totalIncome: formatCAD(totalIncome),
        netSavings: formatCAD(totalIncome - totalSpent),
        topCategories,
        topMerchants,
      };
    }

    case 'createTransaction': {
      const accounts = await db.getAccounts();
      let accountId = accounts[0]?.id || '';
      if (args.account_name) {
        const match = accounts.find((a) =>
          a.account_name.toLowerCase().includes(args.account_name.toLowerCase()) ||
          a.bank_name.toLowerCase().includes(args.account_name.toLowerCase())
        );
        if (match) accountId = match.id;
      }

      const tx = await db.createTransaction({
        account_id: accountId,
        date: args.date || new Date().toISOString().split('T')[0],
        description: args.description || args.merchant || 'AI Created Transaction',
        merchant: args.merchant || args.description || 'Merchant',
        category: args.category || 'General',
        amount: args.amount,
        type: args.amount < 0 ? 'Outflow' : 'Inflow',
        debit: args.amount < 0 ? Math.abs(args.amount) : null,
        credit: args.amount > 0 ? args.amount : null,
        status: 'posted',
        source_file: 'ai_copilot',
      });

      return {
        success: true,
        message: `Successfully created transaction for ${formatCAD(tx.amount)} at ${tx.merchant}.`,
        transaction: {
          id: tx.id,
          merchant: tx.merchant,
          amount: formatCAD(tx.amount),
          date: tx.date,
          category: tx.category,
        },
      };
    }

    case 'updateTransaction': {
      const allowedUpdates: any = {};
      if (args.category !== undefined) allowedUpdates.category = args.category;
      if (args.description !== undefined) allowedUpdates.description = args.description;
      if (args.merchant !== undefined) allowedUpdates.merchant = args.merchant;
      if (args.amount !== undefined) allowedUpdates.amount = Number(args.amount);
      if (args.date !== undefined) allowedUpdates.date = args.date;

      const updated = await db.updateTransaction(args.id, allowedUpdates);
      return {
        success: Boolean(updated),
        message: updated ? `Updated transaction ${args.id}.` : 'Transaction not found.',
        transaction: updated,
      };
    }

    case 'deleteTransaction': {
      let targetId = args.id;
      let matchedTx = null;
      if (targetId) {
        matchedTx = await db.getTransactionById(targetId);
      } else if (args.query) {
        const found = await db.getTransactions({ search: args.query, limit: 1 });
        if (found.transactions.length > 0) {
          matchedTx = found.transactions[0];
          targetId = matchedTx.id;
        }
      }
      if (!targetId || !matchedTx) return { success: false, message: 'Could not find matching transaction to delete.' };

      if (!args.confirm) {
        return {
          success: true,
          requiresConfirmation: true,
          action: 'deleteTransaction',
          transactionId: targetId,
          details: {
            date: matchedTx.date,
            description: matchedTx.description,
            amount: matchedTx.amount,
            merchant: matchedTx.merchant,
          },
          message: `Please confirm deletion: "${matchedTx.description}" (${formatCAD(matchedTx.amount)} on ${matchedTx.date}).`,
        };
      }

      const success = await db.deleteTransaction(targetId);
      return {
        success,
        message: success
          ? `Transaction "${matchedTx.description}" (${targetId}) was successfully deleted.`
          : 'Transaction not found.',
      };
    }

    case 'createBill': {
      const accounts = await db.getAccounts();
      let linkedId: string | null = null;
      if (args.linked_account_name) {
        const m = accounts.find((a) =>
          a.account_name.toLowerCase().includes(args.linked_account_name.toLowerCase())
        );
        if (m) linkedId = m.id;
      }
      const dueDay = Math.max(1, Math.min(Number(args.due_day) || 1, 31));
      const validFreq = ['monthly', 'weekly', 'biweekly'].includes(args.frequency)
        ? args.frequency
        : 'monthly';

      const now = new Date();
      let y = now.getFullYear();
      let m = now.getMonth();
      if (now.getDate() > dueDay) {
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
      }
      const maxDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const day = Math.min(dueDay, maxDay);
      const nextDueDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const bill = await db.createBill({
        name: args.name,
        type: args.type && ['rent', 'credit_card', 'utility', 'subscription', 'other'].includes(args.type)
          ? args.type
          : 'utility',
        amount: Number(args.amount) || 0,
        due_day: dueDay,
        frequency: validFreq,
        linked_account_id: linkedId,
        autopay: false,
        next_due_date: nextDueDate,
        is_paid: false,
        notes: args.notes || 'Created via FinanceOS AI',
      });
      return {
        success: true,
        message: `Created bill '${bill.name}' for ${formatCAD(bill.amount)} due on day ${bill.due_day} of each month.`,
        bill,
      };
    }

    case 'getBillsDue': {
      const bills = await db.getBills();
      return bills.map((b) => ({
        id: b.id,
        name: b.name,
        amount: formatCAD(b.amount),
        due_date: b.next_due_date,
        due_day: b.due_day,
        status: b.is_paid ? 'Paid' : 'Upcoming',
        account: b.linked_account?.account_name || 'None',
      }));
    }

    case 'searchCreditReports': {
      const reports = await db.getCreditReports();
      return reports.map((r) => ({
        bureau: r.bureau,
        score: r.score,
        utilization: `${r.utilization_percent}%`,
        total_debt: formatCAD(r.total_debt),
        open_accounts_count: r.open_accounts?.length || 0,
      }));
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessage =
      body.message ||
      (Array.isArray(body.messages) ? body.messages[body.messages.length - 1]?.content : null);

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }
    const userMessage = rawMessage.trim();

    // Save user message to history
    await db.addAiChatMessage('user', userMessage);

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const model = (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');

    let responseText = '';
    const functionCallsExecuted: any[] = [];

    // If OpenRouter API key is available, run real AI with Tool Calling
    if (apiKey) {
      try {
        const accounts = await db.getAccounts();
        const accountsContext = accounts
          .map((a) => `${a.bank_name} ${a.account_name} (${a.type}): Balance ${formatCAD(a.balance)}`)
          .join('\n');

        const systemPrompt = `You are FinanceOS AI Copilot, a brilliant, accurate, personal financial advisor and ledger assistant.
The current date is October 2026. All currency values are in Canadian Dollars (CAD / $).
You have full access to tools that query and manipulate the user's real financial database containing 4,159 transactions, multiple accounts, recurring bills, and credit reports.

Active accounts in system:
${accountsContext}

Rules:
1. When asked about spending, amounts, merchants, transactions, bills, or balances, ALWAYS use your tools to fetch real data rather than guessing.
2. If the user asks to add a bill, delete a transaction, or create a transaction, execute the corresponding tool immediately.
3. Be concise, highly professional, direct, and well-structured using markdown tables or bullet points where appropriate.
4. Always specify CAD currency clearly.`;

        // Assemble messages
        const conversationMessages: any[] = [{ role: 'system', content: systemPrompt }];

        // Include last few previous messages for context
        if (Array.isArray(body.messages) && body.messages.length > 1) {
          const recent = body.messages.slice(-5, -1);
          for (const m of recent) {
            if (m.role === 'user' || m.role === 'assistant') {
              conversationMessages.push({ role: m.role, content: m.content });
            }
          }
        }
        conversationMessages.push({ role: 'user', content: userMessage });

        // First Turn: Call model with available tools
        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://financeos.local',
            'X-Title': 'FinanceOS',
          },
          body: JSON.stringify({
            model: model || 'google/gemini-2.5-flash',
            messages: conversationMessages,
            tools: AI_TOOLS,
          }),
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          const assistantChoice = data.choices?.[0]?.message;

          if (assistantChoice) {
            // Check if model called any tools
            if (assistantChoice.tool_calls && assistantChoice.tool_calls.length > 0) {
              conversationMessages.push(assistantChoice);

              // Execute all requested tools
              for (const tc of assistantChoice.tool_calls) {
                const toolName = tc.function.name;
                let toolArgs: any = {};
                try {
                  toolArgs = typeof tc.function.arguments === 'string'
                    ? JSON.parse(tc.function.arguments)
                    : tc.function.arguments || {};
                } catch {
                  toolArgs = {};
                }

                const toolResult = await executeTool(toolName, toolArgs);
                functionCallsExecuted.push({
                  name: toolName,
                  args: toolArgs,
                  result: toolResult,
                });

                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: toolName,
                  content: JSON.stringify(toolResult),
                });
              }

              // Second Turn: Send tool results back to model for final formatted answer
              const turn2Res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://financeos.local',
                  'X-Title': 'FinanceOS',
                },
                body: JSON.stringify({
                  model: model || 'google/gemini-2.5-flash',
                  messages: conversationMessages,
                }),
              });

              if (turn2Res.ok) {
                const turn2Data = await turn2Res.json();
                responseText = turn2Data.choices?.[0]?.message?.content || '';
              }
            } else if (assistantChoice.content) {
              responseText = assistantChoice.content;
            }
          }
        }
      } catch (aiErr) {
        console.error('OpenRouter AI execution error:', aiErr);
      }
    }

    // Dynamic Fallback if model did not return text or if API was unreachable
    if (!responseText) {
      const lower = userMessage.toLowerCase();
      if (lower.includes('how much') || lower.includes('spend') || lower.includes('uber') || lower.includes('walmart') || lower.includes('tim')) {
        const match = lower.match(/(?:at|on|for|spend|spent)\s+([a-zA-Z0-9\s'-]+)/);
        const query = match ? match[1].replace(/last month|this month|this year|yesterday/g, '').trim() : 'Uber';
        const res = await executeTool('searchTransactions', { query, limit: 10 });
        functionCallsExecuted.push({ name: 'searchTransactions', args: { query }, result: res });
        const total = res.transactions.reduce((acc: number, t: any) => {
          const val = parseFloat((t.amount || '').replace(/[^0-9.-]/g, ''));
          return acc + (val < 0 ? Math.abs(val) : 0);
        }, 0);
        responseText = `I searched your transactions for **"${query}"**.\n\nFound **${res.totalFound} transaction(s)** totaling **${formatCAD(total)} CAD**.\n\n${res.transactions.slice(0, 5).map((t: any) => `• ${t.date} — **${t.merchant}**: ${t.amount} (${t.category})`).join('\n')}`;
      } else if (lower.includes('balance') || lower.includes('account') || lower.includes('net worth')) {
        const accs = await executeTool('getAccountBalances', {});
        functionCallsExecuted.push({ name: 'getAccountBalances', args: {}, result: accs });
        responseText = `Here is your current account breakdown:\n\n${accs.map((a: any) => `• **${a.name}** (${a.bank}): **${a.balance}** ${a.credit_limit ? `(Limit: ${a.credit_limit})` : ''}`).join('\n')}`;
      } else if (lower.includes('bill') || lower.includes('due') || lower.includes('upcoming')) {
        const bills = await executeTool('getBillsDue', {});
        functionCallsExecuted.push({ name: 'getBillsDue', args: {}, result: bills });
        responseText = `Here are your recorded bills and due dates:\n\n${bills.map((b: any) => `• **${b.name}**: **${b.amount}** (Due: ${b.due_date || `Day ${b.due_day}`}) — *${b.status}*`).join('\n')}`;
      } else {
        const summary = await executeTool('getSpendingSummary', {});
        functionCallsExecuted.push({ name: 'getSpendingSummary', args: {}, result: summary });
        responseText = `Here is your financial overview across 4,159 transactions:\n• Total Inflow: **${summary.totalIncome}**\n• Total Outflow: **${summary.totalSpent}**\n• Net Position: **${summary.netSavings}**\n\nTop Spending Categories:\n${summary.topCategories.map((c: any) => `• ${c.category}: ${c.total}`).join('\n')}`;
      }
    }

    // Save assistant response to history
    await db.addAiChatMessage('assistant', responseText, functionCallsExecuted);

    return NextResponse.json({
      success: true,
      message: responseText,
      reply: responseText,
      functionCalls: functionCallsExecuted,
      function_calls: functionCallsExecuted,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
