import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicReceipt } from '@/lib/services/receipt.service';
import ReceiptActions from '@/components/receipt/ReceiptActions';

interface PageProps {
  params: Promise<{ receiptNo: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { receiptNo } = await params;
  return {
    title: `Payment Receipt #${receiptNo} | Campus`,
    description: `Official fee payment receipt #${receiptNo} verified on Campus LMS.`,
    robots: {
      index: false, // Keep individual receipts unindexed from search engines for student privacy
      follow: false,
    },
  };
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  if (crore > 0) words += convertChunk(crore) + ' Crore ';
  if (lakh > 0) words += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
  if (remaining > 0) words += convertChunk(remaining) + ' ';

  return (words.trim() + ' Rupees Only');
}

export default async function PublicReceiptPage({ params }: PageProps) {
  const { receiptNo } = await params;
  const receipt = await getPublicReceipt(receiptNo);

  if (!receipt) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Receipt Not Found</h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            We could not locate any fee payment receipt with reference{' '}
            <span className="font-mono font-semibold text-gray-800">#{receiptNo}</span>.
            Please verify the link received on WhatsApp or contact your institute administrator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-sm"
          >
            Go to Campus Home
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = receipt.paidOn
    ? new Date(receipt.paidOn).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Confirmed';

  const amountWords = numberToWords(Number(receipt.amount) || 0);

  return (
    <div className="receipt-container min-h-screen bg-gray-100/70 py-8 px-4 sm:px-6">
      <ReceiptActions receiptNo={receipt.receiptNo} />

      {/* Main Printable Receipt Card */}
      <div className="receipt-card max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative print:border-none print:shadow-none">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-emerald-200 uppercase bg-emerald-950/40 px-2.5 py-1 rounded-md inline-block mb-2">
              Official Payment Receipt
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {receipt.instituteName}
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1">
              {receipt.instituteCity ? `${receipt.instituteCity} • ` : ''}
              {receipt.institutePhone ? `Ph: ${receipt.institutePhone}` : 'Campus LMS Verified'}
            </p>
          </div>

          <div className="text-left sm:text-right flex flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              PAID
            </span>
            <span className="text-xs text-emerald-100/80 font-mono mt-2">
              {receipt.receiptNo}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Two-Column Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Student Information</p>
              <p className="text-base font-bold text-gray-900">{receipt.studentName}</p>
              {receipt.rollNo && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Roll / Reg No: <span className="font-semibold text-gray-800">{receipt.rollNo}</span>
                </p>
              )}
              {receipt.batchName && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Batch: <span className="font-medium text-gray-800">{receipt.batchName}</span>
                </p>
              )}
              {receipt.phone && (
                <p className="text-xs text-gray-500 mt-0.5">Contact: {receipt.phone}</p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Transaction Details</p>
              <p className="text-xs text-gray-600">
                Payment Date:{' '}
                <span className="font-semibold text-gray-900">{formattedDate}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Payment Mode:{' '}
                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-semibold text-[11px] uppercase">
                  {receipt.method}
                </span>
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                Status: Successfully Confirmed
              </p>
            </div>
          </div>

          {/* Particulars Table */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-2.5 font-bold">#</th>
                  <th className="py-2.5 font-bold">Particulars / Description</th>
                  <th className="py-2.5 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                <tr>
                  <td className="py-3 text-gray-400 font-mono text-xs">01</td>
                  <td className="py-3 font-semibold text-gray-800">
                    {receipt.feeTitle}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-gray-900">
                    ₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-900">
                  <td colSpan={2} className="py-3 text-base font-bold text-gray-900">
                    Total Amount Paid
                  </td>
                  <td className="py-3 text-right text-lg font-mono font-bold text-emerald-700">
                    ₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Words */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <p className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Amount in Words</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5 italic">
              {amountWords}
            </p>
          </div>

          {/* Verification & Stamp Footer */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border-2 border-emerald-600/60 flex items-center justify-center text-emerald-700 font-bold text-[9px] uppercase tracking-tighter text-center leading-none p-1 bg-emerald-50/50">
                CAMPUS<br/>VERIFIED
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-800">
                  Digitally Verified Receipt
                </p>
                <p className="text-[10px] text-gray-500">
                  Issued on behalf of {receipt.instituteName}
                </p>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <p className="text-[10px] text-gray-400 leading-tight">
                This is a computer-generated official document.<br />
                No physical signature is required.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Branding Note (Hidden on Print) */}
      <div className="no-print text-center text-xs text-gray-400 mt-8">
        Powered by{' '}
        <Link href="/" className="font-semibold text-gray-600 hover:text-emerald-700 transition-colors">
          Campus LMS
        </Link>{' '}
        — Intelligent Coaching Management
      </div>
    </div>
  );
}
