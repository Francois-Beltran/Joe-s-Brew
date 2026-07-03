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
    // Add your full submit logic here later
    console.log('Submit clicked')
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