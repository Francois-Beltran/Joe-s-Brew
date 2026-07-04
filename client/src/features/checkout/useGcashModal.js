import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function useGCashModal({ onSuccess, setStage }) {
  const [formState, setFormState] = useState({
    customerName: '',
    customerPhone: '',
    orderType: 'pickup',
    sitio: '',
    landmark: '',
    refNumber: '',
    screenshot: null,
    preview: null,
    agreedToTerms: false,
  })

  const [deliveryZones, setDeliveryZones] = useState([])
  const [selectedFee, setSelectedFee] = useState(0)
  const [deliveryCoords, setDeliveryCoords] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch delivery zones
  useEffect(() => {
    async function fetchZones() {
      const { data } = await supabase
        .from('delivery_zones')
        .select('sitio_name, fee')
        .eq('is_active', true)
        .order('sitio_name')
      setDeliveryZones(data ?? [])
    }
    fetchZones()
  }, [])

  // Fee calculation
  useEffect(() => {
    const zone = deliveryZones.find(z => z.sitio_name === formState.sitio)
    if (!zone) {
      setSelectedFee(0)
      return
    }

    if (displayTotal >= 1000) {
      setSelectedFee(0)
    } else if (formState.sitio === 'Cogtong') {
      setSelectedFee(0)
    } else {
      setSelectedFee(Number(zone.fee))
    }
  }, [formState.sitio, deliveryZones])

  const displayTotal = 0 // You need to pass cart or calculate here

  const grandTotal = displayTotal + (formState.orderType === 'delivery' ? Number(selectedFee || 0) : 0)

  const handleSubmit = async () => {
    if (loading) return
    setError('')
    setLoading(true)

    try {
      let screenshotUrl = null

      // 1. Upload payment screenshot to Supabase Storage Bucket
      if (formState.screenshot) {
        const fileExt = formState.screenshot.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `gcash-proofs/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('gcash-screenshots')
          .upload(filePath, formState.screenshot)

        if (uploadError) throw new Error(`Screenshot upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('gcash-screenshots')
          .getPublicUrl(filePath)
          
        screenshotUrl = urlData?.publicUrl
      }

      // 2. Combine delivery data into your table's unified delivery_address column
      const compiledAddress = formState.orderType === 'delivery' 
        ? `Sitio ${formState.sitio || ''}, Landmark: ${formState.landmark || ''}`.trim()
        : null;

      // 3. Insert Order Payload aligned to your EXACT schema columns
      const orderPayload = {
        customer_name: formState.customerName,
        customer_phone: formState.customerPhone,
        order_type: formState.orderType,
        delivery_address: compiledAddress, // Maps to your delivery_address column
        status: 'pending',
        total_amount: grandTotal,
        delivery_fee: formState.orderType === 'delivery' ? selectedFee : 0,
        gcash_ref: formState.refNumber, // Maps to your gcash_ref column
        gcash_screenshot_url: screenshotUrl, // Maps to your gcash_screenshot_url column
        gcash_verified: false, // Default value matching your table type
        created_at: new Date().toISOString()
      }

      const { data, error: dbError } = await supabase
        .from('orders') // Your verified table name
        .insert([orderPayload])
        .select()
        .single()

      if (dbError) throw dbError

      // 3. Success -> Transition screen stage
      setFormState(prev => ({ ...prev, result: data }))
      setStage('done')
      
    } catch (err) {
      console.error("Submission Error:", err)
      setError(err.message || 'Something went wrong while processing your order.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReceipt = () => {
    console.log('Download receipt')
  }

  return {
    formState,
    setFormState,
    grandTotal,
    error,
    loading,
    handleSubmit,
    downloadReceipt,
    selectedFee,
  }
}