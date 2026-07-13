import { useState, useEffect } from 'react'

// 📝 TO EDIT TERMS: paste your full terms & agreement text inside the <div> below
const TERMS_CONTENT = `
Terms and Conditions of Service
1. Acceptance of Terms
By accessing the Joe's Brew online ordering platform and placing an order, you acknowledge that you have read, understood, and agreed to these Terms and Conditions. If you do not agree with any part of these Terms, please refrain from using the platform.
2. Order Placement and Payment Verification
Order Accuracy
Customers are responsible for reviewing all order details before submitting an order, including selected items, quantities, branch, delivery address, and contact information. Joe's Brew shall not be responsible for delays, failed deliveries, or incorrect orders resulting from inaccurate information provided by the customer.
Branch Selection
Joe's Brew operates multiple branches. Customers are solely responsible for selecting the correct branch before placing an order. Please ensure that the selected branch is correct, as it determines where your order will be prepared and fulfilled. Joe's Brew shall not be held responsible for orders placed under the wrong branch due to customer error. Once an order has been confirmed or has entered the Preparing status, it cannot be transferred, modified, or refunded.
Payment Verification
Orders paid via GCash are subject to manual verification. An order will remain Pending Payment Verification until payment has been successfully verified by our staff.
Proof of Payment
Customers must upload a clear and unedited screenshot of their successful GCash transaction, including the Transaction Reference Number. Joe's Brew reserves the right to reject or cancel any order if the submitted proof of payment is incomplete, altered, illegible, or cannot be verified.
3. Order Cancellation, Modification, and Refunds
Right to Cancel
Joe's Brew reserves the right to refuse or cancel any order for reasons including, but not limited to:
Failure to verify payment
Product unavailability
Suspected fraudulent transactions
Incorrect or incomplete customer information
Operational limitations beyond our control
Order Modifications
Orders may only be modified or cancelled before they enter the Preparing status. Once preparation has begun, no changes or cancellations can be accommodated.
Refund Policy
Refunds will only be issued for verified payment errors or orders cancelled by Joe's Brew. Due to the perishable nature of our products, refunds or exchanges will not be granted for:
Change of mind
Incorrect orders placed by the customer
Wrong branch selection
Incorrect delivery information
Failure to receive the order due to customer unavailability
4. Delivery and Pickup Policy
Delivery Time
Estimated delivery times are provided for reference only and may vary depending on traffic conditions, weather, rider availability, or other unforeseen circumstances.
Customer Availability
Customers are responsible for ensuring that someone is available to receive the order at the specified delivery address. If the delivery rider is unable to contact the customer or complete the delivery after reasonable attempts, the order may be considered undeliverable and no refund shall be issued.
Pickup Orders
Customers are encouraged to claim their orders within their selected pickup time. Joe's Brew shall not be responsible for any decline in product quality resulting from delayed pickup.
5. Product Availability and Pricing
All prices are displayed in Philippine Pesos (PHP) and are subject to change without prior notice.
All menu items are subject to availability. If a product becomes unavailable after an order has been placed, Joe's Brew reserves the right to substitute, modify, or cancel the affected item after notifying the customer whenever possible.
6. Food Allergy Notice
Our products may contain or come into contact with common allergens, including but not limited to milk, eggs, soy, wheat, peanuts, tree nuts, and gluten. Customers with food allergies or dietary restrictions are encouraged to contact Joe's Brew before placing an order.
7. Customer Conduct
Joe's Brew reserves the right to refuse service or cancel orders from customers who engage in abusive, threatening, fraudulent, or inappropriate behavior toward our staff, delivery personnel, or representatives.
8. Promotions and Discounts
Promotional offers, discounts, vouchers, and coupon codes are subject to their respective terms and conditions and may not be combined unless otherwise stated. Joe's Brew reserves the right to modify or discontinue promotions at any time without prior notice.
9. Limitation of Liability
To the fullest extent permitted by applicable law, Joe's Brew shall not be liable for any indirect, incidental, consequential, or special damages arising from the use of this platform or the purchase or consumption of our products.
Joe's Brew's total liability arising from any claim relating to an order shall not exceed the total amount paid by the customer for that specific order.
10. Data Privacy
In accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), personal information collected through this platform—including names, addresses, contact numbers, and other information necessary for order fulfillment—shall be used solely for processing orders, verifying payments, arranging deliveries, providing customer support, and other legitimate business purposes related to your transaction.
Joe's Brew will not sell, rent, or disclose your personal information to third parties except when required by law or when necessary to complete your order.
11. Intellectual Property
All website content, including but not limited to logos, branding, graphics, images, text, menus, and designs, are the exclusive property of Joe's Brew unless otherwise stated. Unauthorized reproduction, distribution, modification, or commercial use of any content is strictly prohibited.
12. Force Majeure
Joe's Brew shall not be held responsible for delays, interruptions, or failure to fulfill orders caused by events beyond its reasonable control, including but not limited to natural disasters, severe weather, power outages, internet disruptions, government restrictions, labor disputes, transportation issues, or other unforeseen circumstances.
13. Amendments
Joe's Brew reserves the right to modify or update these Terms and Conditions at any time without prior notice. Any revisions shall become effective immediately upon publication on the platform. Continued use of the platform after such changes constitutes acceptance of the updated Terms and Conditions.
14. Governing Law
These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from the use of this platform shall be subject to the exclusive jurisdiction of the appropriate courts in the Philippines.
15. Business Hours
Joe's Brew accepts and processes orders during our official business hours, 8:30 AM to 6:30 PM, unless otherwise announced.
Orders placed outside these business hours may still be received by the platform but will not be processed until the next business day.
Joe's Brew reserves the right to suspend or delay the acceptance and processing of orders outside operating hours, even if the online ordering platform remains accessible due to administrative oversight or technical issues.
Note: The online ordering platform may occasionally remain available outside business hours. This does not guarantee that orders placed during such times will be accepted or prepared immediately.
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