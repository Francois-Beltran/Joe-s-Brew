import { useState, useEffect } from 'react'

// 📝 TO EDIT TERMS: paste your full terms & agreement text inside the <div> below
const TERMS_CONTENT = `
Terms and Conditions of Service
1. Acceptance of Terms By accessing the Joe’s Brew ordering platform and placing an order, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our platform.
2. Order Placement and Verification
•	Order Accuracy: Customers are responsible for ensuring that order details, including product selection, quantity, and delivery address, are accurate before submission. Joe’s Brew is not liable for orders placed in error.
•	Payment via GCash: Since we utilize a manual payment verification system, your order is considered pending until payment is confirmed by our team.
•	Proof of Payment: You must upload a clear, unaltered screenshot of the successful GCash transaction containing the Transaction Reference Number. Joe’s Brew reserves the right to reject any order if the reference number is illegible, missing, or cannot be verified against our records.
3. Cancellation and Refunds
•	Right to Refuse: Joe’s Brew reserves the right to cancel any order at any time, including orders that cannot be fulfilled due to stock shortages or inability to verify payment.
•	Modification: Once an order status is marked as "Preparing," no changes can be made.
•	Refund Policy: Refunds are only provided for verified payment errors or orders cancelled by Joe’s Brew. Due to the perishable nature of our products, refunds for "change of mind" or customer errors are not permitted.
4. Delivery Policy
•	Delivery Estimates: Stated delivery times are estimates. Joe’s Brew is not liable for delays caused by external factors such as traffic, weather conditions, or local road events.
•	Customer Accessibility: It is the customer's responsibility to be available at the provided delivery address. If the delivery rider is unable to contact the customer or locate the address after reasonable effort, the order may be marked as "undelivered" and no refund will be issued.
5. Limitation of Liability Joe’s Brew shall not be held liable for any indirect, incidental, or consequential damages resulting from the use of our platform or the consumption of our products. Our total liability for any claim related to an order shall not exceed the total price of the items purchased.
6. Data Privacy In accordance with the Data Privacy Act of 2012, personal information (name, address, phone number) provided through this platform is collected solely for order fulfillment and delivery. Your data will not be shared, sold, or used for purposes unrelated to your order.
7. Amendments Joe’s Brew reserves the right to update these Terms and Conditions at any time. Continued use of our platform constitutes acceptance of any updated terms.


`

export default function TermsGate({ children }) {
  const [accepted, setAccepted] = useState(false)
  const hostname = window.location.hostname
  const isStaffDomain = hostname.includes('admin') || hostname.includes('employee')
  if (isStaffDomain) return children
  const [checking, setChecking] = useState(true)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('joesbrew_terms_accepted')
    setAccepted(saved === 'true')
    setChecking(false)
  }, [])

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setScrolledToEnd(true)
    }
  }

  const handleAccept = () => {
    localStorage.setItem('joesbrew_terms_accepted', 'true')
    setAccepted(true)
  }

  if (checking) return null

  if (!accepted) {
    return (
      <div className="fixed inset-0 z-[100] bg-brew-dark/90 backdrop-blur-sm flex items-center justify-center px-4 py-8">
        <div className="bg-brew-light rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
          <div className="bg-brew-brown text-brew-beige p-6 rounded-t-3xl">
            <h2 className="font-heading text-2xl tracking-wider">TERMS & AGREEMENT</h2>
            <p className="font-body text-brew-beige/60 text-sm mt-1">
              Please read before continuing to Joe's Brew
            </p>
          </div>

          <div
            onScroll={handleScroll}
            className="p-6 overflow-y-auto flex-1 font-body text-sm text-brew-brown/80 whitespace-pre-line leading-relaxed"
          >
            {TERMS_CONTENT}
          </div>

          <div className="p-6 border-t border-brew-brown/10">
            {!scrolledToEnd && (
              <p className="font-body text-xs text-amber-600 mb-3 text-center">
                ↓ Please scroll to the bottom to continue
              </p>
            )}
            <button
              onClick={handleAccept}
              disabled={!scrolledToEnd}
              className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              I HAVE READ AND AGREE
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}