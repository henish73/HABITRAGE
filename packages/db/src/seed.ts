import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { maskAccountNumber, categorizeMerchant } from '@financeos/shared';

dotenv.config();

const DATA_DIR = path.resolve(__dirname, '../../../data');
const BANK_CSV = path.join(DATA_DIR, 'master_bank_accounts.csv');
const CC_CSV = path.join(DATA_DIR, 'master_credit_cards.csv');
const CACHE_JSON = path.join(DATA_DIR, 'seed_cache.json');

// Generate deterministic UUID from namespace + text
function generateDeterministicUUID(input: string): string {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

import csv from 'csv-parser';

// Parse CSV with streaming csv-parser supporting multi-line quotes
function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return resolve([]);
    }
    const rows: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

function cleanMerchant(merchant: string, desc: string): string {
  if (merchant && merchant.trim().length > 0) {
    let m = merchant.trim();
    // remove card numbers
    m = m.replace(/4505\*{8}\d{4}/g, '').trim();
    if (m) return m;
  }
  let d = desc || '';
  d = d.replace(/4505\*{8}\d{4}/g, '').trim();
  d = d.replace(/Internet Banking/i, '').replace(/Point of Sale -/i, '').replace(/Electronic Funds Transfer/i, '').trim();
  // take first 40 chars
  return d.substring(0, 45).trim() || 'General Merchant';
}

export async function runSeed() {
  console.log('=== STARTING FINANCEOS SEED SCRIPT ===');
  console.log(`Reading CSVs from: ${DATA_DIR}`);

  const bankRows = await parseCSV(BANK_CSV);
  const ccRows = await parseCSV(CC_CSV);

  console.log(`Loaded Bank Account rows: ${bankRows.length}`);
  console.log(`Loaded Credit Card rows: ${ccRows.length}`);

  // 1. Defined Accounts
  const accountDefinitions = [
    // Bank Accounts
    {
      id: generateDeterministicUUID('CIBC-Chequing-01652-67-87339'),
      type: 'bank',
      bank_name: 'CIBC',
      account_name: 'CIBC Smart Account',
      account_number: '****7339',
      account_type: 'Chequing',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('CIBC-Savings-02952-89-55832'),
      type: 'bank',
      bank_name: 'CIBC',
      account_name: 'CIBC eAdvantage Savings',
      account_number: '****5832',
      account_type: 'Savings',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('TD-Chequing-11046897089'),
      type: 'bank',
      bank_name: 'TD',
      account_name: 'TD Every Day Chequing',
      account_number: '****7089',
      account_type: 'Chequing',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('TD-Savings-11046889086'),
      type: 'bank',
      bank_name: 'TD',
      account_name: 'TD High Interest Savings',
      account_number: '****9086',
      account_type: 'Savings',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('RBC-Chequing-01842-5357173'),
      type: 'bank',
      bank_name: 'RBC',
      account_name: 'RBC Day to Day Banking Chequing',
      account_number: '****7173',
      account_type: 'Chequing',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('RBC-Savings-01842-5357181'),
      type: 'bank',
      bank_name: 'RBC',
      account_name: 'RBC High Interest eSavings',
      account_number: '****7181',
      account_type: 'Savings',
      balance: 0,
      credit_limit: null,
    },
    {
      id: generateDeterministicUUID('RBC-FindSave-01842-5029475'),
      type: 'bank',
      bank_name: 'RBC',
      account_name: 'RBC NOMI Find & Save',
      account_number: '****9475',
      account_type: 'Find & Save',
      balance: 0,
      credit_limit: null,
    },
    // Credit Cards
    {
      id: generateDeterministicUUID('TD-CreditCard-452034******1993'),
      type: 'credit_card',
      bank_name: 'TD',
      account_name: 'TD Low Rate Visa',
      account_number: '****1993',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 1000.00,
    },
    {
      id: generateDeterministicUUID('CIBC-CreditCard-4505 5302 0756 7254'),
      type: 'credit_card',
      bank_name: 'CIBC',
      account_name: 'CIBC Dividend Visa',
      account_number: '****7254',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 3500.00,
    },
    {
      id: generateDeterministicUUID('Rogers-CreditCard-Rogers Mastercard'),
      type: 'credit_card',
      bank_name: 'Rogers Bank',
      account_name: 'Rogers Mastercard',
      account_number: '****4379',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 500.00,
    },
    {
      id: generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-61008'),
      type: 'credit_card',
      bank_name: 'American Express',
      account_name: 'American Express Green Card',
      account_number: '****1008',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 8500.00,
    },
    {
      id: generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-41005'),
      type: 'credit_card',
      bank_name: 'American Express',
      account_name: 'American Express Essential Credit Card',
      account_number: '****1005',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 13500.00,
    },
    {
      id: generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-51008'),
      type: 'credit_card',
      bank_name: 'American Express',
      account_name: 'American Express SimplyCash Card',
      account_number: '****1008',
      account_type: 'Credit Card',
      balance: 0,
      credit_limit: 1100.00,
    },
  ];

  const accountsMap = new Map<string, any>();
  for (const acc of accountDefinitions) {
    accountsMap.set(acc.id, { ...acc });
  }

  // Lookup helper for bank accounts
  function findBankAccountId(bank: string, acctType: string, acctNum: string): string {
    if (bank === 'CIBC') {
      if (acctType.toLowerCase().includes('cheq')) return generateDeterministicUUID('CIBC-Chequing-01652-67-87339');
      return generateDeterministicUUID('CIBC-Savings-02952-89-55832');
    }
    if (bank === 'TD') {
      if (acctType.toLowerCase().includes('cheq')) return generateDeterministicUUID('TD-Chequing-11046897089');
      return generateDeterministicUUID('TD-Savings-11046889086');
    }
    if (bank === 'RBC') {
      if (acctType.toLowerCase().includes('cheq')) return generateDeterministicUUID('RBC-Chequing-01842-5357173');
      if (acctType.toLowerCase().includes('find')) return generateDeterministicUUID('RBC-FindSave-01842-5029475');
      return generateDeterministicUUID('RBC-Savings-01842-5357181');
    }
    return accountDefinitions[0].id;
  }

  // Lookup helper for credit cards
  function findCreditCardId(bank: string, cardName: string, acctNum: string): string {
    if (cardName.includes('TD Low Rate')) return generateDeterministicUUID('TD-CreditCard-452034******1993');
    if (cardName.includes('CIBC')) return generateDeterministicUUID('CIBC-CreditCard-4505 5302 0756 7254');
    if (cardName.includes('Rogers')) return generateDeterministicUUID('Rogers-CreditCard-Rogers Mastercard');
    if (cardName.includes('Green')) return generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-61008');
    if (cardName.includes('Essential')) return generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-41005');
    if (cardName.includes('SimplyCash') || cardName.includes('SIMPLY CASH')) return generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-51008');
    return generateDeterministicUUID('CIBC-CreditCard-4505 5302 0756 7254');
  }

  const transactions: any[] = [];
  const seenKeys = new Set<string>();

  // Process Bank Accounts CSV
  for (let i = 0; i < bankRows.length; i++) {
    const row = bankRows[i];
    const bank = row['Bank'] || 'CIBC';
    const acctType = row['Account_Type'] || 'Chequing';
    const acctNum = row['Account_Number'] || '';
    const accountId = findBankAccountId(bank, acctType, acctNum);

    const date = row['Date'];
    const desc = row['Transaction_Description'] || '';
    const debit = row['Debit'] ? parseFloat(row['Debit']) : null;
    const credit = row['Credit'] ? parseFloat(row['Credit']) : null;
    const runningBal = row['Running_Balance'] ? parseFloat(row['Running_Balance']) : null;
    const chq = row['Cheque_Number'] || null;
    const srcFile = row['Source_File'] || '';

    // Normalize amount: if Debit > 0 then Amount = -Debit; if Credit > 0 then Amount = +Credit
    let amount = 0;
    if (credit && credit > 0) {
      amount = credit;
    } else if (debit && debit > 0) {
      amount = -debit;
    } else if (row['Amount']) {
      amount = parseFloat(row['Amount']);
    }

    const merchant = cleanMerchant('', desc);
    const category = categorizeMerchant(desc);
    const key = `bank_${i}_${accountId}_${date}_${amount}_${desc.substring(0, 30)}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const txId = generateDeterministicUUID(key);
      transactions.push({
        id: txId,
        account_id: accountId,
        date,
        description: desc,
        merchant,
        category,
        amount,
        debit,
        credit,
        running_balance: runningBal,
        status: 'posted',
        cheque_number: chq,
        foreign_spend_amount: null,
        commission: null,
        exchange_rate: null,
        additional_info: null,
        address: null,
        city_province: null,
        country: 'CANADA',
        reference_number: null,
        source_file: srcFile,
      });
    }
  }

  // Process Credit Cards CSV
  for (let i = 0; i < ccRows.length; i++) {
    const row = ccRows[i];
    const bank = row['Bank'] || 'American Express';
    const cardName = row['Card_Name'] || '';
    const acctNum = row['Account_Number'] || '';
    const accountId = findCreditCardId(bank, cardName, acctNum);

    const date = row['Date'];
    const desc = row['Transaction_Description'] || '';
    const merchantRaw = row['Merchant'] || '';
    const merchant = cleanMerchant(merchantRaw, desc);
    const debit = row['Debit'] ? parseFloat(row['Debit']) : null;
    const credit = row['Credit'] ? parseFloat(row['Credit']) : null;
    const runningBal = row['Running_Balance'] ? parseFloat(row['Running_Balance']) : null;
    const category = row['Category'] && row['Category'].trim().length > 0 ? row['Category'].trim() : categorizeMerchant(desc);
    const srcFile = row['Source_File'] || '';
    const refNum = row['Reference_Number'] || null;

    // Normalize amount: if Debit > 0 (expense/charge) then Amount = -Debit; if Credit > 0 (payment/refund) then Amount = +Credit
    let amount = 0;
    if (credit && credit > 0) {
      amount = credit;
    } else if (debit && debit > 0) {
      amount = -debit;
    } else if (row['Amount']) {
      const rawAmt = parseFloat(row['Amount']);
      amount = -rawAmt;
    }

    const key = `cc_${i}_${accountId}_${date}_${amount}_${refNum || desc.substring(0, 30)}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const txId = generateDeterministicUUID(key);
      transactions.push({
        id: txId,
        account_id: accountId,
        date,
        description: desc,
        merchant,
        category,
        amount,
        debit,
        credit,
        running_balance: runningBal,
        status: 'posted',
        cheque_number: null,
        foreign_spend_amount: row['Foreign_Spend_Amount'] ? parseFloat(row['Foreign_Spend_Amount']) : null,
        commission: row['Commission'] ? parseFloat(row['Commission']) : null,
        exchange_rate: row['Exchange_Rate'] ? parseFloat(row['Exchange_Rate']) : null,
        additional_info: row['Additional_Information'] || null,
        address: row['Address'] || null,
        city_province: row['City_Province'] || null,
        country: row['Country'] || 'CANADA',
        reference_number: refNum,
        source_file: srcFile,
      });
    }
  }

  // Add a few realistic Pending transactions to demonstrate the Pending Tab feature!
  const cibcCheqId = generateDeterministicUUID('CIBC-Chequing-01652-67-87339');
  const cibcCCId = generateDeterministicUUID('CIBC-CreditCard-4505 5302 0756 7254');
  const amexGreenId = generateDeterministicUUID('AMEX-CreditCard-XXXX-XXXXXX-61008');

  const pendingTransactions = [
    {
      id: generateDeterministicUUID('pending-1'),
      account_id: cibcCCId,
      date: '2026-10-16',
      description: 'TIM HORTONS #2435 TORONTO, ON',
      merchant: 'Tim Hortons',
      category: 'Dining & Cafes',
      amount: -4.85,
      debit: 4.85,
      credit: null,
      running_balance: null,
      status: 'pending',
      cheque_number: null,
      foreign_spend_amount: null,
      commission: null,
      exchange_rate: null,
      additional_info: 'Pending authorization',
      address: null,
      city_province: 'Toronto, ON',
      country: 'CANADA',
      reference_number: 'AUTH_883921',
      source_file: 'pending_feed',
    },
    {
      id: generateDeterministicUUID('pending-2'),
      account_id: amexGreenId,
      date: '2026-10-15',
      description: 'UBER TRIP TORONTO, ON',
      merchant: 'Uber',
      category: 'Transportation',
      amount: -22.40,
      debit: 22.40,
      credit: null,
      running_balance: null,
      status: 'pending',
      cheque_number: null,
      foreign_spend_amount: null,
      commission: null,
      exchange_rate: null,
      additional_info: 'Pending ride charge',
      address: null,
      city_province: 'Toronto, ON',
      country: 'CANADA',
      reference_number: 'AUTH_119284',
      source_file: 'pending_feed',
    },
    {
      id: generateDeterministicUUID('pending-3'),
      account_id: cibcCheqId,
      date: '2026-10-16',
      description: 'INTERNET TRANSFER PENDING',
      merchant: 'Transfer',
      category: 'Transfers',
      amount: -150.00,
      debit: 150.00,
      credit: null,
      running_balance: null,
      status: 'pending',
      cheque_number: null,
      foreign_spend_amount: null,
      commission: null,
      exchange_rate: null,
      additional_info: null,
      address: null,
      city_province: null,
      country: 'CANADA',
      reference_number: 'PEND_55129',
      source_file: 'pending_feed',
    },
  ];

  transactions.push(...pendingTransactions);

  // Recalculate latest balance for each account based on posted transactions or running balance
  for (const acc of accountDefinitions) {
    const accTxs = transactions.filter(t => t.account_id === acc.id && t.status === 'posted');
    // sort ascending by date
    accTxs.sort((a, b) => a.date.localeCompare(b.date));

    // Find the latest running balance if available
    let latestBal: number | null = null;
    for (let i = accTxs.length - 1; i >= 0; i--) {
      if (accTxs[i].running_balance !== null && accTxs[i].running_balance !== undefined) {
        latestBal = accTxs[i].running_balance;
        break;
      }
    }

    if (latestBal !== null) {
      acc.balance = Number(latestBal.toFixed(2));
    } else {
      // Sum amounts
      const sum = accTxs.reduce((accVal, t) => accVal + t.amount, 0);
      // For credit cards, balance is debt (positive)
      acc.balance = acc.type === 'credit_card' ? Number(Math.abs(sum).toFixed(2)) : Number(sum.toFixed(2));
    }
  }

  // 2. Defined Recurring Bills
  const bills = [
    {
      id: generateDeterministicUUID('bill-rent'),
      name: 'Apartment Rent',
      type: 'rent',
      amount: 1900.00,
      due_day: 1,
      frequency: 'monthly',
      linked_account_id: cibcCheqId,
      autopay: false,
      next_due_date: '2026-11-01',
      is_paid: false,
      notes: 'Paid via Interac e-Transfer to Landlord',
    },
    {
      id: generateDeterministicUUID('bill-rogers'),
      name: 'Rogers / Fido Mobile',
      type: 'utility',
      amount: 75.71,
      due_day: 11,
      frequency: 'monthly',
      linked_account_id: generateDeterministicUUID('Rogers-CreditCard-Rogers Mastercard'),
      autopay: true,
      next_due_date: '2026-11-11',
      is_paid: false,
      notes: 'Mobile phone line autopay',
    },
    {
      id: generateDeterministicUUID('bill-cibc-visa'),
      name: 'CIBC Dividend Visa Payment',
      type: 'credit_card',
      amount: 37.88,
      due_day: 21,
      frequency: 'monthly',
      linked_account_id: cibcCCId,
      autopay: false,
      next_due_date: '2026-10-21',
      is_paid: false,
      notes: 'Statement balance payment due 21 days after cycle',
    },
    {
      id: generateDeterministicUUID('bill-td-lowrate'),
      name: 'TD Low Rate Visa Payment',
      type: 'credit_card',
      amount: 47.00,
      due_day: 27,
      frequency: 'monthly',
      linked_account_id: generateDeterministicUUID('TD-CreditCard-452034******1993'),
      autopay: false,
      next_due_date: '2026-10-27',
      is_paid: false,
      notes: 'Minimum / scheduled payment',
    },
    {
      id: generateDeterministicUUID('bill-uberone'),
      name: 'Uber One Subscription',
      type: 'subscription',
      amount: 5.64,
      due_day: 17,
      frequency: 'monthly',
      linked_account_id: cibcCCId,
      autopay: true,
      next_due_date: '2026-10-17',
      is_paid: false,
      notes: 'Delivery & ride discounts',
    },
    {
      id: generateDeterministicUUID('bill-hydro'),
      name: 'Hydro One Electricity',
      type: 'utility',
      amount: 85.00,
      due_day: 25,
      frequency: 'monthly',
      linked_account_id: cibcCheqId,
      autopay: true,
      next_due_date: '2026-10-25',
      is_paid: false,
      notes: 'Residential electric bill',
    },
  ];

  // 3. Defined Credit Reports (Equifax & TransUnion)
  const creditReports = [
    {
      id: generateDeterministicUUID('credit-report-equifax-202610'),
      bureau: 'Equifax',
      file_url: 'https://supabase.local/storage/v1/object/public/credit-reports/equifax_oct_2026.pdf',
      file_name: 'Equifax_Credit_Report_Oct_2026.pdf',
      score: 742,
      utilization_percent: 4.8,
      total_debt: 785.45,
      open_accounts: [
        { name: 'CIBC Dividend Visa', type: 'Credit Card', limit: 3500, balance: 37.88, status: 'Open / Paid as Agreed' },
        { name: 'TD Low Rate Visa', type: 'Credit Card', limit: 1000, balance: 709.86, status: 'Open / Paid as Agreed' },
        { name: 'Rogers Bank Mastercard', type: 'Credit Card', limit: 500, balance: 75.71, status: 'Open / Paid as Agreed' },
        { name: 'Amex Green Card', type: 'Credit Card', limit: 8500, balance: 0.00, status: 'Open / Paid as Agreed' },
        { name: 'Amex Essential Card', type: 'Credit Card', limit: 13500, balance: 0.00, status: 'Open / Paid as Agreed' },
        { name: 'Amex SimplyCash Card', type: 'Credit Card', limit: 1100, balance: 0.00, status: 'Open / Paid as Agreed' },
      ],
      closed_accounts: [
        { name: 'Student Line of Credit', closed_date: '2024-05-10', condition: 'Closed / Zero Balance' },
      ],
      inquiries: [
        { creditor: 'AMEX BANK OF CANADA', date: '2025-01-22', type: 'Credit Card Application' },
        { creditor: 'TORONTO DOMINION BANK', date: '2026-05-14', type: 'Credit Card Application' },
      ],
      derogatories: [],
      extracted_text: 'EQUIFAX CANADA CONSUMER CREDIT DISCLOSURE\nSubject: PATEL, HENISHKUMAR\nCredit Score: 742 (Good)\nTotal Debt: $785.45\nRevolving Utilization: 4.8%\nNo late payments or collections reported.',
      extracted_json: {
        score: 742,
        rating: 'Good',
        paymentHistoryPercentage: 100,
        averageAccountAgeMonths: 28,
      },
      uploaded_at: '2026-10-14T14:30:00Z',
    },
    {
      id: generateDeterministicUUID('credit-report-transunion-202609'),
      bureau: 'TransUnion',
      file_url: 'https://supabase.local/storage/v1/object/public/credit-reports/transunion_sep_2026.pdf',
      file_name: 'TransUnion_Consumer_Disclosure_Sep_2026.pdf',
      score: 751,
      utilization_percent: 5.1,
      total_debt: 812.30,
      open_accounts: [
        { name: 'CIBC Credit Card', type: 'Revolving', limit: 3500, balance: 42.00, status: 'Current' },
        { name: 'TD Bank Visa', type: 'Revolving', limit: 1000, balance: 710.00, status: 'Current' },
        { name: 'American Express', type: 'Revolving', limit: 8500, balance: 0.00, status: 'Current' },
      ],
      closed_accounts: [],
      inquiries: [
        { creditor: 'AMEX CANADA', date: '2025-01-22', type: 'Hard Inquiry' },
      ],
      derogatories: [],
      extracted_text: 'TRANSUNION CREDIT REPORT SUMMARY\nCredit Score: 751\nStatus: Very Good\nZero Delinquencies\nCredit Age: 2.5 Years',
      extracted_json: {
        score: 751,
        rating: 'Very Good',
        utilizationRatio: 0.051,
      },
      uploaded_at: '2026-09-20T10:15:00Z',
    },
  ];

  // 4. Defined AI Chat History Initial welcome & query demonstration
  const aiChatHistory = [
    {
      id: generateDeterministicUUID('ai-chat-1'),
      role: 'assistant',
      content: "Hello Henish! I am FinanceOS AI, your personal financial copilot. I have full real-time access to your 4,158 transactions across CIBC, TD, RBC, Rogers, and AMEX accounts in $CAD. You can ask me questions like 'How much did I spend on dining last month?', 'When is my CIBC Visa due?', or instruct me to add bills or update transactions directly!",
      function_calls: null,
      created_at: new Date().toISOString(),
    },
  ];

  // 5. Save all to seed_cache.json
  const completePayload = {
    accounts: accountDefinitions,
    transactions,
    bills,
    creditReports,
    aiChatHistory,
    stats: {
      totalAccounts: accountDefinitions.length,
      totalTransactions: transactions.length,
      postedTransactions: transactions.filter(t => t.status === 'posted').length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      totalBills: bills.length,
      totalCreditReports: creditReports.length,
      seededAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(CACHE_JSON, JSON.stringify(completePayload, null, 2), 'utf-8');
  console.log(`Successfully generated and cached seed data to: ${CACHE_JSON}`);
  console.log(`Total Accounts: ${accountDefinitions.length}`);
  console.log(`Total Transactions: ${transactions.length} (${completePayload.stats.postedTransactions} posted, ${completePayload.stats.pendingTransactions} pending)`);

  // 6. If Prisma DATABASE_URL is reachable, seed to Postgres
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('your-supabase')) {
    console.log('Connecting to Prisma Postgres to seed database...');
    try {
      const prisma = new PrismaClient();
      console.log('Upserting 13 Accounts...');
      for (const acc of accountDefinitions) {
        await prisma.account.upsert({
          where: { id: acc.id },
          update: { balance: acc.balance, credit_limit: acc.credit_limit },
          create: acc,
        });
      }
      console.log('Accounts seeded to Postgres.');

      console.log(`Seeding ${transactions.length} transactions in batches of 500...`);
      const chunkSize = 500;
      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize).map(t => ({
          id: t.id,
          account_id: t.account_id,
          date: t.date,
          description: t.description,
          merchant: t.merchant || '',
          category: t.category || 'Miscellaneous',
          amount: t.amount,
          debit: t.debit,
          credit: t.credit,
          running_balance: t.running_balance,
          status: t.status,
          cheque_number: t.cheque_number,
          foreign_spend_amount: t.foreign_spend_amount,
          commission: t.commission,
          exchange_rate: t.exchange_rate,
          additional_info: t.additional_info,
          address: t.address,
          city_province: t.city_province,
          country: t.country,
          reference_number: t.reference_number,
          source_file: t.source_file,
        }));
        await prisma.transaction.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        process.stdout.write(`Inserted transactions ${i + chunk.length}/${transactions.length}...\r`);
      }
      console.log(`\nSuccessfully seeded all ${transactions.length} transactions into Supabase Postgres!`);

      // Seed Bills
      for (const bill of bills) {
        await prisma.bill.upsert({
          where: { id: bill.id },
          update: { amount: bill.amount, next_due_date: bill.next_due_date },
          create: bill,
        });
      }
      console.log(`Seeded ${bills.length} bills.`);

      // Seed Credit Reports
      for (const cr of creditReports) {
        await prisma.creditReport.upsert({
          where: { id: cr.id },
          update: { score: cr.score, total_debt: cr.total_debt },
          create: cr,
        });
      }
      console.log(`Seeded ${creditReports.length} credit reports.`);

      await prisma.$disconnect();
    } catch (e: any) {
      console.log('Notice: Postgres connection skipped or failed, local seed cache will be used:', e.message);
    }
  } else {
    console.log('DATABASE_URL not set to live Postgres; local seed cache active for zero-dependency development.');
  }

  console.log('=== SEED COMPLETED SUCCESSFULLY ===');
}

if (require.main === module) {
  runSeed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
